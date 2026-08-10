#!/usr/bin/env python3
"""Añade rg / if_contacts / bsa a JSONs HA-PD1 a partir de los PDBs públicos."""
from __future__ import annotations

import json
import sys
from pathlib import Path

PRES = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PRES / "scripts"))
from pdb_metrics import compute_metrics  # noqa: E402

VAR = PRES / "src" / "data" / "hapd1Variantes.json"
MONO = PRES / "src" / "data" / "hapd1Mono60VsPaper.json"
PUB = PRES / "public"


def enrich_entry(entry: dict, *, seq_key: str, pdb_key: str = "pdb") -> None:
    pdb_rel = entry.get(pdb_key)
    seq = entry.get(seq_key) or ""
    if not pdb_rel:
        entry["rg"] = None
        entry["if_contacts"] = None
        entry["bsa"] = None
        return
    path = PUB / str(pdb_rel).lstrip("/")
    m = compute_metrics(path, binder_seq=seq, binder_chain="A", target_chain="B")
    entry["rg"] = m["rg"]
    entry["if_contacts"] = m["if_contacts"]
    entry["bsa"] = m["bsa"]


def main() -> None:
    var = json.loads(VAR.read_text())
    n = 0
    for arm in var["arms"]:
        for run in arm["runs"]:
            enrich_entry(run, seq_key="binder")
            n += 1
            print(f"  {run['id']}: rg={run['rg']} if={run['if_contacts']} bsa={run['bsa']}")
    VAR.write_text(json.dumps(var, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {VAR} ({n} runs)")

    mono = json.loads(MONO.read_text())
    for aid in mono["paper_aids"]:
        enrich_entry(aid, seq_key="binder_seq")
        print(f"  AiD {aid['aid_id']}: rg={aid['rg']} if={aid['if_contacts']} bsa={aid['bsa']}")
    for d in mono["designs"]:
        enrich_entry(d, seq_key="binder_seq")
        print(f"  {d['id']}: rg={d['rg']} if={d['if_contacts']} bsa={d['bsa']}")
    mono.setdefault("meta", {})["struct_metrics"] = (
        "rg / if_contacts / bsa from scripts/pdb_metrics.py on chainAB PDBs "
        "(binder=A, target=B; contact cutoff 4.5 Å; Shrake–Rupley ΔSASA)."
    )
    MONO.write_text(json.dumps(mono, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {MONO}")


if __name__ == "__main__":
    main()
