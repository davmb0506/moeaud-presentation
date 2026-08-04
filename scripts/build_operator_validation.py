#!/usr/bin/env python3
"""Build operatorValidation.json for the moeaud presentation (exp02 champions).

Reads artefacts from EvoPro_Mod/evopro/validation/operator_experiment/
and writes src/data/operatorValidation/operatorValidation.json
(separate from bindingValidation.json / VEGF-A MOEA-UD).
"""
from __future__ import annotations

import csv
import json
import statistics as st
from datetime import date
from pathlib import Path

try:
    from scipy.stats import mannwhitneyu
except ImportError:
    mannwhitneyu = None

EVOPRO = Path("/home/david/Documents/Dev/Tesis/EvoPro_Mod")
EXP02 = EVOPRO / "evopro/validation/operator_experiment"
PRES = Path("/home/david/Documents/Dev/Tesis/moeaud-presentation")
OUT_DIR = PRES / "src/data/operatorValidation"
OUT_JSON = OUT_DIR / "operatorValidation.json"


def _f(x):
    if x in (None, "", "None"):
        return None
    try:
        return float(x)
    except (TypeError, ValueError):
        return x


def design_score_stats():
    rows = list(csv.DictReader(open(EXP02 / "best_sequences.csv")))
    out = {}
    for key, a, b in [("cohort_60_gen", "base_60", "both_60"),
                      ("cohort_500_gen", "base_500", "temp_500")]:
        A = [float(r["best_score"]) for r in rows if r["variant"] == a]
        B = [float(r["best_score"]) for r in rows if r["variant"] == b]
        block = {
            "base_variant": a,
            "modified_variant": b,
            "n_base": len(A),
            "n_modified": len(B),
            "mean_base": round(st.mean(A), 2),
            "mean_modified": round(st.mean(B), 2),
            "delta_modified_minus_base": round(st.mean(B) - st.mean(A), 2),
            "winner_design_score": b if st.mean(B) < st.mean(A) else a,
        }
        if mannwhitneyu and A and B:
            U, p = mannwhitneyu(A, B, alternative="two-sided")
            block["mann_whitney_p"] = float(f"{p:.6g}")
            block["rank_biserial"] = round(1 - 2 * U / (len(A) * len(B)), 2)
        out[key] = block
    return out


def champions():
    rows = list(csv.DictReader(open(EXP02 / "cascade_champions_summary.csv")))
    labels = {
        "base_60": "Base (60 gen)",
        "both_60": "Both — crossover+mutación (60 gen)",
        "base_500": "Base (500 gen)",
        "temp_500": "Temp variable ProteinMPNN (500 gen)",
    }
    ch = []
    for r in rows:
        ch.append({
            "variant": r["variant"],
            "label": labels.get(r["variant"], r["variant"]),
            "run_id": r["run_id"],
            "design_score": _f(r["design_score"]),
            "tier1_protparam": {
                "passes": r["passes_protparam"] in ("True", True, "true"),
                "instability_index": _f(r["instability_index"]),
                "gravy": _f(r["gravy"]),
            },
            "tier2_geometry": {
                "delta_sasa": _f(r["delta_sasa"]),
                "n_contacts": int(float(r["n_contacts"])) if r["n_contacts"] else None,
                "passes": r["passes_geometry"] in ("True", True, "true"),
            },
            "tier4_prodigy": {
                "dG_kcal_mol": _f(r["prodigy_dG"]),
                "ICs": _f(r["prodigy_ICs"]),
            },
            "energy_boltz": {
                "ddg": _f(r["ddg"]),
                "mmgbsa": _f(r["mmgbsa"]),
                "sc": _f(r["sc"]),
                "iptm": _f(r["iptm"]),
            },
            "haddock3": {
                "score": _f(r["haddock_score"]),
                "bsa": _f(r["haddock_bsa"]),
                "air": _f(r["haddock_air"]),
            },
        })
    return ch


def head_to_head(champs: list[dict]) -> dict:
    by = {c["variant"]: c for c in champs}
    pairs = {}
    for a, b, cohort in [("base_60", "both_60", "60_gen"),
                           ("base_500", "temp_500", "500_gen")]:
        if a not in by or b not in by:
            continue
        metrics = {}
        for name, path_a, path_b, lower_better in [
            ("design_score", "design_score", "design_score", True),
            ("haddock_score", "haddock3", "score", True),
            ("prodigy_dG", "tier4_prodigy", "dG_kcal_mol", True),
            ("ddg", "energy_boltz", "ddg", True),
            ("iptm", "energy_boltz", "iptm", False),
        ]:
            if name == "design_score":
                va, vb = by[a][name], by[b][name]
            else:
                va = by[a][path_a][path_b]
                vb = by[b][path_a][path_b]
            if va is None or vb is None:
                continue
            winner = (a if va < vb else b) if lower_better else (a if va > vb else b)
            metrics[name] = {a: va, b: vb, "winner": winner,
                             "delta": round(vb - va, 3) if lower_better else round(va - vb, 3)}
        pairs[cohort] = {"base": a, "modified": b, "metrics": metrics}
    return pairs


def haddock_ranking(champs: list[dict]) -> list[dict]:
    ranked = sorted(
        [{"variant": c["variant"], "label": c["label"], "haddock_score": c["haddock3"]["score"]}
         for c in champs if c["haddock3"]["score"] is not None],
        key=lambda x: x["haddock_score"],
    )
    for i, r in enumerate(ranked, 1):
        r["rank"] = i
    return ranked


def build_document() -> dict:
    ch = champions()
    return {
        "meta": {
            "experiment_id": "exp02_operator_validation",
            "title": "Validación en cascada — campeones base / both / temp-variable",
            "generated": str(date.today()),
            "data_dir": "src/data/operatorValidation",
            "evopro_source": "evopro/validation/operator_experiment",
            "objective_type": "mono-objetivo (overall_score EvoPro)",
            "target": "Receptor Ig del ejemplo default de EvoPro (~200 aa); NO es VEGF-A",
            "related_presentation_data": {
                "operadores_convergence": "src/data/operadoresData.json",
                "moea_ud_binding": "src/data/bindingValidation.json",
            },
            "n_champions": 4,
            "not_applicable": [
                "competition_score (VEGFR2)",
                "epitope_coverage (VEGF-A)",
                "blind CABSdock (pendiente)",
                "repredicción AF2 independiente (pendiente)",
            ],
        },
        "cascade_tiers_applied": [
            "T1 ProtParam (developability)",
            "T2 Geometría de interfaz (ΔSASA, contactos; pose Boltz)",
            "T4 PRODIGY (afinidad predicha)",
            "Energía Rosetta ddG + MM-GBSA (pose Boltz)",
            "HADDOCK3 local guiado por interfaz del seed Boltz",
        ],
        "design_score_comparison": design_score_stats(),
        "champions": ch,
        "haddock_ranking": haddock_ranking(ch),
        "head_to_head": head_to_head(ch),
        "conclusion": [
            "Los operadores both y temp mejoran el fitness de diseño (overall_score) frente a base con significancia estadística.",
            "Ese fitness NO se traduce en mejor unión física: en HADDOCK3 y PRODIGY, los campeones de base superan a both/temp (opuesto al score de diseño).",
            "El campeón base_60 explota el score (secuencia poli-E/R, falla ProtParam, ipTM=0.09) pero obtiene el mejor HADDOCK score.",
            "Interpretación: la búsqueda (operadores) funciona; el objetivo escalar de EvoPro no es un proxy fiable de afinidad.",
            "Complementario al bloque MOEA-UD / VEGF-A en bindingValidation.json.",
        ],
        "sources": [
            "evopro/validation/operator_experiment/best_sequences.csv",
            "evopro/validation/operator_experiment/cascade_champions_summary.csv",
            "evopro/validation/operator_experiment/haddock_results.csv",
            "evopro/validation/operator_experiment/energy_results.csv",
            "evopro/validation/operator_experiment/RESULTS_CASCADE.md",
        ],
    }


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    doc = build_document()
    OUT_JSON.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {OUT_JSON}")
    print(f"  champions: {len(doc['champions'])}")


if __name__ == "__main__":
    main()
