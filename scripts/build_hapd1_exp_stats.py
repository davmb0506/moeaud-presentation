#!/usr/bin/env python3
"""HA-PD1: figura + Mann–Whitney bi/uni sobre overall_score del GA.

Fuente: src/data/hapd1Variantes.json (mínimo acumulado de overall_score por run).
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import matplotlib as mpl
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import numpy as np
from scipy.stats import kruskal, mannwhitneyu

EVOPRO = Path("/home/david/Documents/Dev/Tesis/EvoPro_Mod/evopro")
RUN = EVOPRO / "run" / "outputs_hapd1_mono_60"
TEMP_RUN = EVOPRO / "run" / "outputs_hapd1_mono_60_temp_v3"
PRES = Path(__file__).resolve().parents[1]
VAR = PRES / "src" / "data" / "hapd1Variantes.json"
OUT_JSON = PRES / "src" / "data" / "hapd1Stats.json"
OUT_PNG = PRES / "public" / "graf_hapd1_stats_3arms.png"

C_MUT = "#2b6ef2"
C_BOTH = "#e8833a"
C_TEMP = "#1d8a7a"
GEN_BUDGET = 60

ARM_META = {
    "mutation": {
        "label": "Solo mutación",
        "color": C_MUT,
        "root": RUN,
        "prefix": "mutation",
    },
    "base": {
        "label": "Mutación + cruza",
        "color": C_BOTH,
        "root": RUN,
        "prefix": "base",
    },
    "temp": {
        "label": "Temp. variable",
        "color": C_TEMP,
        "root": TEMP_RUN,
        "prefix": "temp",
    },
}
ORDER = ("mutation", "base", "temp")


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


def parse_best_per_iter(scores_path: Path) -> dict[int, float]:
    text = scores_path.read_text(errors="replace")
    parts = re.split(r"(?=^Iteration\s+\d+)", text, flags=re.M)
    best: dict[int, float] = {}
    for part in parts:
        m = re.match(r"^Iteration\s+(\d+)\t,,([^\n]*)\n", part)
        if not m:
            continue
        it = int(m.group(1))
        header = m.group(2).split(",")
        vals_it: list[float] = []
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
            data = dict(
                zip(header, [_safe_float(x) for x in post.lstrip(",").split(",")])
            )
            overall = data.get("overall_score", overall_pre)
            if overall is None:
                overall = overall_pre
            if overall is not None:
                vals_it.append(float(overall))
        if vals_it:
            best[it] = min(vals_it)
    return best


def cumulative_min_curve(best_per_iter: dict[int, float], n_gen: int) -> np.ndarray:
    out = np.full(n_gen, np.nan)
    running = np.inf
    for g in range(1, n_gen + 1):
        if g in best_per_iter:
            running = min(running, best_per_iter[g])
        if running < np.inf:
            out[g - 1] = running
    last = np.nan
    for i in range(n_gen):
        if np.isnan(out[i]):
            out[i] = last
        else:
            last = out[i]
    return out


def load_arm_curves(root: Path, prefix: str) -> np.ndarray:
    curves = []
    for i in range(1, 11):
        sp = root / f"{prefix}_{i:02d}" / "outputs" / "scores.csv"
        if not sp.exists():
            continue
        best = parse_best_per_iter(sp)
        if not best:
            continue
        curves.append(cumulative_min_curve(best, GEN_BUDGET))
    return np.vstack(curves) if curves else np.empty((0, GEN_BUDGET))


def stars(p: float) -> str:
    if p < 0.001:
        return "***"
    if p < 0.01:
        return "**"
    if p < 0.05:
        return "*"
    return "n.s."


def mw_pair(
    a: np.ndarray,
    b: np.ndarray,
    *,
    contrast: str,
    label_a: str,
    label_b: str,
) -> list[dict]:
    _, p_bi = mannwhitneyu(a, b, alternative="two-sided")
    _, p_uni = mannwhitneyu(a, b, alternative="less")
    return [
        {
            "contrast": contrast,
            "test": "Mann-Whitney U (bilateral)",
            "h0": f"{label_a} obtiene valores de aptitud iguales que {label_b}.",
            "h1": f"{label_a} obtiene valores de aptitud distintos a {label_b}.",
            "p": float(p_bi),
            "p_fmt": f"{float(p_bi):.6g}",
            "sig": stars(float(p_bi)),
            "reject": bool(p_bi < 0.05),
        },
        {
            "contrast": contrast,
            "test": "Mann-Whitney U (unilateral)",
            "h0": (
                f"{label_a} obtiene valores de aptitud iguales o peores "
                f"que {label_b}."
            ),
            "h1": (
                f"{label_a} obtiene valores de aptitud mejores que {label_b}."
            ),
            "p": float(p_uni),
            "p_fmt": f"{float(p_uni):.6g}",
            "sig": stars(float(p_uni)),
            "reject": bool(p_uni < 0.05),
        },
    ]


def build_headline(
    *,
    both_vs_mut_bi: bool,
    both_vs_mut_uni: bool,
    temp_vs_both_bi: bool,
    temp_vs_both_uni: bool,
) -> list[dict]:
    parts: list[dict] = []
    if both_vs_mut_bi or both_vs_mut_uni:
        parts += [
            {"text": "mutación + cruza", "color": C_BOTH},
            {"text": " supera a ", "color": None},
            {"text": "solo mutación", "color": C_MUT},
        ]
    else:
        parts += [
            {"text": "mutación + cruza", "color": C_BOTH},
            {"text": " no se separa de ", "color": None},
            {"text": "solo mutación", "color": C_MUT},
        ]
    parts.append({"text": "; ", "color": None})
    if temp_vs_both_bi or temp_vs_both_uni:
        parts += [
            {"text": "temp. variable", "color": C_TEMP},
            {"text": " supera a ", "color": None},
            {"text": "mutación + cruza", "color": C_BOTH},
        ]
    else:
        parts += [
            {"text": "temp. variable", "color": C_TEMP},
            {"text": " no se separa de ", "color": None},
            {"text": "mutación + cruza", "color": C_BOTH},
        ]
    parts.append({"text": " (n = 10 / brazo).", "color": None})
    return parts


def main() -> None:
    var = json.loads(VAR.read_text())
    arms_json = {a["id"]: a for a in var["arms"]}
    series = {
        aid: np.asarray(arms_json[aid]["values"], dtype=float) for aid in ORDER
    }
    mut, both, temp = series["mutation"], series["base"], series["temp"]

    kw = kruskal(mut, both, temp)
    tests: list[dict] = []
    tests.append(
        {
            "contrast": "Tres variantes",
            "test": "Kruskal–Wallis",
            "h0": "Las tres variantes tienen la misma distribución de aptitud.",
            "h1": "Al menos una variante difiere en la distribución de aptitud.",
            "p": float(kw.pvalue),
            "p_fmt": f"{float(kw.pvalue):.6g}",
            "sig": stars(float(kw.pvalue)),
            "reject": bool(kw.pvalue < 0.05),
        }
    )
    tests += mw_pair(
        both,
        mut,
        contrast="Mut+cruza vs Solo mutación",
        label_a="Mutación + cruza",
        label_b="solo mutación",
    )
    tests += mw_pair(
        temp,
        both,
        contrast="Temp. variable vs Mut+cruza",
        label_a="Temp. variable",
        label_b="mutación + cruza",
    )

    curves = {
        aid: load_arm_curves(ARM_META[aid]["root"], ARM_META[aid]["prefix"])
        for aid in ORDER
    }
    gens = np.arange(1, GEN_BUDGET + 1)
    means = {aid: np.nanmean(curves[aid], axis=0) for aid in ORDER}

    mpl.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "axes.labelsize": 10,
            "xtick.labelsize": 8.5,
            "ytick.labelsize": 9,
            "legend.fontsize": 8,
            "axes.spines.top": False,
            "axes.spines.right": False,
        }
    )

    def _neg_log_axis(ax: plt.Axes, y_abs: np.ndarray) -> None:
        y_abs = np.asarray(y_abs, dtype=float)
        y_abs = y_abs[np.isfinite(y_abs) & (y_abs > 0)]
        lo = float(np.min(y_abs)) * 0.985
        hi = float(np.max(y_abs)) * 1.015
        tick_start = int(np.floor(lo / 5.0) * 5)
        tick_end = int(np.ceil(hi / 5.0) * 5)
        ticks = np.arange(tick_start, tick_end + 1, 5, dtype=float)
        ticks = ticks[(ticks >= lo) & (ticks <= hi)]
        if ticks.size < 3:
            ticks = np.linspace(lo, hi, 5)
        ax.set_yscale("log")
        ax.set_ylim(lo, hi)
        ax.invert_yaxis()
        ax.yaxis.set_major_locator(mticker.FixedLocator(ticks))
        ax.yaxis.set_minor_locator(mticker.NullLocator())
        ax.yaxis.set_major_formatter(
            mticker.FuncFormatter(lambda y, _pos: f"{-y:.0f}")
        )

    fig, (ax0, ax1) = plt.subplots(1, 2, figsize=(10.6, 3.9), constrained_layout=True)
    data = [-series[a] for a in ORDER]
    labels = [ARM_META[a]["label"] for a in ORDER]
    colors = [ARM_META[a]["color"] for a in ORDER]
    bp = ax0.boxplot(
        data,
        tick_labels=labels,
        patch_artist=True,
        widths=0.55,
        showfliers=True,
        medianprops=dict(color="#1e293b", linewidth=1.6),
        whiskerprops=dict(linewidth=1.1),
        capprops=dict(linewidth=1.1),
        flierprops=dict(
            marker="o", markersize=4, markerfacecolor="#64748b", alpha=0.7
        ),
    )
    for patch, color in zip(bp["boxes"], colors):
        patch.set_facecolor(color)
        patch.set_alpha(0.55)
        patch.set_edgecolor(color)
    ax0.set_ylabel("best_score (escala log)")
    ax0.set_title("Mejor puntaje por grupo", fontweight="bold", fontsize=11)
    ax0.grid(True, axis="y", which="major", alpha=0.25, lw=0.6)
    _neg_log_axis(ax0, np.concatenate(data))

    mean_abs = {aid: -means[aid] for aid in ORDER}
    for aid in ORDER:
        ax1.plot(
            gens,
            mean_abs[aid],
            color=ARM_META[aid]["color"],
            lw=2.0,
            label=ARM_META[aid]["label"],
        )
    ax1.set_xlabel("Generación")
    ax1.set_ylabel("Best score (escala log)")
    ax1.set_title("Mínimo acumulado promedio", fontweight="bold", fontsize=11)
    ax1.legend(
        frameon=True, fancybox=False, edgecolor="#e2e8f0", loc="lower right"
    )
    ax1.grid(True, which="major", alpha=0.25, lw=0.6)
    ax1.set_xlim(1, GEN_BUDGET)
    _neg_log_axis(ax1, np.concatenate([mean_abs[a] for a in ORDER]))

    fig.savefig(OUT_PNG, dpi=200, bbox_inches="tight", facecolor="white")
    plt.close(fig)

    out = {
        "meta": {
            "n_per_arm": 10,
            "generation_budget": GEN_BUDGET,
            "score": "cumulative minimum overall_score per run",
            "sense": "min",
            "figure": "/graf_hapd1_stats_3arms.png",
            "contrasts": [
                "Tres variantes (Kruskal–Wallis)",
                "Mutación + cruza vs Solo mutación",
                "Temp. variable vs Mutación + cruza",
            ],
            "note": (
                "overall_score del GA. Mann–Whitney U bilateral y unilateral "
                "en dos contrastes, más Kruskal–Wallis global."
            ),
            "kruskal_wallis": {
                "H": float(kw.statistic),
                "p": float(kw.pvalue),
                "significant_0_05": bool(kw.pvalue < 0.05),
            },
        },
        "groups": {
            aid: {
                "label": ARM_META[aid]["label"],
                "color": ARM_META[aid]["color"],
                "n": int(len(series[aid])),
                "mean": float(series[aid].mean()),
                "std": float(series[aid].std(ddof=1)),
                "median": float(np.median(series[aid])),
            }
            for aid in ORDER
        },
        "headline": {
            "text_parts": build_headline(
                both_vs_mut_bi=bool(tests[1]["reject"]),
                both_vs_mut_uni=bool(tests[2]["reject"]),
                temp_vs_both_bi=bool(tests[3]["reject"]),
                temp_vs_both_uni=bool(tests[4]["reject"]),
            ),
        },
        "tests": tests,
        "sig_key": "* p < 0.05 · ** p < 0.01 · *** p < 0.001 · n.s. = no significativo",
    }
    OUT_JSON.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {OUT_PNG}")
    print(f"Wrote {OUT_JSON}")
    print(f"KW H={kw.statistic:.3f} p={kw.pvalue:.4g}")
    for t in tests:
        print(f"  {t['contrast']} | {t['test']}: p={t['p_fmt']} {t['sig']}")


if __name__ == "__main__":
    main()
