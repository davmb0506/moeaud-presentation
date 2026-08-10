#!/usr/bin/env python3
"""Predict AF2 complexes for HA-PD1 paper-fitness champions missing a chainAB PDB.

1) Find absolute paper-best binder per run without seq_*_pred_0_chainAB.pdb
2) Run sequential AF2 (same af2.flags as mono-60)
3) Write sanitized PDB into each run's outputs/ so build_hapd1_variantes can pick it up

Usage (from presentation repo, with conda env evopro):
  conda run -n evopro --no-capture-output python scripts/predict_missing_hapd1_paper_pdbs.py
"""
from __future__ import annotations

import csv
import hashlib
import shutil
import subprocess
import sys
from pathlib import Path

# Reuse parsers from the variantes builder.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_hapd1_variantes import (  # noqa: E402
    ARMS,
    build_pdb_map,
    parse_all_iterations,
    sanitize_pdb,
)

EVOPRO = Path("/home/david/Documents/Dev/Tesis/EvoPro_Mod")
RUN_DIR = EVOPRO / "evopro" / "run"
AF2_CONFIG = RUN_DIR / "configs" / "evopro_hapd1_base_60.yaml"
TARGET = (
    "WNPPTFSPALLVVTEGDNATFTCSFSNTSESFHVVWHRESPSGQTDTLAAFPEDRSQPGQDSRFRVTQLPNGRDFHMSVV"
    "RARRNDSGTYVCGVISLAPKIQIKESLRAELRVTERRAE"
)
WORK = Path(__file__).resolve().parents[1] / "tmp" / "hapd1_paper_missing_pdbs"
CAND_CSV = WORK / "candidates.csv"
PRED_ROOT = WORK / "af2_out"


def collect_missing() -> list[dict]:
    missing: list[dict] = []
    for arm in ARMS:
        root = Path(arm["run_root"])
        for rep in range(1, 11):
            run_id = f"{arm['id']}_{rep:02d}"
            scores = root / run_id / "outputs" / "scores.csv"
            if not scores.is_file():
                continue
            rows = parse_all_iterations(scores)
            pdb_map = build_pdb_map(root / run_id / "outputs")
            best = min(rows, key=lambda r: r["paper_score"])
            if best["binder"] in pdb_map:
                continue
            missing.append(
                {
                    "candidate_id": run_id,
                    "run_id": run_id,
                    "run_root": str(root),
                    "binder_seq": best["binder"],
                    "target_seq": TARGET,
                    "paper_score": best["paper_score"],
                    "iteration": best["iteration"],
                }
            )
    return missing


def write_candidates(rows: list[dict]) -> None:
    WORK.mkdir(parents=True, exist_ok=True)
    with CAND_CSV.open("w", newline="") as fh:
        w = csv.DictWriter(
            fh,
            fieldnames=[
                "candidate_id",
                "binder_seq",
                "target_seq",
                "paper_score",
                "iteration",
            ],
        )
        w.writeheader()
        for r in rows:
            w.writerow(
                {
                    "candidate_id": r["candidate_id"],
                    "binder_seq": r["binder_seq"],
                    "target_seq": r["target_seq"],
                    "paper_score": f"{r['paper_score']:.6f}",
                    "iteration": r["iteration"],
                }
            )


def run_af2() -> None:
    PRED_ROOT.mkdir(parents=True, exist_ok=True)
    cmd = [
        "conda",
        "run",
        "-n",
        "evopro",
        "--no-capture-output",
        "python",
        str(EVOPRO / "evopro" / "validation" / "predict_complexes_simple.py"),
        "--candidates_csv",
        str(CAND_CSV),
        "--output_dir",
        str(PRED_ROOT),
        "--af2_config",
        str(AF2_CONFIG),
    ]
    env = {
        **dict(**{k: v for k, v in __import__("os").environ.items()}),
        "PYTHONPATH": f"{EVOPRO}:{RUN_DIR.parent.parent / 'alphafold' / 'run'}",
        "XLA_PYTHON_CLIENT_PREALLOCATE": "false",
        "JAX_PLATFORMS": "cuda",
        "MPLBACKEND": "Agg",
    }
    # Prefer AF_RUN on path like mono-60 launcher.
    af_run = Path("/home/david/Documents/Dev/Tesis/alphafold/run")
    env["PYTHONPATH"] = f"{EVOPRO}:{af_run}:{env.get('PYTHONPATH', '')}"
    print("Running:", " ".join(cmd))
    subprocess.run(cmd, check=True, cwd=str(EVOPRO), env=env)


def install_pdbs(rows: list[dict]) -> int:
    pred_dir = PRED_ROOT / "complex_predictions"
    n = 0
    for r in rows:
        cid = r["candidate_id"]
        src_hits = sorted(pred_dir.glob(f"{cid}_unrelaxed_rank_001_*.pdb"))
        if not src_hits:
            print(f"MISSING prediction for {cid}")
            continue
        src = src_hits[0]
        out_dir = Path(r["run_root"]) / r["run_id"] / "outputs"
        out_dir.mkdir(parents=True, exist_ok=True)
        # Stable name found by build_pdb_map (seq_*_pred_0_chainAB.pdb).
        digest = hashlib.md5(r["binder_seq"].encode()).hexdigest()[:8]
        dest = out_dir / f"seq_paper_{digest}_pred_0_chainAB.pdb"
        dest.write_text(sanitize_pdb(src.read_text()))
        print(f"Wrote {dest}  (s'={r['paper_score']:.2f}, iter={r['iteration']})")
        n += 1
    return n


def main() -> None:
    missing = collect_missing()
    print(f"Missing paper-best PDBs: {len(missing)}")
    if not missing:
        print("Nothing to do.")
        return
    for m in missing:
        print(
            f"  {m['run_id']}: iter {m['iteration']}  s'={m['paper_score']:.2f}  "
            f"len={len(m['binder_seq'])}"
        )
    write_candidates(missing)
    print(f"Wrote {CAND_CSV}")
    run_af2()
    n = install_pdbs(missing)
    print(f"Installed {n}/{len(missing)} PDBs into run outputs/")
    # Rebuild variantes JSON for the presentation.
    rebuild = Path(__file__).resolve().parent / "build_hapd1_variantes.py"
    print(f"Rebuilding {rebuild.name} ...")
    subprocess.run([sys.executable, str(rebuild)], check=True)


if __name__ == "__main__":
    main()
