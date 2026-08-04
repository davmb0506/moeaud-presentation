#!/usr/bin/env python3
"""Figura académica: tiempos no-AF2 por fase (ipSAE/SC), MA vs Base.

Estilo alineado a las curvas de hipervolumen del mismo deck (matplotlib
clásico, ejes, leyenda, sin layout de infografía).
"""
from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

OUT = Path(__file__).resolve().parents[1] / "public" / "figures" / "ablation_mechanism_overhead.png"

MECH = "#2E6B8E"
NOMECH = "#F28E2B"
INK = "#1a1a1a"
MUTED = "#555555"
GRID = "#dddddd"

# Medianas TIMING ipSAE/SC, n=10, 200 gen. (minutos)
PHASES = ["Inyección", "Descendencia\n(MPNN)", "Selección\nMOEA-UD"]
MA = np.array([0.5, 6.0, 34.0])
BASE = np.array([0.0, 20.0, 45.0])


def main() -> None:
    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "axes.titlesize": 12,
            "axes.labelsize": 10,
            "xtick.labelsize": 9.5,
            "ytick.labelsize": 9,
            "legend.fontsize": 9,
            "figure.facecolor": "white",
            "axes.facecolor": "white",
            "axes.edgecolor": "#888888",
            "axes.linewidth": 0.8,
            "text.color": INK,
            "axes.labelcolor": INK,
            "xtick.color": INK,
            "ytick.color": INK,
        }
    )

    fig, ax = plt.subplots(figsize=(7.6, 4.2), dpi=200)

    x = np.arange(len(PHASES))
    w = 0.36
    ax.bar(x - w / 2, MA, w, color=MECH, label="MA", zorder=3, edgecolor="none")
    ax.bar(x + w / 2, BASE, w, color=NOMECH, label="Base", zorder=3, edgecolor="none")

    for i, (m, b) in enumerate(zip(MA, BASE)):
        ax.text(i - w / 2, m + 0.8, f"{m:g}", ha="center", va="bottom", fontsize=8.5, color=MECH)
        ax.text(
            i + w / 2,
            (b + 0.8) if b > 0 else 0.8,
            f"{b:g}",
            ha="center",
            va="bottom",
            fontsize=8.5,
            color=NOMECH,
        )

    # Anotación sobria en inyección (sin caja “hero”)
    ax.annotate(
        "Δ = +0.5 min\n(exclusivo de MA)",
        xy=(0 - w / 2, 0.5),
        xytext=(0.55, 18),
        fontsize=8.5,
        color=MECH,
        ha="left",
        arrowprops=dict(arrowstyle="->", color=MECH, lw=0.9),
    )

    ax.set_xticks(x)
    ax.set_xticklabels(PHASES)
    ax.set_ylabel("Minutos (mediana, 200 generaciones)")
    ax.set_ylim(0, 52)
    ax.set_title("Tiempos no-AF2 por fase — ipSAE / SC", pad=10)
    ax.yaxis.grid(True, color=GRID, lw=0.7, zorder=0)
    ax.set_axisbelow(True)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.legend(frameon=False, loc="upper left")

    fig.text(
        0.5,
        0.02,
        "Medianas TIMING · n = 10 réplicas · sin tiempo de predicción AF2. "
        "Descendencia y selección son infraestructura común (no miden el sobrecosto de MA).",
        ha="center",
        va="bottom",
        fontsize=7.5,
        color=MUTED,
    )

    fig.tight_layout(rect=(0, 0.06, 1, 1))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT, bbox_inches="tight", pad_inches=0.12)
    fig.savefig(OUT.with_suffix(".pdf"), bbox_inches="tight", pad_inches=0.12)
    plt.close(fig)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
