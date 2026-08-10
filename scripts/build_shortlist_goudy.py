#!/usr/bin/env python3
"""Build Flujo Goudy shortlist JSON for presentation (mono HA-PD1 + MOEA pool1208).

Writes src/data/shortlistGoudy.json with:
  - top-level fields = default panel (moea_pool1208) for backward compatibility
  - panels.{moea_pool1208,hapd1_mono60} for dual-panel UI

Re-run after hapd1 Goudy finishes:
  python3 scripts/build_shortlist_goudy.py
"""
from __future__ import annotations

import csv
import json
import shutil
import sys
from pathlib import Path

from Bio.SeqUtils.ProtParam import ProteinAnalysis

REPO = Path("/home/david/Documents/Dev/Tesis/EvoPro_Mod")
PRES = Path("/home/david/Documents/Dev/Tesis/moeaud-presentation")
RUNS = REPO / "evopro/validation/unified/runs"
OUT_JSON = PRES / "src/data/shortlistGoudy.json"
PUB_ROOT = PRES / "public/pdbs"

STANDARD_AA = set("ACDEFGHIKLMNPQRSTVWY")

GROUP_LABELS = {
    "interface_pae_plddt_mech": "ipPAE + mecanismos",
    "interface_pae_plddt_nomech": "ipPAE sin mecanismos",
    "composite_tmscore_mech": "Composite + mecanismos",
    "composite_tmscore_nomech": "Composite sin mecanismos",
    "ipsae_sc_mech": "ipSAE/SC + mecanismos",
    "ipsae_sc_nomech": "ipSAE/SC sin mecanismos",
    "base": "both (T=0.1)",
    "temp": "temp (T variable)",
    "mutation": "mutation (sin cruce)",
}

# VEGF-A monomer: 21 aa binder × 95 aa target (pares de interfaz en f1 PAE).
VEGF_N_PAIRS = 21 * 95
CASCADE_POOL = (
    REPO / "evopro/validation/cascade/cascade_pool1208_all_groups.csv"
)

PANELS = {
    "moea_pool1208": {
        "label": "MOEA VEGF-A (no dominados)",
        "target": "VEGF-A",
        "experiment_mode": "multiobjective",
        "protocol": "vegfa_adapted",
        "protocol_label": "Goudy adaptado (péptido + epítopo VEGFR-2)",
        "diversity_label": "grupo",
        "groups_total": 6,
        "pdb_subdir": "shortlist-goudy",
        "default": True,
    },
    "hapd1_mono60": {
        "label": "HA-PD1 mono-60",
        "target": "HA-PD1",
        "experiment_mode": "monoobjective",
        "protocol": "paper",
        "protocol_label": "Goudy paper (EvoPro idéntico)",
        "diversity_label": "brazo",
        "groups_total": 3,
        "pdb_subdir": "shortlist-goudy-hapd1",
        "default": False,
    },
}


def short_id(candidate_id: str) -> str:
    return candidate_id.split("__", 1)[1] if "__" in candidate_id else candidate_id


def to_float(value: str | None) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except ValueError:
        return None


def cascade_af2_by_seq() -> dict[str, dict]:
    """Decode design-time AF2 objectives from the MOEA cascade pool."""
    if not CASCADE_POOL.is_file():
        return {}
    out: dict[str, dict] = {}
    for row in csv.DictReader(CASCADE_POOL.open()):
        seq = (row.get("binder_seq") or "").strip()
        if not seq:
            continue
        grupo = row.get("grupo") or ""
        entry: dict = {"iptm": None}
        if "interface_pae" in grupo:
            f1 = to_float(row.get("f1_interface_pae"))
            f2 = to_float(row.get("f2_plddt"))
            entry.update(
                {
                    "pae_iface": round(35.0 * (f1 / VEGF_N_PAIRS + 1.0), 2)
                    if f1 is not None
                    else None,
                    "plddt_a": round(-f2, 1) if f2 is not None else None,
                    "ipsae": None,
                    "design_sc": None,
                    "af2_source": "moea_objectives_interface_pae_plddt",
                }
            )
        elif "ipsae" in grupo:
            raw_ipsae = to_float(row.get("ipsae_raw"))
            raw_sc = to_float(row.get("sc_raw"))
            entry.update(
                {
                    "pae_iface": None,
                    "plddt_a": None,
                    "ipsae": round(raw_ipsae, 3) if raw_ipsae is not None else None,
                    "design_sc": round(raw_sc, 3) if raw_sc is not None else None,
                    "af2_source": "moea_objectives_ipsae_sc",
                }
            )
        else:
            continue
        out[seq] = entry
    return out


def seq_metrics(seq: str) -> dict:
    s = (seq or "").strip().upper()
    out = {
        "length": len(s),
        "gravy": None,
        "instability": None,
        "mw_da": None,
        "mw_kda": None,
        "pI": None,
        "charge": None,
        "aromaticity": None,
        "helix_frac": None,
        "al_fraction": None,
        "n_cys": s.count("C"),
        "protparam_soluble": None,
        "protparam_stable": None,
    }
    if not s or any(ch not in STANDARD_AA for ch in s):
        return out
    pa = ProteinAnalysis(s)
    gravy = pa.gravy()
    ii = pa.instability_index()
    out.update(
        {
            "gravy": round(gravy, 3),
            "instability": round(ii, 1),
            "mw_da": round(pa.molecular_weight(), 1),
            "mw_kda": round(pa.molecular_weight() / 1000.0, 2),
            "pI": round(pa.isoelectric_point(), 2),
            "charge": round(pa.charge_at_pH(7.0), 2),
            "aromaticity": round(pa.aromaticity(), 3),
            "helix_frac": round(pa.secondary_structure_fraction()[0], 3),
            "al_fraction": round((s.count("A") + s.count("L")) / len(s), 3),
            "protparam_soluble": gravy < 0.0,
            "protparam_stable": ii < 40.0,
        }
    )
    return out


def count_csv(path: Path, predicate=None) -> int:
    if not path.is_file():
        return 0
    rows = list(csv.DictReader(path.open()))
    if predicate is None:
        return len(rows)
    return sum(1 for r in rows if predicate(r))


def _qc_pass(row: dict) -> bool:
    pool = (row.get("pool") or "").strip().lower()
    if pool == "kept":
        return True
    if pool == "rejected":
        return False
    flag = (row.get("qc_pass") or "").strip().lower()
    return flag in {"true", "1", "yes"}


def _soft_omega_pass(row: dict) -> bool:
    return (row.get("omega_class") or "").strip().lower() in {"pass", "marginal"}


def hapd1_soft_qc_rows(exp: str = "hapd1_mono60") -> list[dict]:
    """Global finalists: OmegaFold soft ∩ QC, no per-arm quota."""
    pf = RUNS / exp / "paper_filter"
    qc_path = pf / "top100_qc.csv"
    gate_path = pf / "omegafold_gate.csv"
    if not qc_path.is_file() or not gate_path.is_file():
        return []
    qc = {r["candidate_id"]: r for r in csv.DictReader(qc_path.open()) if _qc_pass(r)}
    rows: list[dict] = []
    for gr in csv.DictReader(gate_path.open()):
        cid = gr.get("candidate_id") or ""
        if not cid or not _soft_omega_pass(gr) or cid not in qc:
            continue
        merged = dict(qc[cid])
        merged.update({k: v for k, v in gr.items() if v not in (None, "")})
        if not merged.get("grupo"):
            merged["grupo"] = merged.get("cohort") or ""
        if not merged.get("source_run") and "__" in cid:
            parts = cid.split("__")
            merged["source_run"] = parts[1] if len(parts) > 1 else ""
        rows.append(merged)
    rows.sort(
        key=lambda r: (
            to_float(r.get("dg_per_dsasa_x100"))
            if to_float(r.get("dg_per_dsasa_x100")) is not None
            else 10**9,
            int(r["paper_rank"]) if r.get("paper_rank") else 10**9,
        )
    )
    for i, r in enumerate(rows, 1):
        r["shortlist_rank"] = str(i)
    return rows


def build_funnel(exp: str) -> list[dict] | None:
    root = RUNS / exp
    pf = root / "paper_filter"
    thesis = pf / "shortlist_thesis.csv"
    if not thesis.is_file() and exp != "hapd1_mono60":
        return None
    if exp == "hapd1_mono60" and not (pf / "omegafold_gate.csv").is_file():
        return None

    n_cand = count_csv(root / "candidates.csv")
    ros = root / "rosetta" / "rosetta_summary.csv"
    n_ros_ok = count_csv(ros, lambda r: (r.get("status") or "ok") == "ok")
    n_top = count_csv(pf / "top100.csv") or 100
    n_qc = count_csv(pf / "top100_qc.csv", _qc_pass)
    if n_qc == 0:
        n_qc = count_csv(pf / "top100_qc.csv", lambda r: r.get("pool") == "kept")
    n_short = count_csv(thesis) if thesis.is_file() else 0

    if exp == "moea_pool1208":
        return [
            {
                "label": "Conjunto inicial",
                "value": n_cand or 1208,
                "note": "Diseños no dominados de los 6 grupos; aún sin filtro",
            },
            {
                "label": "Energía Rosetta",
                "value": n_ros_ok or 1049,
                "note": "Completan la relajación Rosetta; sin corte por energía",
            },
            {
                "label": "100 mejores",
                "value": n_top or 100,
                "note": "Conserva los 100 de mejor energía de interfaz",
            },
            {
                "label": "Control de calidad",
                "value": n_qc or 90,
                "note": "Filtra composición extrema y baja cobertura del epítopo",
            },
            {
                "label": "Selección final",
                "value": n_short,
                "note": "OmegaFold confirma el pliegue; a lo sumo 3 por grupo",
            },
        ]

    soft_qc = hapd1_soft_qc_rows(exp)
    return [
        {
            "label": "Conjunto inicial",
            "value": n_cand,
            "note": "Última generación de los 3 brazos; aún sin filtro",
        },
        {
            "label": "Energía Rosetta",
            "value": n_ros_ok,
            "note": "Completan la relajación Rosetta; sin corte por energía",
        },
        {
            "label": "100 mejores",
            "value": n_top or 100,
            "note": "Conserva los 100 de mejor energía de interfaz",
        },
        {
            "label": "Control de calidad",
            "value": n_qc or n_top,
            "note": "Descarta secuencias degeneradas en Ala, Leu y Gln",
        },
        {
            "label": "Selección final",
            "value": len(soft_qc) or n_short,
            "note": "OmegaFold confirma el pliegue a <5 Å del modelo AF2",
        },
    ]


def _dedupe_rows_by_seq(rows: list[dict]) -> list[dict]:
    """Keep first occurrence of each binder sequence (already rank-sorted)."""
    out: list[dict] = []
    seen: set[str] = set()
    for row in rows:
        seq = (row.get("binder_seq") or "").strip().upper()
        if not seq or seq in seen:
            continue
        seen.add(seq)
        out.append(row)
    return out


def _topup_unique_from_post_omega(exp: str, rows: list[dict], target_n: int) -> list[dict]:
    """If thesis shortlist collapsed after dedupe, refill with unique Ω survivors."""
    if len(rows) >= target_n:
        return rows[:target_n]
    post = RUNS / exp / "paper_filter" / "shortlist_post_omega.csv"
    if not post.is_file():
        return rows
    have = {(r.get("binder_seq") or "").strip().upper() for r in rows}
    have_ids = {r.get("candidate_id") for r in rows}
    extras = list(csv.DictReader(post.open()))
    extras.sort(key=lambda r: int(r["paper_rank"]) if r.get("paper_rank") else 10**9)
    for er in extras:
        seq = (er.get("binder_seq") or "").strip().upper()
        cid = er.get("candidate_id")
        if not seq or seq in have or cid in have_ids:
            continue
        # Prefer non-degenerate-looking sequences (skip extreme poly-A if QC already did).
        if seq.count("A") / max(len(seq), 1) > 0.55:
            continue
        row = dict(er)
        row["shortlist_rank"] = str(len(rows) + 1)
        if not row.get("grupo"):
            row["grupo"] = row.get("cohort") or (cid.split("__")[1] if cid and "__" in cid else "")
        if not row.get("source_run") and cid:
            parts = cid.split("__")
            row["source_run"] = parts[1] if len(parts) > 1 else ""
        rows.append(row)
        have.add(seq)
        have_ids.add(cid)
        if len(rows) >= target_n:
            break
    for i, r in enumerate(rows, 1):
        r["shortlist_rank"] = str(i)
    return rows


def build_panel(exp: str, meta: dict) -> dict:
    root = RUNS / exp
    thesis = root / "paper_filter" / "shortlist_thesis.csv"
    pub = PUB_ROOT / meta["pdb_subdir"]
    pub.mkdir(parents=True, exist_ok=True)

    if exp == "hapd1_mono60":
        rows = hapd1_soft_qc_rows(exp)
        if not rows:
            return {
                **meta,
                "id": exp,
                "status": "pending",
                "funnel": None,
                "total": 0,
                "omega_pass": 0,
                "omega_marginal": 0,
                "groups_covered": [],
                "candidates": [],
                "note": f"Esperando OmegaFold gate en {root / 'paper_filter'} (Flujo Goudy en curso).",
            }
        # Funnel counts all soft∩QC designs; panel shows unique sequences.
        rows = _dedupe_rows_by_seq(rows)
        for i, r in enumerate(rows, 1):
            r["shortlist_rank"] = str(i)
    elif not thesis.is_file():
        return {
            **meta,
            "id": exp,
            "status": "pending",
            "funnel": None,
            "total": 0,
            "omega_pass": 0,
            "omega_marginal": 0,
            "groups_covered": [],
            "candidates": [],
            "note": f"Esperando {thesis.relative_to(REPO)} (Flujo Goudy en curso).",
        }
    else:
        rows = list(csv.DictReader(thesis.open()))
        rows.sort(key=lambda r: int(r["shortlist_rank"]))
        # Identical sequences with different IDs (same AF2 complex) must not appear twice.
        rows = _dedupe_rows_by_seq(rows)

    # Optional post-hoc energy: prefer OpenMM MM-GBSA (Amber14/GBn2); AmberTools CSV as fallback.
    energy_by_id: dict[str, dict] = {}
    for energy_name, col in (
        ("shortlist_thesis_mmgbsa.csv", "mmgbsa_openmm"),
        ("shortlist_thesis_amber.csv", "mmgbsa_amber"),
    ):
        ep = root / "paper_filter" / energy_name
        if not ep.is_file():
            continue
        for er in csv.DictReader(ep.open()):
            cid = er.get("candidate_id") or ""
            if not cid or cid in energy_by_id:
                continue
            dg = to_float(er.get(col) or er.get("mmgbsa_amber") or er.get("mmgbsa_openmm"))
            if dg is None:
                continue
            energy_by_id[cid] = {
                "mmgbsa": round(dg, 2),
                "mmgbsa_method": "openmm_gb" if col == "mmgbsa_openmm" else "amber_mmpbsa",
                "mmgbsa_status": er.get("status") or "ok",
            }

    candidates = []
    missing = []
    cascade_af2 = cascade_af2_by_seq() if exp == "moea_pool1208" else {}
    for row in rows:
        cand_id = row["candidate_id"]
        sid = short_id(cand_id)
        src = Path(row["complex_pdb"])
        dst = pub / f"{sid}.pdb"
        pdb_url = None
        if src.is_file():
            shutil.copyfile(src, dst)
            pdb_url = f"/pdbs/{meta['pdb_subdir']}/{sid}.pdb"
        else:
            missing.append(cand_id)

        grupo = row.get("grupo") or row.get("cohort") or ""
        energy = energy_by_id.get(cand_id, {})
        af2 = cascade_af2.get(row["binder_seq"], {})
        entry = {
            "id": sid,
            "candidate_id": cand_id,
            "rank": int(row["shortlist_rank"]),
            "grupo": grupo,
            "grupo_label": GROUP_LABELS.get(grupo, grupo),
            "binder_seq": row["binder_seq"],
            "source_run": row["source_run"],
            "score_rosetta": round(to_float(row.get("dg_per_dsasa_x100")), 2)
            if to_float(row.get("dg_per_dsasa_x100")) is not None
            else None,
            "dg_separated": round(to_float(row.get("dG_separated")), 1)
            if to_float(row.get("dG_separated")) is not None
            else None,
            "dsasa": round(to_float(row.get("dSASA")), 1)
            if to_float(row.get("dSASA")) is not None
            else None,
            "sc": round(to_float(row.get("sc")), 3) if to_float(row.get("sc")) is not None else None,
            "n_interface_res": int(float(row["n_interface_res"]))
            if row.get("n_interface_res")
            else None,
            "rmsd_A": round(to_float(row.get("rmsd_A")), 2)
            if to_float(row.get("rmsd_A")) is not None
            else None,
            "omega_class": row.get("omega_class"),
            "pass_paper_3A": row.get("pass_paper_3A") == "True",
            "pass_calibrated_5A": row.get("pass_calibrated_5A") == "True",
            "paper_rank": int(row["paper_rank"]) if row.get("paper_rank") else None,
            "epitope_coverage": round(to_float(row.get("epitope_coverage")), 3)
            if to_float(row.get("epitope_coverage")) is not None
            else None,
            "shannon": round(to_float(row.get("shannon")), 3)
            if to_float(row.get("shannon")) is not None
            else None,
            "iptm": af2.get("iptm")
            if "iptm" in af2
            else (
                round(to_float(row.get("iptm")), 4)
                if to_float(row.get("iptm")) is not None
                else None
            ),
            "pae_iface": af2.get("pae_iface")
            if "pae_iface" in af2
            else (
                round(to_float(row.get("pae_iface")), 2)
                if to_float(row.get("pae_iface")) is not None
                else None
            ),
            "plddt_a": af2.get("plddt_a")
            if "plddt_a" in af2
            else (
                round(to_float(row.get("plddt_a")), 2)
                if to_float(row.get("plddt_a")) is not None
                else None
            ),
            "ipsae": af2.get("ipsae"),
            "design_sc": af2.get("design_sc"),
            "af2_source": af2.get("af2_source"),
            "overall_score": round(to_float(row.get("overall_score")), 2)
            if to_float(row.get("overall_score")) is not None
            else None,
            "mmgbsa": energy.get("mmgbsa"),
            "mmgbsa_method": energy.get("mmgbsa_method"),
            "pdb": pdb_url,
            **seq_metrics(row["binder_seq"]),
        }
        candidates.append(entry)

    n_pass = sum(1 for c in candidates if c["omega_class"] == "pass")
    n_marginal = sum(1 for c in candidates if c["omega_class"] == "marginal")
    groups = sorted({c["grupo"] for c in candidates})
    funnel = build_funnel(exp)
    mmgbsa_vals = [c["mmgbsa"] for c in candidates if c.get("mmgbsa") is not None]
    amber_summary = None
    if mmgbsa_vals:
        s = sorted(mmgbsa_vals)
        n = len(s)
        med = (s[n // 2 - 1] + s[n // 2]) / 2 if n % 2 == 0 else s[n // 2]
        amber_summary = {
            "n": n,
            "median": round(med, 1),
            "best": round(min(mmgbsa_vals), 1),
            "method_label": "MM-GBSA (Amber14 / GBn2, OpenMM)",
        }

    return {
        **meta,
        "id": exp,
        "status": "ready",
        "funnel": funnel,
        "total": len(candidates),
        "omega_pass": n_pass,
        "omega_marginal": n_marginal,
        "groups_covered": groups,
        "candidates": candidates,
        "missing_pdb": missing,
        "amber_summary": amber_summary,
        "note": None,
    }


def main() -> None:
    panels = {}
    for exp, meta in PANELS.items():
        panels[exp] = build_panel(exp, meta)
        st = panels[exp]["status"]
        n = panels[exp]["total"]
        print(f"[{exp}] status={st} n={n}")
        if panels[exp].get("missing_pdb"):
            print(f"  missing PDBs: {len(panels[exp]['missing_pdb'])}")

    default_id = next(k for k, v in PANELS.items() if v.get("default"))
    default = panels[default_id]

    # Backward-compatible top-level = default (MOEA) panel
    payload = {
        "default_panel": default_id,
        "protocol": (
            "Dual: HA-PD1 = Goudy paper (EvoPro); "
            "VEGF-A = Goudy adaptado (Shannon/GRAVY, epítopo VEGFR-2≥0.20, id≤0.70)"
        ),
        "panels": panels,
        "funnel": default.get("funnel"),
        "total": default["total"],
        "omega_pass": default["omega_pass"],
        "omega_marginal": default["omega_marginal"],
        "groups_covered": default["groups_covered"],
        "groups_total": PANELS[default_id]["groups_total"],
        "candidates": default["candidates"],
    }
    OUT_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {OUT_JSON}")
    print(f"Default panel: {default_id} (n={default['total']})")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
