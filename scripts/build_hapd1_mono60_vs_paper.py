#!/usr/bin/env python3
"""Selecciona Top-1 (mejor overall_score) por cada uno de los 10 runs del panel
HA-PD1 mono-60, copia PDBs y genera src/data/hapd1Mono60VsPaper.json para la
slide de comparación vs AiDs SPR.

Matching diseño→PDB: secuencia binder (cadena A) exacta en seq_*_pred_0_chainAB.pdb.
scores.csv: formato EvoPro `binder,target,overall | ,overall,pLDDT_AB,...`.
"""
from __future__ import annotations

import csv
import json
import re
import statistics
from pathlib import Path

from Bio.SeqUtils.ProtParam import ProteinAnalysis

from pdb_metrics import compute_metrics

EVOPRO = Path("/home/david/Documents/Dev/Tesis/EvoPro_Mod/evopro")
RUN_ROOT = EVOPRO / "run" / "outputs_hapd1_mono_60"
VAL = EVOPRO / "validation" / "standard"
MANIFEST = VAL / "manifests" / "paper_hapd1_control_manifest.csv"
METRICS = VAL / "processed" / "paper_hapd1_af2_metrics.csv"
OVERALL = VAL / "processed" / "paper_hapd1_evopro_overall_scores.csv"
AF2_DIR = VAL / "raw" / "af2_paper_hapd1" / "complex_predictions"

PRES = Path("/home/david/Documents/Dev/Tesis/moeaud-presentation")
PUB = PRES / "public" / "pdbs" / "hapd1"
DATA_OUT = PRES / "src" / "data" / "hapd1Mono60VsPaper.json"

ITERATION = 60
DEGENERATE_AL_FRAC = 0.80
# QC estructural vs controles paper (scrambled ipTM≈0.10; AiDs pLDDT≈80):
# excluye mal plegamiento del binder o interfaz AF2 débil con el target.
MIN_PLDDT_A = 75.0
MIN_IPTM = 0.10
MAX_PAE_IFACE = 25.0
ARMS = ("base", "temp", "mutation")
# Prefijo visible del ID de solución (base → both).
ARM_ID_PREFIX = {"base": "both", "temp": "temp", "mutation": "mutation"}

AA3 = {
    "ALA": "A",
    "ARG": "R",
    "ASN": "N",
    "ASP": "D",
    "CYS": "C",
    "GLN": "Q",
    "GLU": "E",
    "GLY": "G",
    "HIS": "H",
    "ILE": "I",
    "LEU": "L",
    "LYS": "K",
    "MET": "M",
    "PHE": "F",
    "PRO": "P",
    "SER": "S",
    "THR": "T",
    "TRP": "W",
    "TYR": "Y",
    "VAL": "V",
}


STANDARD_AA = set("ACDEFGHIKLMNPQRSTVWY")


def peptide_props(seq: str) -> dict[str, float | None]:
    """Propiedades fisicoquímicas del binder (ProtParam / BioPython)."""
    clean = (seq or "").strip().upper()
    if not clean or any(ch not in STANDARD_AA for ch in clean):
        return {
            "charge": None,
            "pi": None,
            "gravy": None,
            "mw_kda": None,
            "aromaticity": None,
            "instability": None,
        }
    pa = ProteinAnalysis(clean)
    return {
        "charge": round(pa.charge_at_pH(7.0), 1),
        "pi": round(pa.isoelectric_point(), 2),
        "gravy": round(pa.gravy(), 3),
        "mw_kda": round(pa.molecular_weight() / 1000.0, 2),
        "aromaticity": round(pa.aromaticity(), 3),
        "instability": round(pa.instability_index(), 1),
    }


def _safe_float(raw: str | None) -> float | None:
    if raw is None:
        return None
    s = str(raw).strip()
    if not s or s.lower() in {"none", "nan", "null"}:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def seq_from_pdb(pdb_path: Path, chain: str = "A") -> str:
    seq: list[str] = []
    last: str | None = None
    for line in pdb_path.read_text().splitlines():
        if not line.startswith("ATOM"):
            continue
        if len(line) < 26 or line[21] != chain:
            continue
        resseq = line[22:26]
        if resseq == last:
            continue
        last = resseq
        seq.append(AA3.get(line[17:20].strip(), "X"))
    return "".join(seq)


def sanitize_pdb(text: str) -> str:
    """Drop MODEL/ENDMDL wrappers; keep ATOM/HETATM/TER/END for 3Dmol."""
    lines: list[str] = []
    for line in text.splitlines():
        if line.startswith(("MODEL", "ENDMDL")):
            continue
        lines.append(line)
    if not any(line.strip() == "END" for line in lines[-3:]):
        lines.append("END")
    return "\n".join(lines) + "\n"


def copy_sanitized_pdb(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(sanitize_pdb(src.read_text()))


def parse_iteration(scores_path: Path, iteration: int) -> list[dict]:
    """Parse one iteration block; metrics come from the post-` | ` field list."""
    text = scores_path.read_text()
    parts = re.split(r"(?=^Iteration\s+\d+)", text, flags=re.M)
    for part in parts:
        m = re.match(r"^Iteration\s+(\d+)\t,,([^\n]*)\n", part)
        if not m or int(m.group(1)) != iteration:
            continue
        # Header line is: Iteration N\t,,overall_score,pLDDT_...
        header = m.group(2).split(",")
        rows: list[dict] = []
        for line in part[m.end() :].splitlines():
            line = line.strip()
            if not line or line.startswith("Iteration"):
                break
            if " | " not in line:
                continue
            pre, post = line.split(" | ", 1)
            pre_cols = pre.split(",")
            if len(pre_cols) < 3:
                continue
            binder = pre_cols[0].strip()
            target = pre_cols[1].strip()
            if not re.fullmatch(r"[A-Z]+", binder):
                continue
            overall_pre = _safe_float(pre_cols[2].strip())
            vals = [_safe_float(x) for x in post.lstrip(",").split(",")]
            data = dict(zip(header, vals))
            overall = data.get("overall_score", overall_pre)
            if overall is None:
                overall = overall_pre
            if overall is None:
                continue
            plddt_a = data.get("pLDDT_chainA")
            iptm = data.get("ipTM")
            if iptm is None:
                iptm = data.get("iptm")
            pae = data.get("f1_pae_interface")
            contact = data.get("ContactScore")
            rows.append(
                {
                    "binder": binder,
                    "target": target,
                    "overall_score": float(overall),
                    "plddt_a": float(plddt_a) if plddt_a is not None else None,
                    "iptm": float(iptm) if iptm is not None else None,
                    "pae_iface": float(pae) if pae is not None else None,
                    "contact": float(contact) if contact is not None else None,
                }
            )
        return rows
    return []


def al_fraction(seq: str) -> float:
    if not seq:
        return 0.0
    return (seq.count("A") + seq.count("L")) / len(seq)


def is_degenerate(seq: str) -> bool:
    return al_fraction(seq) > DEGENERATE_AL_FRAC


def sliding_window_identity(query: str, reference: str) -> float:
    """Max identity of the shorter sequence over sliding windows of the longer."""
    if not query or not reference:
        return 0.0
    if len(query) > len(reference):
        query, reference = reference, query
    L = len(query)
    if L == 0:
        return 0.0
    best = 0.0
    for i in range(len(reference) - L + 1):
        window = reference[i : i + L]
        matches = sum(a == b for a, b in zip(query, window))
        best = max(best, matches / L)
    return best


def build_pdb_map(outputs_dir: Path) -> dict[str, Path]:
    mapping: dict[str, Path] = {}
    for pdb in outputs_dir.glob("seq_*_pred_0_chainAB.pdb"):
        seq = seq_from_pdb(pdb, "A")
        if seq and seq not in mapping:
            mapping[seq] = pdb
    return mapping


def passes_structure_qc(row: dict) -> bool:
    """Binder plegado + interfaz AF2 no peor que controles scrambled del paper."""
    plddt = row.get("plddt_a")
    iptm = row.get("iptm")
    pae = row.get("pae_iface")
    if plddt is None or iptm is None or pae is None:
        return False
    return plddt >= MIN_PLDDT_A and iptm >= MIN_IPTM and pae <= MAX_PAE_IFACE


def select_designs(pool: list[dict]) -> list[dict]:
    """Top-1 by overall_score (asc) per run; QC-passing + no degeneradas."""
    eligible = [
        r
        for r in pool
        if not is_degenerate(r["binder"]) and passes_structure_qc(r)
    ]
    if not eligible:
        return []

    best = min(eligible, key=lambda r: r["overall_score"])
    return [
        {
            "binder_seq": best["binder"],
            "overall_score": best["overall_score"],
            "plddt_a": best["plddt_a"],
            "iptm": best["iptm"],
            "pae_iface": best["pae_iface"],
            "contact": best.get("contact"),
            "criteria": ["by_score"],
            "rank_by_score": 1,
            "rank_by_interface": None,
            "degenerate": False,
            "al_fraction": round(al_fraction(best["binder"]), 4),
        }
    ]


def load_paper_aids() -> list[dict]:
    kd_by_aid: dict[int, float] = {}
    seq_by_aid: dict[int, str] = {}
    with MANIFEST.open(newline="") as fh:
        for row in csv.DictReader(fh):
            if row.get("control_type") != "paper_validated_aid":
                continue
            aid = int(row["aid_id"])
            kd_by_aid[aid] = float(row["kd_nM"])
            seq_by_aid[aid] = row["sequence"].strip()

    overall_by_aid: dict[int, dict] = {}
    if OVERALL.is_file():
        with OVERALL.open(newline="") as fh:
            for row in csv.DictReader(fh):
                aid = int(row["aid_id"])
                overall_by_aid[aid] = {
                    "overall_score": _safe_float(row["overall_score"]),
                    "plddt_chain_a": _safe_float(row.get("pLDDT_chainA")),
                    "contact": _safe_float(row.get("ContactScore")),
                    "confdiff": _safe_float(row.get("ConfDiffScore")),
                    "bonus": _safe_float(row.get("BonusScore")),
                    "penalty": _safe_float(row.get("PenaltyScore")),
                }

    aids: list[dict] = []
    with METRICS.open(newline="") as fh:
        for row in csv.DictReader(fh):
            if row.get("control_type") != "paper_validated_aid":
                continue
            aid = int(row["aid_id"])
            src = Path(row["af2_complex_pdb"])
            if not src.is_file():
                # Fall back to AF2_DIR by stem.
                matches = sorted(AF2_DIR.glob(f"paper_aid{aid}__*_unrelaxed_rank_001_*.pdb"))
                if not matches:
                    raise FileNotFoundError(f"Missing AF2 PDB for AiD {aid}")
                src = matches[0]
            dest_name = f"paper_aid{aid}.pdb"
            dest = PUB / "aids" / dest_name
            copy_sanitized_pdb(src, dest)
            entry = {
                "aid_id": aid,
                "kd_nM": kd_by_aid[aid],
                "binder_seq": seq_by_aid[aid],
                "plddt": _safe_float(row["complex_binder_plddt"]),
                "iptm": _safe_float(row["complex_iptm"]),
                "pae": _safe_float(row["complex_interface_pae"]),
                "complex_plddt": _safe_float(row["complex_mean_plddt"]),
                "overall_score": None,
                "plddt_chain_a": None,
                "pdb": f"/pdbs/hapd1/aids/{dest_name}",
                **peptide_props(seq_by_aid[aid]),
            }
            if aid in overall_by_aid:
                entry.update(overall_by_aid[aid])
            struct = compute_metrics(
                dest, seq_by_aid[aid], binder_chain="A", target_chain="B"
            )
            entry["rg"] = struct["rg"]
            entry["if_contacts"] = struct["if_contacts"]
            entry["bsa"] = struct["bsa"]
            aids.append(entry)
    aids.sort(key=lambda a: a["aid_id"])
    return aids


def nearest_aid(binder: str, aids: list[dict]) -> tuple[dict, float]:
    best = aids[0]
    best_id = sliding_window_identity(binder, best["binder_seq"])
    for aid in aids[1:]:
        ident = sliding_window_identity(binder, aid["binder_seq"])
        if ident > best_id:
            best = aid
            best_id = ident
    return best, best_id


def median(vals: list[float | None]) -> float | None:
    clean = [v for v in vals if v is not None]
    if not clean:
        return None
    return float(statistics.median(clean))


def main() -> None:
    PUB.mkdir(parents=True, exist_ok=True)
    designs_dir = PUB / "mono"
    # No rmtree: borrar el dir mientras Vite corre hace que sirva index.html
    # en /pdbs/hapd1/mono/*.pdb hasta reiniciar el server.
    designs_dir.mkdir(parents=True, exist_ok=True)
    for old in designs_dir.glob("*.pdb"):
        old.unlink()
    legacy = PUB / "designs"
    if legacy.is_dir():
        for old in legacy.glob("*.pdb"):
            old.unlink()
    (PUB / "aids").mkdir(parents=True, exist_ok=True)

    aids = load_paper_aids()
    paper_medians = {
        "plddt": median([a["plddt"] for a in aids]),
        "iptm": median([a["iptm"] for a in aids]),
        "pae": median([a["pae"] for a in aids]),
        "kd_nM": median([a["kd_nM"] for a in aids]),
        "n": len(aids),
        "note": "Medianas AF2 de AiDs SPR (Goudy 2023) sobre HA-PD1; KD solo experimental.",
    }

    designs: list[dict] = []
    table_rows: list[str] = []
    arm_buckets: dict[str, list[dict]] = {arm: [] for arm in ARMS}
    pending_by_arm: dict[str, list[dict]] = {arm: [] for arm in ARMS}

    for arm in ARMS:
        for rep in range(1, 11):
            source_run = f"{arm}_{rep:02d}"
            run_dir = RUN_ROOT / source_run
            scores = run_dir / "outputs" / "scores.csv"
            if not scores.is_file():
                raise FileNotFoundError(scores)
            pool = parse_iteration(scores, ITERATION)
            if len(pool) != 50:
                print(
                    f"WARN {source_run}: pool iter {ITERATION} "
                    f"size={len(pool)} (expected 50)"
                )
            pdb_map = build_pdb_map(run_dir / "outputs")
            selected = select_designs(pool)

            for item in selected:
                seq = item["binder_seq"]
                src = pdb_map.get(seq)
                primary = (
                    "by_score"
                    if "by_score" in item["criteria"]
                    else "by_interface"
                )
                rank = (
                    item["rank_by_score"]
                    if primary == "by_score"
                    else item["rank_by_interface"]
                )
                pending_by_arm[arm].append(
                    {
                        "source_run": source_run,
                        "arm": arm,
                        "rank": rank,
                        "criterion": primary,
                        "criteria": item["criteria"],
                        "rank_by_score": item["rank_by_score"],
                        "rank_by_interface": item["rank_by_interface"],
                        "binder_seq": seq,
                        "overall_score": item["overall_score"],
                        "plddt_a": item["plddt_a"],
                        "iptm": item["iptm"],
                        "pae_iface": item["pae_iface"],
                        "contact": item.get("contact"),
                        "degenerate": item["degenerate"],
                        "al_fraction": item["al_fraction"],
                        "_pdb_src": src,
                    }
                )

    # Assign unique IDs per arm: base_01, base_02, ... (not tied to replica).
    for arm in ARMS:
        pending = sorted(
            pending_by_arm[arm],
            key=lambda d: (
                d["source_run"],
                0 if "by_score" in d["criteria"] else 1,
                d["rank_by_score"] if d["rank_by_score"] is not None else 99,
                d["rank_by_interface"] if d["rank_by_interface"] is not None else 99,
                d["overall_score"],
            ),
        )
        for idx, item in enumerate(pending, 1):
            sol_id = f"{ARM_ID_PREFIX[arm]}_{idx:02d}"
            src = item.pop("_pdb_src")
            pdb_url = None
            pdb_resolved = False
            if src is not None:
                dest = PUB / "mono" / f"{sol_id}.pdb"
                copy_sanitized_pdb(src, dest)
                pdb_url = f"/pdbs/hapd1/mono/{sol_id}.pdb"
                pdb_resolved = True

            near, ident = nearest_aid(item["binder_seq"], aids)
            best_iptm_aid = max(
                aids, key=lambda a: a["iptm"] if a["iptm"] is not None else -1.0
            )

            entry = {
                "id": sol_id,
                "label": sol_id,
                "run": sol_id,
                "source_run": item["source_run"],
                "arm": arm,
                "arm_label": ARM_ID_PREFIX[arm],
                "sol_index": idx,
                "rank": item["rank"],
                "criterion": item["criterion"],
                "criteria": item["criteria"],
                "rank_by_score": item["rank_by_score"],
                "rank_by_interface": item["rank_by_interface"],
                "binder_seq": item["binder_seq"],
                "overall_score": round(item["overall_score"], 4),
                "plddt_a": round(item["plddt_a"], 3)
                if item["plddt_a"] is not None
                else None,
                "iptm": round(item["iptm"], 4) if item["iptm"] is not None else None,
                "pae_iface": round(item["pae_iface"], 3)
                if item["pae_iface"] is not None
                else None,
                "contact": round(item["contact"], 3)
                if item.get("contact") is not None
                else None,
                "degenerate": item["degenerate"],
                "al_fraction": item["al_fraction"],
                "pdb": pdb_url,
                "pdb_resolved": pdb_resolved,
                "pdb_source": src.name if src else None,
                "nearest_aid_id": near["aid_id"],
                "seq_identity_to_nearest_aid": round(ident, 4),
                "delta_vs_nearest_aid": {
                    "plddt": round(item["plddt_a"] - near["plddt"], 3)
                    if item["plddt_a"] is not None and near["plddt"] is not None
                    else None,
                    "iptm": round(item["iptm"] - near["iptm"], 4)
                    if item["iptm"] is not None and near["iptm"] is not None
                    else None,
                    "pae": round(item["pae_iface"] - near["pae"], 3)
                    if item["pae_iface"] is not None and near["pae"] is not None
                    else None,
                },
                "best_iptm_aid_id": best_iptm_aid["aid_id"],
                **peptide_props(item["binder_seq"]),
            }
            if pdb_resolved:
                dest_path = PUB / "mono" / f"{sol_id}.pdb"
                struct = compute_metrics(
                    dest_path, item["binder_seq"], binder_chain="A", target_chain="B"
                )
                entry["rg"] = struct["rg"]
                entry["if_contacts"] = struct["if_contacts"]
                entry["bsa"] = struct["bsa"]
            else:
                entry["rg"] = None
                entry["if_contacts"] = None
                entry["bsa"] = None
            designs.append(entry)
            arm_buckets[arm].append(entry)
            table_rows.append(
                f"| {sol_id} | {item['source_run']} | {item['criterion']} | "
                f"{item['rank']} | "
                f"{entry['overall_score']:.2f} | "
                f"{entry['iptm'] if entry['iptm'] is not None else '—'} | "
                f"{entry['pae_iface'] if entry['pae_iface'] is not None else '—'} | "
                f"{'yes' if pdb_resolved else 'NO'} |"
            )

    arm_summaries = {}
    for arm, items in arm_buckets.items():
        # Prefer by_score designs for arm summary medians.
        score_items = [d for d in items if "by_score" in d["criteria"]]
        use = score_items or items
        arm_summaries[arm] = {
            "n_designs": len(items),
            "n_by_score": len(score_items),
            "n_pdb_resolved": sum(1 for d in items if d["pdb_resolved"]),
            "n_degenerate": sum(1 for d in items if d["degenerate"]),
            "median_overall_score": median([d["overall_score"] for d in use]),
            "median_plddt_a": median([d["plddt_a"] for d in use]),
            "median_iptm": median([d["iptm"] for d in use]),
            "median_pae_iface": median([d["pae_iface"] for d in use]),
            "vs_paper_medians": {
                "delta_plddt": round(
                    (median([d["plddt_a"] for d in use]) or 0)
                    - (paper_medians["plddt"] or 0),
                    3,
                )
                if median([d["plddt_a"] for d in use]) is not None
                and paper_medians["plddt"] is not None
                else None,
                "delta_iptm": round(
                    (median([d["iptm"] for d in use]) or 0)
                    - (paper_medians["iptm"] or 0),
                    4,
                )
                if median([d["iptm"] for d in use]) is not None
                and paper_medians["iptm"] is not None
                else None,
                "delta_pae": round(
                    (median([d["pae_iface"] for d in use]) or 0)
                    - (paper_medians["pae"] or 0),
                    3,
                )
                if median([d["pae_iface"] for d in use]) is not None
                and paper_medians["pae"] is not None
                else None,
            },
        }

    payload = {
        "meta": {
            "target": "HA-PD1",
            "target_length": 119,
            "iteration": ITERATION,
            "pool_size": 50,
            "selection": (
                "Top-1 by overall_score (asc) per run (10 runs per arm). "
                "Excludes A+L-degenerate sequences and weak AF2 fold/interface."
            ),
            "peptide_props": (
                "BioPython ProtParam on binder sequence: gravy, charge_at_pH(7), "
                "isoelectric_point, aromaticity, instability_index, molecular_weight."
            ),
            "degenerate_rule": f"Excluded if A+L fraction > {DEGENERATE_AL_FRAC:.0%}",
            "structure_qc": {
                "min_plddt_a": MIN_PLDDT_A,
                "min_iptm": MIN_IPTM,
                "max_pae_iface": MAX_PAE_IFACE,
                "note": (
                    "pLDDT filters poor binder folding; ipTM/PAE filter weak "
                    "target contact (ipTM floor ≈ scrambled controls in paper)."
                ),
            },
            "n_replicas_per_arm": 10,
            "replica_range": "01–10",
            "caveats": [
                "overall_score is a computational EvoPro objective, not KD.",
                "High pLDDT alone does not imply better binding.",
                "KD (nM) exists only for paper AiDs (SPR); designs have no experimental KD.",
                "Comparison is AF2 under the same HA-PD1 target/protocol.",
                "Confirmatory ranking for the thesis is Flujo Goudy (Rosetta dG/dSASA → OmegaFold); this slide is AF2 vs AiDs only.",
            ],
            "arm_af2_ranking_note": {
                "base": "best median best-ipTM across runs (~0.194); max 0.313 (base_08)",
                "temp": "best absolute AF2 hit (~0.495 temp_07); median ~0.182",
                "mutation": "intermediate (median ~0.183; max 0.343 mutation_10)",
            },
            "source_runs": str(RUN_ROOT),
            "paper_manifest": str(MANIFEST),
        },
        "paper_aids": aids,
        "paper_medians": paper_medians,
        "arm_summaries": arm_summaries,
        "designs": designs,
    }

    DATA_OUT.write_text(json.dumps(payload, indent=2) + "\n")

    print("\n## HA-PD1 mono-60 Top designs vs PDB resolution\n")
    print(
        "| id | source_run | criterion | rank | overall | ipTM | PAE | pdb |"
    )
    print(
        "|----|------------|-----------|-----:|--------:|-----:|----:|-----|"
    )
    for row in table_rows:
        print(row)
    print(f"\nWrote {DATA_OUT}")
    print(f"Designs: {len(designs)} | PDB ok: {sum(1 for d in designs if d['pdb_resolved'])}")
    print(f"AiDs: {len(aids)}")


if __name__ == "__main__":
    main()
