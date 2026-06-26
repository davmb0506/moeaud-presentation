#!/usr/bin/env python3
"""Frente de Pareto agregado (Composite / TM-score) con vs sin mecanismos.

Combina las 10 réplicas de cada condición, calcula el frente no dominado
(minimización de f1 = 1 - Composite y f2 = 1 - TM-score), copia el PDB del
complejo de cada solución del frente y genera src/data/compositeFront.json.
"""
import csv
import glob
import json
import os
import shutil
from pathlib import Path

RUN = Path("/home/david/Documents/Dev/Tesis/EvoPro_Mod/evopro/run")
PRES = Path("/home/david/Documents/Dev/Tesis/moeaud-presentation")
PUB = PRES / "public" / "pdbs" / "composite"
DATA = PRES / "src" / "data"

SOURCES = {
    "con": (RUN / "outputs_moeaud_composite_tmscore (2)", "outputs_moeaud_composite_tmscore_*"),
    "sin": (RUN / "outputs_moeaud_composite_tmscore_final_10_no_mech_v2", "run_*"),
}


def gather(base: Path, pat: str):
    pts = []
    for d in sorted(glob.glob(str(base / pat))):
        outputs = os.path.join(d, "outputs")
        fa = os.path.join(outputs, "final_archive.csv")
        if not os.path.isfile(fa):
            continue
        rid = os.path.basename(d).replace("outputs_moeaud_composite_tmscore_", "").replace("run_", "r")
        with open(fa) as fh:
            for i, r in enumerate(csv.DictReader(fh)):
                try:
                    f1 = float(r["composite_interface"])
                    f2 = float(r["tmscore"])
                except (ValueError, KeyError):
                    continue
                pdb = os.path.join(outputs, "final_pdbs", "archive", f"archive_{i + 1}_pred1.pdb")
                if not os.path.isfile(pdb):
                    continue
                pts.append(
                    {
                        "f1": round(f1, 4),
                        "f2": round(f2, 4),
                        "binder": r["sequence"].split(",")[0],
                        "pdb_src": pdb,
                        "rid": rid,
                        "idx": i + 1,
                    }
                )
    return pts


def non_dominated(pts):
    front = []
    for i, p in enumerate(pts):
        dominated = False
        for j, q in enumerate(pts):
            if j == i:
                continue
            if q["f1"] <= p["f1"] and q["f2"] <= p["f2"] and (q["f1"] < p["f1"] or q["f2"] < p["f2"]):
                dominated = True
                break
        if not dominated:
            front.append(p)
    return front


def main():
    points = []
    for cond, (base, pat) in SOURCES.items():
        (PUB / cond).mkdir(parents=True, exist_ok=True)
        front = non_dominated(gather(base, pat))
        # ordenar por f1 para una línea de frente limpia
        front.sort(key=lambda p: p["f1"])
        for k, p in enumerate(front):
            name = f"{cond}_{k}.pdb"
            shutil.copyfile(p["pdb_src"], PUB / cond / name)
            points.append(
                {
                    "id": f"{cond}_{k}",
                    "cond": cond,
                    "f1": p["f1"],
                    "f2": p["f2"],
                    "binder": p["binder"],
                    "pdb": f"/pdbs/composite/{cond}/{name}",
                }
            )

    out = {
        "objectives": {"x": "1 − Composite (ipSAE+SC+ΔSASA)", "y": "1 − TM-score del binder"},
        "counts": {
            "con": sum(1 for p in points if p["cond"] == "con"),
            "sin": sum(1 for p in points if p["cond"] == "sin"),
        },
        "points": points,
    }
    DATA.mkdir(parents=True, exist_ok=True)
    with open(DATA / "compositeFront.json", "w") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)
    print("counts:", out["counts"])
    print("PDBs en", PUB)


if __name__ == "__main__":
    main()
