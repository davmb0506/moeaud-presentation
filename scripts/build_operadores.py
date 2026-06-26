#!/usr/bin/env python3
"""Extrae la mejor solución (seq_0) de cada réplica de EvoPro base vs both,
copia el PDB del complejo y genera src/data/operadoresData.json para la slide
interactiva (clic en un punto -> complejo a la derecha)."""
import csv
import glob
import json
import math
import os
import re
import shutil
from pathlib import Path

RUN = Path("/home/david/Documents/Dev/Tesis/EvoPro_Mod/evopro/run")
PRES = Path("/home/david/Documents/Dev/Tesis/moeaud-presentation")
PUB = PRES / "public" / "pdbs" / "operadores"
DATA = PRES / "src" / "data"

MIN_ITER = 55  # descartar réplicas que no llegaron cerca de 60 generaciones

BASE_DIRS = sorted(glob.glob(str(RUN / "evopro_raw_results/evopro_raw_results/run_*")))
BOTH_DIRS = sorted(glob.glob(str(RUN / "outputs_evopro_both/evopro_both_*")))


def parse_run(run_dir: str):
    outputs = os.path.join(run_dir, "outputs")
    scores = os.path.join(outputs, "scores.csv")
    pdb = os.path.join(outputs, "seq_0_pred_0_chainAB.pdb")
    if not os.path.isfile(scores) or not os.path.isfile(pdb):
        return None
    best = None
    max_iter = 0
    with open(scores, newline="") as fh:
        for row in csv.reader(fh):
            if row and row[0].startswith("Iteration"):
                m = re.search(r"Iteration\s+(\d+)", row[0])
                if m:
                    max_iter = max(max_iter, int(m.group(1)))
                continue
            if len(row) < 10:
                continue
            f2 = row[2].strip()
            if "|" not in f2:
                continue
            try:
                ov = float(f2.split("|")[0])
                plddt = float(row[3])
                iptm = float(row[7])
                contact = float(row[9])
            except ValueError:
                continue
            if best is None or ov < best["score"]:
                best = {
                    "score": round(ov, 2),
                    "plddt": round(plddt, 1),
                    "iptm": round(iptm, 2),
                    "contact": round(contact, 1),
                    "binder": row[0].strip(),
                }
    if best is None or max_iter < MIN_ITER:
        return None
    best["_pdb_src"] = pdb
    return best


def collect(dirs, group):
    out = []
    (PUB / group).mkdir(parents=True, exist_ok=True)
    for d in dirs:
        b = parse_run(d)
        if b is None:
            continue
        rid = os.path.basename(d)
        name = f"{rid}.pdb"
        shutil.copyfile(b.pop("_pdb_src"), PUB / group / name)
        b["id"] = f"{group}_{rid}"
        b["group"] = group
        b["pdb"] = f"/pdbs/operadores/{group}/{name}"
        out.append(b)
    return out


def mannwhitney_u_p(a, b):
    # U de Mann-Whitney con aproximación normal y corrección por empates.
    combined = sorted([(v, 0) for v in a] + [(v, 1) for v in b])
    ranks = [0.0] * len(combined)
    i = 0
    while i < len(combined):
        j = i
        while j + 1 < len(combined) and combined[j + 1][0] == combined[i][0]:
            j += 1
        r = (i + j) / 2 + 1
        for k in range(i, j + 1):
            ranks[k] = r
        i = j + 1
    r1 = sum(ranks[k] for k in range(len(combined)) if combined[k][1] == 0)
    n1, n2 = len(a), len(b)
    u1 = r1 - n1 * (n1 + 1) / 2
    u2 = n1 * n2 - u1
    u = min(u1, u2)
    mu = n1 * n2 / 2
    sigma = math.sqrt(n1 * n2 * (n1 + n2 + 1) / 12)
    z = (u - mu) / sigma if sigma else 0
    p = 2 * (1 - 0.5 * (1 + math.erf(abs(z) / math.sqrt(2))))
    return u1, p


def cliffs_delta(a, b):
    # delta de (a - b): proporción a<b menos a>b (más negativo => a mejor en minimización)
    gt = lt = 0
    for x in a:
        for y in b:
            if x > y:
                gt += 1
            elif x < y:
                lt += 1
    n = len(a) * len(b)
    return (gt - lt) / n if n else 0.0


def stats(vals):
    n = len(vals)
    mean = sum(vals) / n
    std = math.sqrt(sum((v - mean) ** 2 for v in vals) / (n - 1)) if n > 1 else 0.0
    return {"n": n, "mean": round(mean, 2), "std": round(std, 2)}


def main():
    base = collect(BASE_DIRS, "base")
    both = collect(BOTH_DIRS, "both")
    bvals = [p["score"] for p in base]
    tvals = [p["score"] for p in both]
    u, p = mannwhitney_u_p(bvals, tvals)
    delta = cliffs_delta(bvals, tvals)
    out = {
        "stats": {
            "base": stats(bvals),
            "both": stats(tvals),
            "U": round(u, 0),
            "p": p,
            "cliffs_delta": round(delta, 3),
        },
        "base": base,
        "both": both,
    }
    DATA.mkdir(parents=True, exist_ok=True)
    with open(DATA / "operadoresData.json", "w") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)
    print("base:", out["stats"]["base"], "both:", out["stats"]["both"])
    print(f"U={u:.0f}  p={p:.4g}  Cliff's delta={delta:.3f}")
    print("PDBs en", PUB)


if __name__ == "__main__":
    main()
