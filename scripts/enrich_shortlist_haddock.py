#!/usr/bin/env python3
"""Merge HADDOCK Goudy-shortlist scores into shortlistGoudy.json."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

REPO_PRES = Path(__file__).resolve().parents[1]
EVOPRO = REPO_PRES.parent / "EvoPro_Mod"
RESULTS = (
    EVOPRO
    / "evopro/validation/cascade/haddock3_goudy_shortlist/shortlist_haddock_results.json"
)
SHORTLIST = REPO_PRES / "src/data/shortlistGoudy.json"
PDB_OUT = REPO_PRES / "public/pdbs/shortlist-haddock"
PANEL = "moea_pool1208"
NATIVE = -80.099


def main() -> None:
    if not RESULTS.exists():
        raise SystemExit(f"Missing results: {RESULTS}")

    results = json.loads(RESULTS.read_text(encoding="utf-8"))
    by_id = {r["candidate_id"]: r for r in results["candidates"]}

    data = json.loads(SHORTLIST.read_text(encoding="utf-8"))
    panel = data["panels"][PANEL]
    PDB_OUT.mkdir(parents=True, exist_ok=True)

    n_ok = 0
    for cand in panel["candidates"]:
        row = by_id.get(cand["id"])
        if not row or row.get("status") != "completed" or row.get("best_score") is None:
            cand["haddock_score"] = None
            cand["haddock_vs_native"] = None
            cand["haddock_beats_native"] = None
            cand["haddock_model"] = None
            cand["haddock_pdb"] = None
            continue

        score = float(row["best_score"])
        cand["haddock_score"] = round(score, 3)
        cand["haddock_vs_native"] = round(score - NATIVE, 3)
        cand["haddock_beats_native"] = bool(score < NATIVE)
        cand["haddock_model"] = row.get("best_model")

        src = row.get("best_model_path")
        public_rel = None
        if src:
            src_path = EVOPRO / src
            if src_path.exists():
                dst = PDB_OUT / f"{cand['id']}_haddock_local.pdb"
                shutil.copy2(src_path, dst)
                public_rel = f"/pdbs/shortlist-haddock/{dst.name}"
        cand["haddock_pdb"] = public_rel
        n_ok += 1

    panel["haddock"] = {
        "status": "completed" if n_ok == len(panel["candidates"]) else "partial",
        "n_completed": n_ok,
        "n_beats_native": sum(
            1 for c in panel["candidates"] if c.get("haddock_beats_native")
        ),
        "native_control_score": NATIVE,
        "best_score": results.get("best_score"),
        "source": str(RESULTS),
    }

    SHORTLIST.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(
        f"Enriched {n_ok}/{len(panel['candidates'])} candidates; "
        f"beats native: {panel['haddock']['n_beats_native']}"
    )


if __name__ == "__main__":
    main()
