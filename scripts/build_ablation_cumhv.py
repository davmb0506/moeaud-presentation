#!/usr/bin/env python3
"""Genera curvas de hipervolumen acumulado para la ablacion de mecanismos.

Lee los `hypervolume_history.log` por replica, convierte el HV a acumulado
best-so-far, conserva solo corridas completas y alinea las replicas mediante
interpolacion lineal sobre una malla comun de generaciones.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib")

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.lines import Line2D
from matplotlib.patches import Patch

REPO = Path(__file__).resolve().parents[1]
RUN = REPO.parent / "EvoPro_Mod" / "evopro" / "run"
OUT_DIR = REPO / "public" / "figures"

MIN_COMPLETE_GEN = 195
MECH = "#2E6B8E"
NO_MECH = "#F28E2B"
GRID = "#D8DDE3"
SPINE = "#AEB6BF"
TEXT = "#25313C"


@dataclass(frozen=True)
class PairSpec:
    formulation: str
    mech_dir: Path
    no_mech_dir: Path
    filename: str


@dataclass
class ReplicaSeries:
    path: Path
    generations: np.ndarray
    hv_accum: np.ndarray


SPECS = [
    PairSpec(
        formulation="Interface-PAE / pLDDT",
        mech_dir=RUN / "outputs_moeaud_interface_pae_plddt",
        no_mech_dir=RUN / "outputs_moeaud_interface_pae_plddt_10_no_mech",
        filename="ablation_cumhv_interface_pae_plddt.png",
    ),
    PairSpec(
        formulation="Composite / TM-score",
        mech_dir=RUN / "outputs_moeaud_composite_tmscore (2)",
        no_mech_dir=RUN / "outputs_moeaud_composite_tmscore_final_10_no_mech_v2",
        filename="ablation_cumhv_composite_tmscore.png",
    ),
    PairSpec(
        formulation="ipSAE / SC",
        mech_dir=RUN / "outputs_moeaud_ipsae_sc_final_10_v2",
        no_mech_dir=RUN / "outputs_moeaud_ipsae_sc_final_10_no_mech",
        filename="ablation_cumhv_ipsae_sc.png",
    ),
]


def discover_logs(root: Path) -> list[Path]:
    logs = sorted(root.rglob("hypervolume_history.log"))
    if not logs:
        raise FileNotFoundError(f"No se encontraron hypervolume_history.log en {root}")
    return logs


def read_replica(log_path: Path) -> ReplicaSeries | None:
    generations: list[float] = []
    hv: list[float] = []

    with log_path.open() as handle:
        for raw in handle:
            line = raw.strip()
            if not line:
                continue
            parts = line.replace(",", " ").split()
            if len(parts) < 2:
                continue
            try:
                generations.append(float(parts[0]))
                hv.append(float(parts[1]))
            except ValueError:
                continue

    if not generations:
        return None

    gens = np.asarray(generations, dtype=float)
    hvs = np.asarray(hv, dtype=float)

    if np.any(np.diff(gens) < 0):
        raise ValueError(f"Las generaciones no son monotonicamente crecientes en {log_path}")

    if gens[-1] < MIN_COMPLETE_GEN:
        return None

    return ReplicaSeries(
        path=log_path,
        generations=gens,
        hv_accum=np.maximum.accumulate(hvs),
    )


def load_condition(root: Path) -> list[ReplicaSeries]:
    replicas = [series for log in discover_logs(root) if (series := read_replica(log)) is not None]
    if not replicas:
        raise RuntimeError(f"No hay replicas completas en {root}")
    return replicas


def common_grid(*groups: list[ReplicaSeries]) -> np.ndarray:
    replicas = [replica for group in groups for replica in group]
    start = int(np.ceil(max(replica.generations[0] for replica in replicas)))
    end = int(np.floor(min(replica.generations[-1] for replica in replicas)))
    if end < start:
        raise RuntimeError("No existe traslape comun de generaciones entre las replicas validas.")
    return np.arange(start, end + 1, dtype=float)


def interpolate_group(replicas: list[ReplicaSeries], grid: np.ndarray) -> np.ndarray:
    return np.vstack(
        [np.interp(grid, replica.generations, replica.hv_accum) for replica in replicas]
    )


def style_axes(ax: plt.Axes) -> None:
    ax.set_facecolor("white")
    ax.grid(True, color=GRID, linewidth=0.8, alpha=0.65)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color(SPINE)
    ax.spines["bottom"].set_color(SPINE)
    ax.tick_params(colors=TEXT, labelsize=11)
    ax.xaxis.label.set_color(TEXT)
    ax.yaxis.label.set_color(TEXT)
    ax.title.set_color(TEXT)


def end_offsets(y_mech: float, y_no_mech: float) -> tuple[tuple[int, int], tuple[int, int]]:
    if y_mech >= y_no_mech:
        return (8, 10), (8, -14)
    return (8, -14), (8, 10)


def plot_pair(spec: PairSpec) -> tuple[Path, dict[str, float], dict[str, int]]:
    mech = load_condition(spec.mech_dir)
    no_mech = load_condition(spec.no_mech_dir)
    grid = common_grid(mech, no_mech)

    mech_mat = interpolate_group(mech, grid)
    no_mech_mat = interpolate_group(no_mech, grid)

    mech_mean = mech_mat.mean(axis=0)
    mech_median = np.median(mech_mat, axis=0)
    mech_std = mech_mat.std(axis=0, ddof=0)
    no_mech_mean = no_mech_mat.mean(axis=0)
    no_mech_median = np.median(no_mech_mat, axis=0)
    no_mech_std = no_mech_mat.std(axis=0, ddof=0)

    fig, ax = plt.subplots(figsize=(8.6, 4.9), constrained_layout=True)
    style_axes(ax)

    ax.fill_between(grid, mech_mean - mech_std, mech_mean + mech_std, color=MECH, alpha=0.18)
    ax.fill_between(
        grid, no_mech_mean - no_mech_std, no_mech_mean + no_mech_std, color=NO_MECH, alpha=0.18
    )
    ax.plot(grid, mech_mean, color=MECH, linewidth=2.5)
    ax.plot(grid, mech_median, color=MECH, linewidth=2.2, linestyle=(0, (5, 4)))
    ax.plot(grid, no_mech_mean, color=NO_MECH, linewidth=2.5)
    ax.plot(grid, no_mech_median, color=NO_MECH, linewidth=2.2, linestyle=(0, (5, 4)))

    ax.set_title(f"Convergencia del hipervolumen acumulado — {spec.formulation}", fontsize=14, pad=14)
    ax.set_xlabel("Generación", fontsize=12)
    ax.set_ylabel("Hipervolumen acumulado (↑ mejor)", fontsize=12)
    ax.legend(
        handles=[
            Line2D([0], [0], color=MECH, linewidth=2.5, label="Con mecanismos"),
            Line2D([0], [0], color=NO_MECH, linewidth=2.5, label="Sin mecanismos"),
            Line2D([0], [0], color=TEXT, linewidth=2.5, label="Media"),
            Line2D([0], [0], color=TEXT, linewidth=2.2, linestyle=(0, (5, 4)), label="Mediana"),
            Patch(facecolor=TEXT, edgecolor="none", alpha=0.18, label="Variabilidad (±1 DE)"),
        ],
        frameon=False,
        fontsize=9.5,
        loc="lower right",
        ncol=2,
        columnspacing=1.1,
        handlelength=2.6,
    )
    ax.set_xlim(grid[0], grid[-1] + max(6, round((grid[-1] - grid[0]) * 0.05)))

    final_mech = float(mech_mean[-1])
    final_mech_median = float(mech_median[-1])
    final_no_mech = float(no_mech_mean[-1])
    final_no_mech_median = float(no_mech_median[-1])
    mech_anchor = float((final_mech + final_mech_median) / 2.0)
    no_mech_anchor = float((final_no_mech + final_no_mech_median) / 2.0)
    mech_offset, no_mech_offset = end_offsets(mech_anchor, no_mech_anchor)

    ax.annotate(
        f"μ {final_mech:.3f}\nMe {final_mech_median:.3f}",
        xy=(grid[-1], mech_anchor),
        xytext=mech_offset,
        textcoords="offset points",
        color=MECH,
        fontsize=9.5,
        fontweight="bold",
        va="center",
        bbox={"boxstyle": "round,pad=0.2", "fc": "white", "ec": "none", "alpha": 0.85},
    )
    ax.annotate(
        f"μ {final_no_mech:.3f}\nMe {final_no_mech_median:.3f}",
        xy=(grid[-1], no_mech_anchor),
        xytext=no_mech_offset,
        textcoords="offset points",
        color=NO_MECH,
        fontsize=9.5,
        fontweight="bold",
        va="center",
        bbox={"boxstyle": "round,pad=0.2", "fc": "white", "ec": "none", "alpha": 0.85},
    )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    output = OUT_DIR / spec.filename
    fig.savefig(output, dpi=220, facecolor="white")
    plt.close(fig)

    return output, {
        "mech_mean": final_mech,
        "mech_median": final_mech_median,
        "no_mech_mean": final_no_mech,
        "no_mech_median": final_no_mech_median,
    }, {
        "mech": len(mech),
        "no_mech": len(no_mech),
        "grid_start": int(grid[0]),
        "grid_end": int(grid[-1]),
    }


def main() -> None:
    for spec in SPECS:
        output, finals, counts = plot_pair(spec)
        print(
            f"{spec.formulation}: mech n={counts['mech']}, no-mech n={counts['no_mech']}, "
            f"grid={counts['grid_start']}-{counts['grid_end']}, "
            f"finales media=({finals['mech_mean']:.3f}, {finals['no_mech_mean']:.3f}), "
            f"mediana=({finals['mech_median']:.3f}, {finals['no_mech_median']:.3f}) -> {output}"
        )


if __name__ == "__main__":
    main()
