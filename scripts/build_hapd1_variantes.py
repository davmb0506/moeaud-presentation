#!/usr/bin/env python3
"""Best overall_score por run HA-PD1 mono-60 (mutation / base / temp × 01–10).

Folder naming vs operator meaning:
  mutation_* → EvoPro base (solo mutación)
  base_*     → EvoPro both (mutación + cruce)
  temp_*     → Temp. variable v3 (both + T variable, T0=0.1)

Point value = cumulative minimum of overall_score across iterations 1..60
(same boxplot logic as tempVariableBoxplotMapping). Copies chainAB PDBs and
writes src/data/hapd1Variantes.json for the variantes slide.
"""
from __future__ import annotations

import json
import re
import shutil
import statistics
from pathlib import Path

from Bio.SeqUtils.ProtParam import ProteinAnalysis

EVOPRO = Path("/home/david/Documents/Dev/Tesis/EvoPro_Mod/evopro")
RUN_ROOT = EVOPRO / "run" / "outputs_hapd1_mono_60"
TEMP_V3_ROOT = EVOPRO / "run" / "outputs_hapd1_mono_60_temp_v3"
PRES = Path("/home/david/Documents/Dev/Tesis/moeaud-presentation")
PUB = PRES / "public" / "pdbs" / "hapd1-variantes"
DATA_OUT = PRES / "src" / "data" / "hapd1Variantes.json"

STANDARD_AA = set("ACDEFGHIKLMNPQRSTVWY")

# Display order: solo mutación → mutación y cruce → temperatura variable.
ARMS = (
    {
        "id": "mutation",
        "label": "Solo mutación",
        "shortLabel": "Mutación",
        "color": "#3b6fb0",
        "note": "carpeta mutation_* = solo mutación",
        "run_root": RUN_ROOT,
    },
    {
        "id": "base",
        "label": "Mutación y cruce",
        "shortLabel": "Mut. + cruce",
        "color": "#d1622b",
        "note": "carpeta base_* = mutación + cruce",
        "run_root": RUN_ROOT,
    },
    {
        "id": "temp",
        "label": "Temperatura variable",
        "shortLabel": "T variable",
        "color": "#1d8a7a",
        "note": "temp_v3: mutación + cruce + T variable, T0=0.1, rango [0.05,0.3], metric=score",
        "run_root": TEMP_V3_ROOT,
    },
)
REPLICAS = range(1, 11)
GENERATION_BUDGET = 60

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


def build_pdb_map(outputs_dir: Path) -> dict[str, Path]:
    mapping: dict[str, Path] = {}
    for pdb in outputs_dir.glob("seq_*_pred_0_chainAB.pdb"):
        seq = seq_from_pdb(pdb, "A")
        if seq and seq not in mapping:
            mapping[seq] = pdb
    return mapping


def parse_all_iterations(scores_path: Path) -> list[dict]:
    """All scored designs across iterations; metrics from post-` | ` fields."""
    text = scores_path.read_text()
    parts = re.split(r"(?=^Iteration\s+\d+)", text, flags=re.M)
    rows: list[dict] = []
    for part in parts:
        m = re.match(r"^Iteration\s+(\d+)\t,,([^\n]*)\n", part)
        if not m:
            continue
        iteration = int(m.group(1))
        header = m.group(2).split(",")
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
            iptm = data.get("ipTM")
            if iptm is None:
                iptm = data.get("iptm")
            rows.append(
                {
                    "iteration": iteration,
                    "binder": binder,
                    "overall_score": float(overall),
                    "plddt_a": data.get("pLDDT_chainA"),
                    "plddt_ab": data.get("pLDDT_chainAB"),
                    "iptm": float(iptm) if iptm is not None else None,
                    "contact": data.get("ContactScore"),
                    "pae_iface": data.get("f1_pae_interface"),
                    "confdiff": data.get("ConfDiffScore"),
                }
            )
    return rows


def mean(vals: list[float]) -> float:
    return sum(vals) / len(vals)


def std(vals: list[float]) -> float:
    if len(vals) < 2:
        return 0.0
    return statistics.stdev(vals)


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


def extract_run(arm: dict, replica: int) -> dict:
    arm_id = arm["id"]
    run_root = Path(arm.get("run_root") or RUN_ROOT)
    run_id = f"{arm_id}_{replica:02d}"
    run_dir = run_root / run_id
    scores_path = run_dir / "outputs" / "scores.csv"
    if not scores_path.is_file():
        raise FileNotFoundError(f"Missing scores.csv for {run_id} under {run_root}")

    rows = parse_all_iterations(scores_path)
    if not rows:
        raise RuntimeError(f"No scored rows in {scores_path}")

    last_iter = max(r["iteration"] for r in rows)
    # Cumulative minimum: best score seen by the end of the run.
    best = min(rows, key=lambda r: r["overall_score"])

    outputs_dir = run_dir / "outputs"
    pdb_map = build_pdb_map(outputs_dir)
    src_pdb = pdb_map.get(best["binder"])
    dest_rel: str | None = None
    if src_pdb is not None:
        dest_name = f"{run_id}.pdb"
        dest = PUB / dest_name
        dest.write_text(sanitize_pdb(src_pdb.read_text()))
        dest_rel = f"/pdbs/hapd1-variantes/{dest_name}"

    return {
        "id": run_id,
        "arm": arm_id,
        "replica": replica,
        "generation_budget": GENERATION_BUDGET,
        "last_iteration_used": last_iter,
        "best_iteration": best["iteration"],
        "score": best["overall_score"],
        "binder": best["binder"],
        "plddt": float(best["plddt_a"]) if best["plddt_a"] is not None else None,
        "plddt_chainAB": float(best["plddt_ab"]) if best["plddt_ab"] is not None else None,
        "iptm": best["iptm"],
        "contact": float(best["contact"]) if best["contact"] is not None else None,
        "pae_iface": float(best["pae_iface"]) if best["pae_iface"] is not None else None,
        "confdiff": float(best["confdiff"]) if best["confdiff"] is not None else None,
        "pdb": dest_rel,
        "score_source": str(scores_path),
        "pdb_source": str(src_pdb) if src_pdb else None,
        "notes": (
            f"best_iteration={best['iteration']} | last_iteration_used={last_iter} | "
            "point_value = cumulative minimum across iterations 1..last"
        ),
        **peptide_props(best["binder"]),
    }


def main() -> None:
    if PUB.is_dir():
        shutil.rmtree(PUB)
    PUB.mkdir(parents=True, exist_ok=True)

    arms_out: list[dict] = []
    all_runs: list[dict] = []

    for arm in ARMS:
        runs = [extract_run(arm, r) for r in REPLICAS]
        scores = [run["score"] for run in runs]
        arm_public = {k: v for k, v in arm.items() if k != "run_root"}
        arms_out.append(
            {
                **arm_public,
                "run_root": str(arm.get("run_root") or RUN_ROOT),
                "n": len(runs),
                "mean": mean(scores),
                "std": std(scores),
                "min": min(scores),
                "max": max(scores),
                "values": scores,
                "runs": runs,
            }
        )
        all_runs.extend(runs)
        missing = sum(1 for run in runs if not run["pdb"])
        print(
            f"{arm['id']}: n={len(runs)} mean={mean(scores):.2f}±{std(scores):.2f} "
            f"best={min(scores):.2f} missing_pdb={missing}"
        )

    global_best = min(all_runs, key=lambda r: r["score"])
    payload = {
        "meta": {
            "target": "HA-PD1",
            "generation_budget": GENERATION_BUDGET,
            "replicas_per_arm": len(REPLICAS),
            "score_definition": (
                "cumulative minimum overall_score across iterations 1..60 per run"
            ),
            "run_root": str(RUN_ROOT),
            "temp_run_root": str(TEMP_V3_ROOT),
            "temp_version": "v3",
            "global_best_id": global_best["id"],
            "peptide_props": (
                "BioPython ProtParam on binder sequence: gravy, charge_at_pH(7), "
                "isoelectric_point, aromaticity, instability_index, molecular_weight."
            ),
        },
        "arms": arms_out,
    }
    DATA_OUT.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"Wrote {DATA_OUT}")
    print(f"Global best: {global_best['id']} score={global_best['score']:.3f}")


if __name__ == "__main__":
    main()
