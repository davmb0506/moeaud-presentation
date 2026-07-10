#!/usr/bin/env python3
"""Construye un JSON local para las slides de HADDOCK3 del panel principal.

Integra:
- piloto Tier 1 (2 candidatos),
- oleada primaria (10 candidatos),
- control nativo de redocking,
- y el conteo operativo documentado en Stage 9.
"""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path

ROOT = Path("/home/david/Documents/Dev/Tesis/EvoPro_Mod/evopro/validation/cascade")
PRES = Path("/home/david/Documents/Dev/Tesis/moeaud-presentation")
PILOT_SUMMARY_DIR = ROOT / "haddock3_pilot" / "summary"
PRIMARY_SUMMARY_DIR = ROOT / "haddock3_primary_wave" / "summary"
CONTROL_MD = ROOT / "haddock3_native_control" / "native_redocking_summary.md"
STAGE9_MD = ROOT / "docking_campaign" / "stage9_docking_campaign_summary.md"
OUT = PRES / "src" / "data" / "haddockPrimaryWave.json"

KEY_IDS = {
    "ipsae_sc_nomech__004_cand_0001",
    "ipsae_sc_nomech__008_cand_0003",
    "composite_tmscore_mech__001_cand_0014",
    "interface_pae_plddt_mech__000_cand_0037",
}


def parse_float(text: str) -> float:
    return float(text.strip().replace("`", "").replace("A", "").replace("Å", ""))


def read_wave_counts(summary_dir: Path) -> dict[str, int]:
    content = (summary_dir / "haddock_results_summary.md").read_text()
    manifest = re.search(r"Candidate rows in manifest: `(\d+)`", content)
    completed = re.search(r"Completed HADDOCK results: `(\d+)`", content)
    if not manifest or not completed:
        raise RuntimeError(f"No se pudieron extraer conteos de {summary_dir}")
    return {
        "manifest_rows": int(manifest.group(1)),
        "completed_results": int(completed.group(1)),
    }


def read_stage9_counts() -> dict[str, int]:
    content = STAGE9_MD.read_text()

    def grab(pattern: str) -> int:
        match = re.search(pattern, content)
        if not match:
            raise RuntimeError(f"No se pudo extraer `{pattern}` de Stage 9.")
        return int(match.group(1))

    return {
        "panel_total": grab(r"Tier 1 pilot: (\d+)") + grab(r"Remaining primary panel: (\d+)"),
        "pilot_total": grab(r"Tier 1 pilot: (\d+)"),
        "primary_total": grab(r"Remaining primary panel: (\d+)"),
    }


def read_wave_csv(summary_dir: Path, wave: str, source_label: str) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    with (summary_dir / "haddock_results_summary.csv").open() as fh:
        reader = csv.DictReader(fh)
        for raw in reader:
            rows.append(
                {
                    "repred_id": raw["repred_id"],
                    "group": raw["grupo"],
                    "formulation": raw["formulation"],
                    "condition": raw["condition"],
                    "best_score": float(raw["best_score"]),
                    "best_model_path": raw["best_model_path"],
                    "best_model_label": raw["best_model_label"],
                    "binder_seq": raw["binder_seq"],
                    "competition": float(raw["competition"]),
                    "epitope_overlap": float(raw["epitope_overlap"]),
                    "sasa_epitope": float(raw["sasa_epitope"]),
                    "global_rank": int(raw["global_rank"]),
                    "group_rank": int(raw["group_rank"]),
                    "complex_iptm": float(raw["complex_iptm"]),
                    "complex_interface_pae": float(raw["complex_interface_pae"]),
                    "mono_mean_plddt": float(raw["mono_mean_plddt"]),
                    "wave": wave,
                    "wave_label": source_label,
                    "highlight": raw["repred_id"] in KEY_IDS,
                }
            )
    return rows


def read_competition_csv() -> dict[str, dict[str, float]]:
    rows: dict[str, dict[str, float]] = {}
    with (PRIMARY_SUMMARY_DIR / "competition_metrics" / "competition_epitope_metrics.csv").open() as fh:
        reader = csv.DictReader(fh)
        for raw in reader:
            rows[raw["candidate_id"]] = {
                "epitope_overlap": float(raw["epitope_overlap"]),
                "sasa_epitope": float(raw["sasa_epitope"]),
                "competition": float(raw["competition"]),
            }
    return rows


def read_control_md() -> dict[str, object]:
    content = CONTROL_MD.read_text()

    def grab(pattern: str) -> str:
        match = re.search(pattern, content)
        if not match:
            raise RuntimeError(f"No se pudo extraer `{pattern}` del control nativo.")
        return match.group(1)

    return {
        "status": grab(r"Status: `([^`]+)`"),
        "best_emref_model": grab(r"Best `4_emref` model: `([^`]+)`"),
        "best_emref_score": float(grab(r"Best `4_emref` score: `([^`]+)`")),
        "vegfa_alignment_ca_rmsd": parse_float(
            grab(r"VEGFA alignment CA RMSD: `([^`]+)` over")
        ),
        "vegfr2_aligned_ca_rmsd": parse_float(
            grab(r"VEGFR2 aligned CA RMSD: `([^`]+)` over")
        ),
        "vegfr2_interface_ca_rmsd": parse_float(
            grab(r"VEGFR2 interface-only CA RMSD: `([^`]+)` over")
        ),
        "limitation": (
            "No es un benchmark ciego: usa separación de cadenas del complejo nativo "
            "y restricciones de interfaz derivadas de la misma estructura."
        ),
        "source_note": (
            "Control estructural interno del protocolo; no debe leerse como "
            "benchmark ciego fuerte."
        ),
    }


def main() -> None:
    pilot_counts = read_wave_counts(PILOT_SUMMARY_DIR)
    primary_counts = read_wave_counts(PRIMARY_SUMMARY_DIR)
    stage9_counts = read_stage9_counts()
    competition_rows = read_competition_csv()
    control = read_control_md()

    candidates = []
    candidates.extend(read_wave_csv(PILOT_SUMMARY_DIR, "pilot_tier1", "Pilot Tier 1"))
    candidates.extend(read_wave_csv(PRIMARY_SUMMARY_DIR, "primary_wave", "Primary wave"))

    for row in candidates:
        repred_id = str(row["repred_id"])
        if row["wave"] == "primary_wave":
            comp = competition_rows.get(repred_id)
            if comp is None:
                raise RuntimeError(f"Falta competition_epitope_metrics para {repred_id}")
            row["competition"] = comp["competition"]
            row["epitope_overlap"] = comp["epitope_overlap"]
            row["sasa_epitope"] = comp["sasa_epitope"]
        else:
            # El piloto no tiene una capa adicional validada de competencia más allá
            # del resumen consolidado existente; se conserva esa evidencia tal cual.
            row["competition"] = float(row["competition"])
            row["epitope_overlap"] = float(row["epitope_overlap"])
            row["sasa_epitope"] = float(row["sasa_epitope"])

    out = {
        "summary": {
            "panel_total": stage9_counts["panel_total"],
            "pilot_total": stage9_counts["pilot_total"],
            "primary_total": stage9_counts["primary_total"],
            "pilot_completed": pilot_counts["completed_results"],
            "primary_completed": primary_counts["completed_results"],
            "completed_total": pilot_counts["completed_results"] + primary_counts["completed_results"],
        },
        "candidates": candidates,
        "control": control,
        "notes": {
            "sasa_epitope_non_discriminative": True,
            "sasa_epitope_note": (
                "La métrica sasa_epitope no discriminó en esta oleada "
                "(0.0 en todos los casos)."
            ),
            "pilot_note": (
                "Las dos corridas piloto validaron el protocolo y forman parte del "
                "total de 12 candidatos evaluados, pero la interpretación comparativa "
                "principal de competencia/epítopo se centra en la oleada primaria."
            ),
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
    print(f"JSON escrito en {OUT}")


if __name__ == "__main__":
    main()
