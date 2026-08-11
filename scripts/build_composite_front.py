#!/usr/bin/env python3
"""Frente de Pareto (Composite / TM-score) — réplica representativa.

Elige, por condición, la réplica cuyo tamaño de archivo está más cerca de la
media de no dominadas; copia ese archivo final y genera
src/data/compositeFront.json.
"""
from __future__ import annotations

import csv
import glob
import json
import os
import shutil
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pdb_metrics import compute_metrics

RUN = Path("/home/david/Documents/Dev/Tesis/EvoPro_Mod/evopro/run")
PRES = Path("/home/david/Documents/Dev/Tesis/moeaud-presentation")
PUB = PRES / "public" / "pdbs" / "composite"
DATA = PRES / "src" / "data"

SOURCES = {
    "con": (RUN / "outputs_moeaud_composite_tmscore (2)", "outputs_moeaud_composite_tmscore_*"),
    "sin": (RUN / "outputs_moeaud_composite_tmscore_final_10_no_mech_v2", "run_*"),
}
PDB_SUBDIR = {
    "con": "con_mech",
    "sin": "sin",
}


def list_runs(base: Path, pat: str) -> list[Path]:
    out = []
    for d in sorted(glob.glob(str(base / pat))):
        outputs = Path(d) / "outputs"
        if (outputs / "final_archive.csv").is_file():
            out.append(outputs)
    return out


def archive_size(outputs: Path) -> int:
    with open(outputs / "final_archive.csv") as fh:
        return sum(1 for _ in csv.DictReader(fh))


def pick_representative(runs: list[Path]) -> tuple[Path, dict]:
    sizes = [archive_size(r) for r in runs]
    mean = statistics.mean(sizes)
    sd = statistics.stdev(sizes) if len(sizes) > 1 else 0.0
    best = min(runs, key=lambda r: abs(archive_size(r) - mean))
    stats = {"mean": round(mean, 1), "sd": round(sd, 1)}
    return best, stats


def read_archive(outputs: Path) -> list[dict]:
    rows = []
    with open(outputs / "final_archive.csv") as fh:
        for i, r in enumerate(csv.DictReader(fh)):
            try:
                f1 = float(r["composite_interface"])
                f2 = float(r["tmscore"])
            except (ValueError, KeyError):
                continue
            pdb = outputs / "final_pdbs" / "archive" / f"archive_{i + 1}_pred1.pdb"
            if not pdb.is_file():
                continue
            rows.append(
                {
                    "f1": round(f1, 4),
                    "f2": round(f2, 4),
                    "binder": r["sequence"].split(",")[0],
                    "pdb_src": pdb,
                    "idx": i + 1,
                }
            )
    rows.sort(key=lambda p: p["f1"])
    return rows


def main():
    if PUB.exists():
        shutil.rmtree(PUB)
    PUB.mkdir(parents=True, exist_ok=True)
    DATA.mkdir(parents=True, exist_ok=True)

    points = []
    stats_out: dict[str, dict] = {}
    chosen: dict[str, str] = {}

    for cond, (base, pat) in SOURCES.items():
        runs = list_runs(base, pat)
        if not runs:
            raise SystemExit(f"Sin réplicas para {cond} en {base}/{pat}")
        outputs, stats = pick_representative(runs)
        stats_out[cond] = stats
        chosen[cond] = str(outputs.parent.name)

        pdb_subdir = PDB_SUBDIR[cond]
        (PUB / pdb_subdir).mkdir(parents=True, exist_ok=True)
        for k, p in enumerate(read_archive(outputs)):
            name = f"{cond}_{k}.pdb"
            shutil.copyfile(p["pdb_src"], PUB / pdb_subdir / name)
            points.append(
                {
                    "id": f"{cond}_{k}",
                    "cond": cond,
                    "f1": p["f1"],
                    "f2": p["f2"],
                    "binder": p["binder"],
                    "pdb": f"/pdbs/composite/{pdb_subdir}/{name}",
                    **compute_metrics(p["pdb_src"], p["binder"]),
                }
            )

    out = {
        "objectives": {
            "x": "1 − Composite (ipSAE+SC+ΔSASA)",
            "y": "1 − TM-score del binder",
        },
        "counts": {
            "con": sum(1 for p in points if p["cond"] == "con"),
            "sin": sum(1 for p in points if p["cond"] == "sin"),
        },
        "stats": stats_out,
        "representative_runs": chosen,
        "points": points,
    }
    with open(DATA / "compositeFront.json", "w") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)
    print("counts:", out["counts"])
    print("stats:", stats_out)
    print("reps:", chosen)
    print("PDBs en", PUB)


if __name__ == "__main__":
    main()
