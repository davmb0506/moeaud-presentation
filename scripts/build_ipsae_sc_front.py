#!/usr/bin/env python3
"""Frente de Pareto agregado (ipSAE / SC) con vs sin mecanismos.

Combina las 10 réplicas de cada condición, calcula el frente no dominado
(minimización de f1 = 1 - ipSAE y f2 = 1 - SC; las columnas ipsae/sc del
archivo ya vienen transformadas a 1 - valor por EvoPro), copia el PDB del
complejo de cada solución del frente y genera src/data/ipsaeScFront.json.
"""
import csv
import glob
import json
import os
import shutil
from pathlib import Path

RUN = Path("/home/david/Documents/Dev/Tesis/EvoPro_Mod/evopro/run")
PRES = Path("/home/david/Documents/Dev/Tesis/moeaud-presentation")
PUB = PRES / "public" / "pdbs" / "ipsae_sc"
DATA = PRES / "src" / "data"

SOURCES = {
    "con": (RUN / "outputs_moeaud_ipsae_sc_final_10_v2", "run_*"),
    "sin": (RUN / "outputs_moeaud_ipsae_sc_final_10_no_mech", "run_*"),
}
PDB_SUBDIR = {
    "con": "con_mech",
    "sin": "sin",
}


def gather(base: Path, pat: str):
    pts = []
    for d in sorted(glob.glob(str(base / pat))):
        outputs = os.path.join(d, "outputs")
        fa = os.path.join(outputs, "final_archive.csv")
        if not os.path.isfile(fa):
            continue
        with open(fa) as fh:
            for i, r in enumerate(csv.DictReader(fh)):
                try:
                    f1 = float(r["ipsae"])
                    f2 = float(r["sc"])
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
        pdb_subdir = PDB_SUBDIR[cond]
        (PUB / pdb_subdir).mkdir(parents=True, exist_ok=True)
        front = non_dominated(gather(base, pat))
        front.sort(key=lambda p: p["f1"])
        for k, p in enumerate(front):
            name = f"{cond}_{k}.pdb"
            shutil.copyfile(p["pdb_src"], PUB / pdb_subdir / name)
            points.append(
                {
                    "id": f"{cond}_{k}",
                    "cond": cond,
                    "f1": p["f1"],
                    "f2": p["f2"],
                    "binder": p["binder"],
                    "pdb": f"/pdbs/ipsae_sc/{pdb_subdir}/{name}",
                }
            )

    out = {
        "objectives": {"x": "1 − ipSAE", "y": "1 − SC (Shape Complementarity)"},
        "counts": {
            "con": sum(1 for p in points if p["cond"] == "con"),
            "sin": sum(1 for p in points if p["cond"] == "sin"),
        },
        "points": points,
    }
    DATA.mkdir(parents=True, exist_ok=True)
    with open(DATA / "ipsaeScFront.json", "w") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)
    print("counts:", out["counts"])
    print("PDBs en", PUB)


if __name__ == "__main__":
    main()
