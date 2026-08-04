#!/usr/bin/env python3
"""Agrega TIMING por réplica (ipSAE/SC MA vs Base) → src/data/ablationOverhead.json.

Cada línea TIMING de `run_*.log` reporta el desglose de una generación. El costo
exclusivo de MA es `injection+log`, que solo es > 0 en las generaciones donde se
dispara una inyección de diversidad.
"""
from __future__ import annotations

import csv
import json
import re
import statistics as stats
import sys
import tempfile
import time
import types
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
EVOPRO = REPO.parent / "EvoPro_Mod"
RUN = EVOPRO / "evopro" / "run"
MECH = RUN / "outputs_moeaud_ipsae_sc_final_10_v2"
BASE = RUN / "outputs_moeaud_ipsae_sc_final_10_no_mech"
OUT = REPO / "src" / "data" / "ablationOverhead.json"

PAT = re.compile(
    r"TIMING:\s*gen=([\d.]+)s\s*\|\s*offspring=([\d.]+)s\s*\|\s*AF2=([\d.]+)s\s*"
    r"\|\s*scoring=([\d.]+)s\s*\|\s*MOEA-UD=([\d.]+)s\s*\|\s*injection\+log=([\d.]+)s"
)


def count_injections(run_dir: Path) -> int:
    """Número real de inyecciones desde injection_generations.log.

    No sirve contar las generaciones con `injection+log` > 0: el log imprime
    con una décima de segundo, así que las inyecciones más baratas aparecen
    como 0.0 y se pierden.
    """
    log = run_dir / "outputs" / "injection_generations.log"
    if not log.is_file():
        return 0
    lines = [ln for ln in log.read_text(errors="ignore").splitlines() if ln.strip()]
    return max(len(lines) - 1, 0)  # descontar la cabecera


def parse_run(log: Path, n_injections: int) -> dict:
    gens: list[tuple[float, ...]] = []
    for line in log.read_text(errors="ignore").splitlines():
        m = PAT.search(line)
        if m:
            gens.append(tuple(map(float, m.groups())))
    if not gens:
        raise ValueError(f"Sin líneas TIMING en {log}")

    n = len(gens)
    inj_s = sum(g[5] for g in gens)
    gen_median_s = stats.median(g[0] for g in gens)
    total_s = sum(g[0] for g in gens)
    af2_scoring_s = sum(g[2] + g[3] for g in gens)

    return {
        "n_gen": n,
        "n_injections": n_injections,
        "injection_s": round(inj_s, 1),
        "injection_min": round(inj_s / 60, 2),
        "injection_per_gen_s": round(inj_s / n, 3),
        "injection_per_event_s": round(inj_s / n_injections, 2) if n_injections else 0.0,
        "gen_median_s": round(gen_median_s, 1),
        "gen_median_min": round(gen_median_s / 60, 2),
        "pct_of_gen": round(100 * (inj_s / n) / gen_median_s, 3),
        "offspring_min": round(sum(g[1] for g in gens) / 60, 1),
        "selection_min": round(sum(g[4] for g in gens) / 60, 1),
        "offspring_per_gen_s": round(sum(g[1] for g in gens) / n, 2),
        "selection_per_gen_s": round(sum(g[4] for g in gens) / n, 2),
        "af2_scoring_per_gen_s": round(af2_scoring_s / n, 1),
        "af2_scoring_pct": round(100 * af2_scoring_s / total_s, 1),
        "wall_clock_h": round(total_s / 3600, 2),
    }


def collect(root: Path) -> list[dict]:
    rows = []
    for i in range(1, 11):
        log = root / f"run_{i:02d}" / f"run_{i:02d}.log"
        if not log.is_file():
            raise FileNotFoundError(log)
        row = parse_run(log, count_injections(root / f"run_{i:02d}"))
        row["replica"] = i
        row["id"] = f"run_{i:02d}"
        rows.append(row)
    return rows


def med(rows: list[dict], key: str) -> float:
    return round(float(stats.median(r[key] for r in rows)), 3)


def summarize(rows: list[dict]) -> dict:
    with_inj = [r for r in rows if r["n_injections"] > 0]
    return {
        "injection_s_median": med(rows, "injection_s"),
        "injection_s_min": min(r["injection_s"] for r in rows),
        "injection_s_max": max(r["injection_s"] for r in rows),
        "injection_min_median": med(rows, "injection_min"),
        "injection_min_min": min(r["injection_min"] for r in rows),
        "injection_min_max": max(r["injection_min"] for r in rows),
        "injection_per_gen_s_median": med(rows, "injection_per_gen_s"),
        "n_injections_median": int(stats.median(r["n_injections"] for r in rows)),
        "n_injections_total": sum(r["n_injections"] for r in rows),
        "injection_per_event_s_median": med(with_inj, "injection_per_event_s") if with_inj else 0.0,
        "injection_per_event_s_min": min((r["injection_per_event_s"] for r in with_inj), default=0.0),
        "injection_per_event_s_max": max((r["injection_per_event_s"] for r in with_inj), default=0.0),
        "gen_median_s": med(rows, "gen_median_s"),
        "gen_median_min": med(rows, "gen_median_min"),
        "pct_of_gen_median": med(rows, "pct_of_gen"),
        "offspring_min_median": med(rows, "offspring_min"),
        "selection_min_median": med(rows, "selection_min"),
        "offspring_per_gen_s_median": med(rows, "offspring_per_gen_s"),
        "selection_per_gen_s_median": med(rows, "selection_per_gen_s"),
        "af2_scoring_per_gen_s_median": med(rows, "af2_scoring_per_gen_s"),
        "af2_scoring_pct_median": med(rows, "af2_scoring_pct"),
        "wall_clock_h_median": med(rows, "wall_clock_h"),
    }


def _selector_events(root: Path) -> tuple[int, int]:
    """Actualizaciones de ventana y reinicios post-inyección (mediana por réplica)."""
    updates, resets = [], []
    for i in range(1, 11):
        path = root / f"run_{i:02d}" / "outputs" / "operator_selection.csv"
        if not path.is_file():
            continue
        with path.open(newline="") as f:
            events = [row[1] for row in csv.reader(f) if len(row) > 1][1:]
        updates.append(events.count("update"))
        resets.append(events.count("injection_reset"))
    if not updates:
        raise FileNotFoundError(f"Sin operator_selection.csv bajo {root}")
    return int(stats.median(updates)), int(stats.median(resets))


def _run_config(root: Path) -> tuple[int, int]:
    """Descendientes por generación (N) y ventana del selector (Tw) desde el log."""
    text = (root / "run_01" / "run_01.log").read_text(errors="ignore")
    n_off = re.search(r"Generating (\d+) offspring from population P", text)
    tw = re.search(r"Adaptive operator selection enabled.*?Tw=(\d+)", text)
    if not n_off or not tw:
        raise ValueError("No se pudo leer N offspring / Tw del log")
    return int(n_off.group(1)), int(tw.group(1))


def benchmark_operator_selector(root: Path, n_gen: int) -> dict:
    """Costo de la selección adaptativa de operadores.

    El log no la cronometra por separado: el muestreo por descendiente cae
    dentro de `offspring` y la actualización de ventana dentro de
    `injection+log`. Se mide ejecutando la clase real con los parámetros de
    esas ejecuciones, así que es un microbenchmark en esta máquina, no una
    medición de las corridas originales.
    """
    sys.path.insert(0, str(EVOPRO))
    from evopro.run.protein_design_moea_ud.operator_selection import OperatorSelector

    n_offspring, tw = _run_config(root)
    n_updates, n_resets = _selector_events(root)

    flags = types.SimpleNamespace(
        operator_selection_window=tw,
        operator_selection_alpha=0.1,
        operator_selection_beta=0.1,
        operator_selection_sigma_bar=0.01,
        operator_selection_p_min=0.15,
        run_dir=None,
    )
    conf = types.SimpleNamespace(flags=flags)
    out = tempfile.mkdtemp()

    sel = OperatorSelector(conf, output_dir=out)
    n_draws = n_offspring * n_gen
    t0 = time.perf_counter()
    for _ in range(n_draws):
        sel.record_offspring(sel.get_current_operator())
    t_draw = (time.perf_counter() - t0) / n_draws

    sel = OperatorSelector(conf, output_dir=out)
    reps = 2000
    t0 = time.perf_counter()
    for i in range(reps):
        for _ in range(tw):
            sel.record_hv(0.9 + i * 1e-6)
        sel.switch(i)
    t_switch = (time.perf_counter() - t0) / reps

    t0 = time.perf_counter()
    for i in range(reps):
        sel.reset_after_injection(i)
    t_reset = (time.perf_counter() - t0) / reps

    total_s = t_draw * n_draws + t_switch * n_updates + t_reset * n_resets
    return {
        "n_offspring_per_gen": n_offspring,
        "window_tw": tw,
        "n_window_updates_median": n_updates,
        "n_injection_resets_median": n_resets,
        "draw_us": round(t_draw * 1e6, 1),
        "switch_ms": round(t_switch * 1e3, 2),
        "reset_ms": round(t_reset * 1e3, 3),
        "total_s_per_run": round(total_s, 3),
        "per_gen_ms": round(1e3 * total_s / n_gen, 2),
        "measurement": "microbenchmark",
    }


def main() -> None:
    ma = collect(MECH)
    base = collect(BASE)
    payload = {
        "meta": {
            "formulation": "ipSAE / SC",
            "n_replicas": 10,
            "generations": 200,
            "source_ma": str(MECH),
            "source_base": str(BASE),
            "note": (
                "Tiempos por réplica sumando líneas TIMING de run_*.log; el "
                "número de inyecciones viene de injection_generations.log."
            ),
        },
        "ma": ma,
        "base": base,
        "summary": {"ma": summarize(ma), "base": summarize(base)},
        "operator_selection": benchmark_operator_selector(MECH, 200),
    }
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    s = payload["summary"]["ma"]
    print(f"Wrote {OUT}")
    print(f"  por inyección: {s['injection_per_event_s_median']} s (n={s['n_injections_total']})")
    print(f"  amortizado: {s['injection_per_gen_s_median']} s/gen")
    print(f"  generación: {s['gen_median_min']} min · inyección = {s['pct_of_gen_median']} %")
    o = payload["operator_selection"]
    print(f"  selección de operadores: {o['per_gen_ms']} ms/gen ({o['total_s_per_run']} s por ejecución)")


if __name__ == "__main__":
    main()
