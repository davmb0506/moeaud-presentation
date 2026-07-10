#!/usr/bin/env python3
"""Consolida métricas de docking local (HADDOCK) y ciego (CABSdock) para 24 candidatos."""
from __future__ import annotations

import csv
import json
import shutil
import sys
from pathlib import Path

import numpy as np
from Bio.PDB import PDBParser, Superimposer

REPO = Path("/home/david/Documents/Dev/Tesis/EvoPro_Mod")
PRES = Path("/home/david/Documents/Dev/Tesis/moeaud-presentation")
CASCADE = REPO / "evopro" / "validation" / "cascade"
OUT_JSON = PRES / "src" / "data" / "dockingValidation.json"
PUB_PDB = PRES / "public" / "pdbs" / "docking-validation"
NATIVE_VEGFA_PDB = CASCADE / "haddock3_native_control" / "vegfa_A_native.pdb"

sys.path.insert(0, str(REPO))
from evopro.scoring.epitope_scoring import compute_epitope_score, extract_epitope

HYBRID_MANIFEST = CASCADE / "docking_campaign_hybrid_blended" / "campaign_manifest.csv"
MISSING12_DIR = CASCADE / "cabsdock_phase2_native_vegfa_hybrid_missing12"
MISSING12_MANIFEST = MISSING12_DIR / "phase2_manifest.json"
MISSING12_CAMPAIGN = MISSING12_DIR / "campaign_reconciled_missing12.csv"
REF_EPITOPE_PDB = REPO / "evopro/run/targets/vegfa/vegfa_vegfr2.pdb"

HADDOCK_WAVE_DIRS = {
    "primary_wave": CASCADE / "haddock3_primary_wave_hybrid_blended",
    "backup_wave": CASCADE / "haddock3_backup_wave_hybrid_blended",
    "pilot_tier1": CASCADE / "haddock3_pilot_hybrid_blended",
}

POSE_SOURCES = [
    MISSING12_DIR / "phase2_native_pose_agreement_best_clusters.csv",
    CASCADE / "validation_completion/panel12_native_blind_pose_agreement_best_clusters.csv",
    CASCADE / "cabsdock_phase2_native_vegfa_priority2/phase2_native_pose_agreement_best_clusters.csv",
    CASCADE / "cabsdock_phase2_native_vegfa_panel12_remaining7/phase2_native_pose_agreement_best_clusters.csv",
    CASCADE / "cabsdock_phase2_native_vegfa_nonredundant16/phase2_native_pose_agreement_best_clusters.csv",
    CASCADE / "cabsdock_phase2_native_vegfa_backup12/phase2_native_pose_agreement_best_clusters.csv",
]

PARSER = PDBParser(QUIET=True)
MEDOID_TARGET_CHAIN = "A"
MEDOID_PEPTIDE_CHAIN = "B"
REF_TARGET_CHAIN = "B"
REF_PEPTIDE_CHAIN = "A"
CLOSE_CUTOFF = 25.0
SITE_CUTOFF = 0.20

GROUP_LABELS = {
    "interface_pae_plddt_mech": "ipPAE + mecanismos",
    "interface_pae_plddt_nomech": "ipPAE sin mecanismos",
    "composite_tmscore_mech": "Composite + mecanismos",
    "composite_tmscore_nomech": "Composite sin mecanismos",
    "ipsae_sc_mech": "ipSAE + mecanismos",
    "ipsae_sc_nomech": "ipSAE sin mecanismos",
}

FOCUS_TAB_TITLES = [
    "Cumple ambos criterios",
    "Solo RMSD, sin sitio",
    "También cumple ambos",
]


def pct(n: int, total: int) -> str:
    if total == 0:
        return "0%"
    return f"{100 * n / total:.1f}%"


def fmt_pct(value: float | None) -> str:
    if value is None:
        return "—"
    return f"{100 * value:.1f}%"


def fmt_rmsd(value: float | None) -> str:
    if value is None:
        return "—"
    return f"{value:.2f} Å"


def best_haddock(row: dict[str, str]) -> tuple[str, float]:
    root = HADDOCK_WAVE_DIRS[row["wave"]]
    analysis_dir = root / row["submission_slug"] / "run_rigid_target/analysis/4_emref_analysis"
    with (analysis_dir / "capri_ss.tsv").open() as fh:
        best = next(csv.DictReader(fh, delimiter="\t"))
    best_model = (analysis_dir / best["model"]).resolve()
    return str(best_model), float(best["score"])


def get_ca_atoms(structure, chain_id: str):
    chain = structure[0][chain_id]
    return [res["CA"] for res in chain if res.id[0] == " " and "CA" in res]


def repo_path(path: str | Path) -> Path:
    p = Path(path)
    if p.is_absolute():
        return p
    return REPO / p


def peptide_chain_for_structure(structure) -> str:
    chains = list(structure[0])
    if len(chains) != 2:
        raise ValueError("Expected exactly two chains in blind complex")
    for chain in chains:
        if chain.id != MEDOID_TARGET_CHAIN:
            return chain.id
    raise ValueError("Could not identify peptide chain")


def compare_pose(medoid_path: Path, ref_path: Path) -> dict[str, float]:
    medoid = PARSER.get_structure("medoid", str(medoid_path))
    ref = PARSER.get_structure("ref", str(ref_path))
    medoid_peptide_chain = peptide_chain_for_structure(medoid)
    medoid_target = get_ca_atoms(medoid, MEDOID_TARGET_CHAIN)
    medoid_peptide = get_ca_atoms(medoid, medoid_peptide_chain)
    ref_target = get_ca_atoms(ref, REF_TARGET_CHAIN)
    ref_peptide = get_ca_atoms(ref, REF_PEPTIDE_CHAIN)
    sup = Superimposer()
    sup.set_atoms(medoid_target, ref_target)
    rot, tran = sup.rotran
    medoid_peptide_coords = np.array([atom.coord for atom in medoid_peptide])
    ref_peptide_coords = np.array([atom.coord for atom in ref_peptide])
    transformed = np.dot(medoid_peptide_coords, rot) + tran
    peptide_ca_rmsd = float(
        np.sqrt(np.mean(np.sum((transformed - ref_peptide_coords) ** 2, axis=1)))
    )
    return {
        "peptide_ca_rmsd_A": peptide_ca_rmsd,
        "blind_peptide_chain": medoid_peptide_chain,
    }


def summarize_missing12_case(case: dict, campaign_row: dict) -> dict | None:
    case_dir = repo_path(case["case_dir"])
    run_dir = case_dir / "output/run_blind_native_vegfa"
    if not (run_dir / "CABS.log").exists():
        return None
    if "completed successfully" not in (run_dir / "CABS.log").read_text(errors="ignore"):
        return None
    output_pdbs = run_dir / "output_pdbs"
    haddock_pdb = repo_path(campaign_row["best_model_path"])
    af2_pdb = repo_path(campaign_row["seed_complex_pdb"])
    cluster_paths = sorted(output_pdbs.glob("cluster_*_medoid_ca.pdb"))
    if not cluster_paths:
        cluster_paths = sorted(output_pdbs.glob("cluster_*.pdb"))
    best_haddock_row = None
    best_haddock_rmsd = float("inf")
    for cluster_pdb in cluster_paths:
        cluster = cluster_pdb.name.replace("_medoid_ca.pdb", "").replace(".pdb", "")
        try:
            metrics = compare_pose(cluster_pdb, haddock_pdb)
        except Exception:
            continue
        rmsd = metrics["peptide_ca_rmsd_A"]
        if rmsd < best_haddock_rmsd:
            best_haddock_rmsd = rmsd
            blind_pdb = find_blind_cluster_pdb(str(case["repred_id"]), cluster) or str(cluster_pdb)
            best_haddock_row = {
                "best_cluster_by_haddock": cluster,
                "best_peptide_ca_rmsd_to_haddock_A": rmsd,
                "medoid_all_atom_pdb": blind_pdb,
                "haddock_best_pdb": str(haddock_pdb),
                "af2_complex_pdb": str(af2_pdb),
            }
    if best_haddock_row is None:
        return None
    best_af2_rmsd = float("inf")
    best_af2_cluster = ""
    for cluster_pdb in cluster_paths:
        cluster = cluster_pdb.name.replace("_medoid_ca.pdb", "").replace(".pdb", "")
        try:
            metrics = compare_pose(cluster_pdb, af2_pdb)
        except Exception:
            continue
        if metrics["peptide_ca_rmsd_A"] < best_af2_rmsd:
            best_af2_rmsd = metrics["peptide_ca_rmsd_A"]
            best_af2_cluster = cluster
    best_haddock_row["best_cluster_by_af2"] = best_af2_cluster
    best_haddock_row["best_peptide_ca_rmsd_to_af2_A"] = best_af2_rmsd
    return best_haddock_row


def load_pose_rows() -> dict[str, dict]:
    rows: dict[str, dict] = {}
    for source in POSE_SOURCES:
        if not source.is_file():
            continue
        with source.open() as fh:
            for row in csv.DictReader(fh):
                rid = row["repred_id"]
                if rid not in rows:
                    rows[rid] = row
    return rows


def epitope_overlap_for_blind(blind_pdb: Path) -> float | None:
    if not blind_pdb.is_file():
        return None
    epitope = extract_epitope(str(REF_EPITOPE_PDB), "A", "R", 5.0)
    structure = PARSER.get_structure("blind", str(blind_pdb))
    peptide_chain = peptide_chain_for_structure(structure)
    try:
        return float(
            compute_epitope_score(
                blind_pdb.read_text(),
                epitope,
                binder_chain=peptide_chain,
                target_chain=MEDOID_TARGET_CHAIN,
            )
        )
    except Exception:
        return None


def find_blind_cluster_pdb(repred_id: str, cluster_name: str) -> str:
    if not cluster_name:
        return ""
    case_dirs = sorted(MISSING12_DIR.glob(f"*_{repred_id}"))
    for case_dir in case_dirs:
        pdbs = case_dir / "output/run_blind_native_vegfa/output_pdbs"
        for name in (f"{cluster_name}_medoid_all_atom.pdb", f"{cluster_name}.pdb"):
            candidate = pdbs / name
            if candidate.is_file():
                return str(candidate)
    for name in (f"{cluster_name}_medoid_all_atom.pdb", f"{cluster_name}.pdb"):
        for path in CASCADE.rglob(f"*{repred_id}*/output/run_blind_native_vegfa/output_pdbs/{name}"):
            return str(path)
    return ""


def classify(close: bool, site: bool) -> str:
    if close and site:
        return "dual"
    if close:
        return "close"
    if site:
        return "site"
    return "weak"


def pick_focus_cases(candidates: list[dict]) -> list[dict]:
    scored = [c for c in candidates if c["blind_status"] == "completed"]
    dual = sorted(
        [c for c in scored if c["outcome"] == "dual"],
        key=lambda c: (-(c["site_coverage"] or 0), c["rmsd_to_haddock"] or 999),
    )
    close_off = sorted(
        [c for c in scored if c["outcome"] == "close"],
        key=lambda c: c["rmsd_to_haddock"] or 999,
    )
    picks: list[dict] = []
    if dual:
        picks.append(dual[0])
    if close_off:
        picks.append(close_off[0])
    if len(dual) > 1:
        picks.append(dual[1])
    elif dual and close_off:
        site_only = sorted(
            [c for c in scored if c["outcome"] == "site"],
            key=lambda c: -(c["site_coverage"] or 0),
        )
        if site_only:
            picks.append(site_only[0])
    # dedupe preserving order
    seen = set()
    unique = []
    for c in picks:
        if c["repred_id"] not in seen:
            seen.add(c["repred_id"])
            unique.append(c)
    return unique[:3]


def main() -> None:
    manifest_rows = list(csv.DictReader(HYBRID_MANIFEST.open()))
    pose_rows = load_pose_rows()
    missing_campaign = {
        row["repred_id"]: row
        for row in csv.DictReader(MISSING12_CAMPAIGN.open())
    } if MISSING12_CAMPAIGN.is_file() else {}
    missing_cases = {
        case["repred_id"]: case
        for case in json.loads(MISSING12_MANIFEST.read_text())["cases"]
    } if MISSING12_MANIFEST.is_file() else {}

    epitope_cache = extract_epitope(str(REF_EPITOPE_PDB), "A", "R", 5.0)
    _ = epitope_cache

    candidates = []
    for row in manifest_rows:
        repred_id = row["repred_id"]
        local_pdb, local_score = best_haddock(row)
        pose = pose_rows.get(repred_id)
        if pose is None and repred_id in missing_cases and repred_id in missing_campaign:
            pose = summarize_missing12_case(missing_cases[repred_id], missing_campaign[repred_id])

        blind_status = "completed" if pose else "missing"
        rmsd = None
        site = None
        blind_cluster = ""
        blind_pdb = ""
        if pose:
            raw = pose.get("best_peptide_ca_rmsd_to_haddock_A", "")
            if raw not in ("", None):
                rmsd = float(raw)
            blind_cluster = pose.get("best_cluster_by_haddock", "")
            blind_pdb = pose.get("medoid_all_atom_pdb", "")
            if not blind_pdb and blind_cluster:
                blind_pdb = find_blind_cluster_pdb(repred_id, blind_cluster)
            if blind_pdb:
                site = epitope_overlap_for_blind(repo_path(blind_pdb))

        close = rmsd is not None and rmsd <= CLOSE_CUTOFF
        site_ok = site is not None and site >= SITE_CUTOFF
        outcome = classify(close, site_ok) if pose else "missing"

        candidates.append(
            {
                "repred_id": repred_id,
                "group": row["grupo"],
                "wave": row["wave"],
                "local_pdb": local_pdb,
                "local_score": round(local_score, 3),
                "blind_status": blind_status,
                "blind_cluster": blind_cluster,
                "blind_pdb": blind_pdb,
                "rmsd_to_haddock": round(rmsd, 2) if rmsd is not None else None,
                "site_coverage": round(site, 4) if site is not None else None,
                "close_to_local": close,
                "covers_expected_site": site_ok,
                "outcome": outcome,
            }
        )

    blind_total = len(manifest_rows)
    blind_completed = sum(1 for c in candidates if c["blind_status"] == "completed")
    local_completed = sum(1 for c in candidates if c["local_pdb"])

    close_n = sum(1 for c in candidates if c["close_to_local"])
    site_n = sum(1 for c in candidates if c["covers_expected_site"])
    dual_n = sum(1 for c in candidates if c["outcome"] == "dual")
    close_only = sum(1 for c in candidates if c["outcome"] == "close")
    site_only = sum(1 for c in candidates if c["outcome"] == "site")
    weak_n = sum(1 for c in candidates if c["outcome"] == "weak")
    missing_n = sum(1 for c in candidates if c["outcome"] == "missing")

    focus = pick_focus_cases(candidates)
    PUB_PDB.mkdir(parents=True, exist_ok=True)
    if NATIVE_VEGFA_PDB.is_file():
        shutil.copy(NATIVE_VEGFA_PDB, PUB_PDB / "vegfa_A_native.pdb")
    focus_cases = []
    labels = {
        "dual": "RMSD ≤25 Å: sí · Sitio ≥20%: sí",
        "close": "RMSD ≤25 Å: sí · Sitio ≥20%: no",
        "site": "RMSD ≤25 Å: no · Sitio ≥20%: sí",
        "weak": "RMSD ≤25 Å: no · Sitio ≥20%: no",
        "missing": "Sin resultado sobre VEGFA nativo",
    }
    outcome_labels = {
        "dual": "Replica el acomodo local y cubre el sitio VEGFR2",
        "close": "Replica el acomodo local, pero no cubre el sitio VEGFR2",
        "site": "No replica el acomodo local, pero cubre el sitio VEGFR2",
        "weak": "No replica el acomodo local ni cubre el sitio VEGFR2",
        "missing": "Sin resultado sobre VEGFA nativo",
    }
    badges = {
        "dual": outcome_labels["dual"],
        "close": outcome_labels["close"],
        "site": outcome_labels["site"],
        "weak": outcome_labels["weak"],
        "missing": outcome_labels["missing"],
    }
    readings = {
        "dual": "El docking sobre VEGFA nativo reprodujo el acomodo local y cubrió el sitio VEGFR2.",
        "close": "El docking sobre VEGFA nativo reprodujo el acomodo local, pero no cubrió el sitio VEGFR2.",
        "site": "El docking sobre VEGFA nativo cubrió el sitio VEGFR2, pero no reprodujo el acomodo local.",
        "weak": "El docking sobre VEGFA nativo no reprodujo el acomodo local ni cubrió el sitio VEGFR2.",
        "missing": "No hubo resultado consolidado sobre VEGFA nativo.",
    }

    for i, cand in enumerate(focus):
        repred_id = cand["repred_id"]
        local_name = f"{repred_id}_local.pdb"
        blind_name = f"{repred_id}_blind_{cand['blind_cluster'] or 'na'}.pdb"
        shutil.copy(repo_path(cand["local_pdb"]), PUB_PDB / local_name)
        if cand["blind_pdb"] and repo_path(cand["blind_pdb"]).is_file():
            shutil.copy(repo_path(cand["blind_pdb"]), PUB_PDB / blind_name)
        group = cand["group"]
        focus_cases.append(
            {
                "id": f"focus-{i+1}",
                "tabTitle": FOCUS_TAB_TITLES[i] if i < len(FOCUS_TAB_TITLES) else labels[cand["outcome"]],
                "formulationLabel": GROUP_LABELS.get(group, group),
                "repredId": repred_id,
                "tag": labels[cand["outcome"]],
                "outcomeLabel": outcome_labels[cand["outcome"]],
                "poseMatch": cand["close_to_local"],
                "siteMatch": cand["covers_expected_site"],
                "localPdb": f"/pdbs/docking-validation/{local_name}",
                "blindPdb": f"/pdbs/docking-validation/{blind_name}",
                "rmsd": fmt_rmsd(cand["rmsd_to_haddock"]),
                "site": fmt_pct(cand["site_coverage"]),
                "badge": badges[cand["outcome"]],
                "tone": "success" if cand["outcome"] == "dual" else "mixed" if cand["outcome"] == "close" else "neutral",
                "reading": readings[cand["outcome"]],
            }
        )

    out = {
        "cohort": "hybrid_blended",
        "total": blind_total,
        "local_completed": local_completed,
        "blind_completed": blind_completed,
        "thresholds": {
            "close_rmsd_A": CLOSE_CUTOFF,
            "site_coverage_min": SITE_CUTOFF,
        },
        "kpis": [
            {
                "label": "Criterio RMSD ≤25 Å",
                "value": pct(close_n, blind_completed),
                "count": f"{close_n}/{blind_completed}",
                "note": "candidatos cuyo RMSD del péptido al PDB local cumple el umbral",
            },
            {
                "label": "Criterio sitio ≥20%",
                "value": pct(site_n, blind_completed),
                "count": f"{site_n}/{blind_completed}",
                "note": "candidatos cuya cobertura del epitopo VEGFR2 cumple el umbral",
            },
            {
                "label": "Ambos criterios",
                "value": pct(dual_n, blind_completed),
                "count": f"{dual_n}/{blind_completed}",
                "note": "candidatos que cumplen RMSD y cobertura del epitopo",
            },
        ],
        "outcomeBands": [
            {
                "key": "dual",
                "label": outcome_labels["dual"],
                "count": f"{dual_n}/{blind_completed}",
                "width": pct(dual_n, blind_completed),
                "tone": "dual",
            },
            {
                "key": "close",
                "label": outcome_labels["close"],
                "count": f"{close_only}/{blind_completed}",
                "width": pct(close_only, blind_completed),
                "tone": "close",
            },
            {
                "key": "site",
                "label": outcome_labels["site"],
                "count": f"{site_only}/{blind_completed}",
                "width": pct(site_only, blind_completed),
                "tone": "site",
            },
            {
                "key": "weak",
                "label": outcome_labels["weak"],
                "count": f"{weak_n + missing_n}/{blind_completed}",
                "width": pct(weak_n + missing_n, blind_completed),
                "tone": "weak",
            },
        ],
        "focusCases": focus_cases,
        "candidates": candidates,
        "sources": [
            "evopro/validation/cascade/docking_campaign_hybrid_blended/campaign_manifest.csv",
            "evopro/validation/cascade/cabsdock_phase2_native_vegfa_hybrid_missing12/phase2_manifest.json",
            "evopro/validation/cascade/validation_completion/panel12_native_blind_pose_agreement_best_clusters.csv",
        ],
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
    print(f"JSON: {OUT_JSON}")
    print(
        f"local {local_completed}/{blind_total} | blind {blind_completed}/{blind_total} | "
        f"close {close_n} | site {site_n} | dual {dual_n}"
    )


if __name__ == "__main__":
    main()
