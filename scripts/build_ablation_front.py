#!/usr/bin/env python3
"""Extrae el frente Pareto (Interface-PAE / pLDDT) de la ablación de mecanismos.

Toma una réplica representativa por condición, normaliza los objetivos por
min-max (combinando ambas condiciones), copia el PDB del complejo de cada
solución no dominada a public/fronts/ y genera src/data/ablationFront.json.
"""
import csv
import json
import shutil
from pathlib import Path

RUN = Path("/home/david/Documents/Dev/Tesis/EvoPro_Mod/evopro/run")
PRES = Path("/home/david/Documents/Dev/Tesis/moeaud-presentation")

# Pares de interfaz = len(binder) * len(target) = 21 * 95 (constante en este experimento).
N_PAIRS = 1995

# Réplicas más cercanas a la media de soluciones no dominadas por condición.
SOURCES = {
    "con": RUN / "outputs_moeaud_interface_pae_plddt/outputs_moeaud_interface_pae_plddt_02/outputs",
    "sin": RUN / "outputs_moeaud_interface_pae_plddt_10_no_mech/run_09/outputs",
}

# Estadísticas globales (todas las réplicas) para la leyenda.
STATS = {
    "con": {"mean": 43.9, "sd": 5.6},
    "sin": {"mean": 30.8, "sd": 6.1},
}

PUB = PRES / "public" / "fronts"
DATA = PRES / "src" / "data"


def read_archive(outputs: Path):
    rows = []
    with open(outputs / "final_archive.csv") as fh:
        reader = csv.DictReader(fh)
        for i, r in enumerate(reader):
            rows.append(
                {
                    "idx": i + 1,
                    "f1": float(r["f1_interface_pae"]),
                    "f2": float(r["f2_plddt"]),
                    "seq": r["sequence"],
                }
            )
    return rows


def main():
    PUB.mkdir(parents=True, exist_ok=True)
    DATA.mkdir(parents=True, exist_ok=True)

    points = []
    for cond, outputs in SOURCES.items():
        (PUB / cond).mkdir(parents=True, exist_ok=True)
        archive = outputs / "final_pdbs" / "archive"
        for row in read_archive(outputs):
            src_pdb = archive / f"archive_{row['idx']}_pred1.pdb"
            if not src_pdb.exists():
                print(f"  WARN: falta {src_pdb}")
                continue
            dst_name = f"a{row['idx']}.pdb"
            shutil.copyfile(src_pdb, PUB / cond / dst_name)
            binder_seq = row["seq"].split(",")[0]
            # Conversión a la convención corregida e interpretable (minimización).
            # OLD_interface_pae (suma negada) -> PAE medio de interfaz en Å.
            # OLD_plddt = -mean_pLDDT          -> pLDDT y 100 - pLDDT.
            pae_a = 35.0 * (row["f1"] / N_PAIRS + 1.0)
            plddt = -row["f2"]
            p100 = 100.0 + row["f2"]  # 100 - pLDDT
            points.append(
                {
                    "id": f"{cond}_{row['idx']}",
                    "cond": cond,
                    "pae": round(pae_a, 2),
                    "plddt": round(plddt, 1),
                    "p100": round(p100, 2),
                    "binder": binder_seq,
                    "pdb": f"/fronts/{cond}/{dst_name}",
                }
            )

    out = {
        "objectives": {"x": "Interface-PAE (Å)", "y": "100 − pLDDT"},
        "counts": {
            "con": sum(1 for p in points if p["cond"] == "con"),
            "sin": sum(1 for p in points if p["cond"] == "sin"),
        },
        "stats": STATS,
        "points": points,
    }
    with open(DATA / "ablationFront.json", "w") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)

    print(f"Puntos: {out['counts']} | PDBs copiados a {PUB}")
    print(f"JSON: {DATA / 'ablationFront.json'}")


if __name__ == "__main__":
    main()
