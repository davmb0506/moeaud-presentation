#!/usr/bin/env python3
"""Kruskal–Wallis + Mann–Whitney (Holm) over HA-PD1 arm scores → hapd1Stats.json."""

from __future__ import annotations

import json
from itertools import combinations
from pathlib import Path

from scipy.stats import kruskal, mannwhitneyu

PRES = Path(__file__).resolve().parents[1]
SRC = PRES / "src" / "data" / "hapd1Variantes.json"
OUT = PRES / "src" / "data" / "hapd1StatsKw.json"

ARM_ORDER = ("mutation", "base", "temp")
PAIR_LABELS = {
    ("mutation", "base"): "Mutación vs Mut+cruz",
    ("mutation", "temp"): "Mutación vs Temp. variable",
    ("base", "temp"): "Mut+cruz vs Temp. variable",
}


def holm(pvals: list[float]) -> list[float]:
    m = len(pvals)
    order = sorted(range(m), key=lambda i: pvals[i])
    adj = [0.0] * m
    running = 0.0
    for rank, i in enumerate(order):
        # rank 0 → multiply by m, rank 1 → m-1, ...
        val = pvals[i] * (m - rank)
        running = max(running, val)
        adj[i] = min(1.0, running)
    return adj


def rank_biserial(u: float, n1: int, n2: int) -> float:
    return 1.0 - 2.0 * u / (n1 * n2)


def main() -> None:
    data = json.loads(SRC.read_text())
    arms = {a["id"]: a for a in data["arms"]}
    series = {aid: list(map(float, arms[aid]["values"])) for aid in ARM_ORDER}

    kw = kruskal(*[series[a] for a in ARM_ORDER])
    pairs_raw = []
    for a, b in combinations(ARM_ORDER, 2):
        A, B = series[a], series[b]
        u, p = mannwhitneyu(A, B, alternative="two-sided")
        pairs_raw.append(
            {
                "a": a,
                "b": b,
                "label": PAIR_LABELS[(a, b)],
                "n_a": len(A),
                "n_b": len(B),
                "mean_a": sum(A) / len(A),
                "mean_b": sum(B) / len(B),
                "median_a": sorted(A)[len(A) // 2],
                "median_b": sorted(B)[len(B) // 2],
                "U": float(u),
                "p": float(p),
                "rank_biserial": float(rank_biserial(float(u), len(A), len(B))),
            }
        )
    p_holm = holm([p["p"] for p in pairs_raw])
    for p, ph in zip(pairs_raw, p_holm):
        p["p_holm"] = float(ph)
        p["significant_0_05"] = p["p_holm"] < 0.05
        # lower score is better
        p["better"] = p["a"] if p["mean_a"] < p["mean_b"] else p["b"]

    out = {
        "meta": {
            "source": "hapd1Variantes.json",
            "score": data["meta"].get("score_definition"),
            "generation_budget": data["meta"].get("generation_budget"),
            "replicas_per_arm": data["meta"].get("replicas_per_arm"),
            "sense": "min",
            "note": "Menor puntaje = mejor. Pruebas no paramétricas (n=10/brazo).",
            "run_root": data["meta"].get("run_root"),
        },
        "arms": [
            {
                "id": aid,
                "label": arms[aid]["label"],
                "shortLabel": arms[aid]["shortLabel"],
                "color": arms[aid]["color"],
                "n": len(series[aid]),
                "mean": float(sum(series[aid]) / len(series[aid])),
                "std": float(arms[aid]["std"]),
                "median": float(sorted(series[aid])[len(series[aid]) // 2]),
                "min": float(min(series[aid])),
                "max": float(max(series[aid])),
            }
            for aid in ARM_ORDER
        ],
        "kruskal_wallis": {
            "H": float(kw.statistic),
            "p": float(kw.pvalue),
            "significant_0_05": bool(kw.pvalue < 0.05),
            "df": 2,
        },
        "pairwise_mann_whitney": pairs_raw,
        "reading": _reading(kw.pvalue, pairs_raw),
    }
    OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {OUT}")
    print(f"KW H={out['kruskal_wallis']['H']:.3f} p={out['kruskal_wallis']['p']:.4g}")
    for p in pairs_raw:
        print(
            f"  {p['label']}: p={p['p']:.4g} p_Holm={p['p_holm']:.4g} "
            f"r_rb={p['rank_biserial']:+.2f} better={p['better']}"
        )


def _reading(kw_p: float, pairs: list[dict]) -> str:
    if kw_p >= 0.05:
        return (
            "Kruskal–Wallis no rechaza igualdad de distribuciones entre brazos "
            "(α = 0.05): las tres variantes no se separan de forma concluyente "
            "en el mejor puntaje por réplica."
        )
    sig = [p for p in pairs if p["p_holm"] < 0.05]
    if not sig:
        return (
            "Hay señal global (Kruskal–Wallis), pero tras Holm ningún par "
            "queda significativo a α = 0.05."
        )
    bits = []
    for p in sig:
        better_lab = next(
            a["shortLabel"]
            for a in [
                {"id": "mutation", "shortLabel": "Mutación"},
                {"id": "base", "shortLabel": "Mut+cruz"},
                {"id": "temp", "shortLabel": "Temp."},
            ]
            if a["id"] == p["better"]
        )
        bits.append(f"{p['label']} (mejor media: {better_lab})")
    return "Pares significativos tras Holm: " + "; ".join(bits) + "."


if __name__ == "__main__":
    main()
