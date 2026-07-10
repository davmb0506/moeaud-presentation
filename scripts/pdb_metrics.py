#!/usr/bin/env python3
"""Métricas estructurales y fisicoquímicas a partir de un PDB de complejo."""
from __future__ import annotations

import copy
from pathlib import Path

import numpy as np
from Bio.PDB import PDBParser
from Bio.PDB.SASA import ShrakeRupley
from Bio.SeqUtils.ProtParam import ProteinAnalysis

STANDARD_AA = set("ACDEFGHIKLMNPQRSTVWY")
ATOMIC_WEIGHTS = {
    "H": 1.008,
    "C": 12.011,
    "N": 14.007,
    "O": 15.999,
    "S": 32.06,
    "P": 30.974,
    "SE": 78.96,
}
CONTACT_CUTOFF = 4.5
_PARSER = PDBParser(QUIET=True)
_SR = ShrakeRupley()


def _atom_element(atom) -> str:
    element = getattr(atom, "element", None)
    if element:
        return element.strip().upper()
    name = atom.get_name().strip()
    if name and name[0].isalpha():
        return name[0].upper()
    return "C"


def _atom_mass(atom) -> float:
    return ATOMIC_WEIGHTS.get(_atom_element(atom), 12.011)


def _is_heavy(atom) -> bool:
    return _atom_element(atom) != "H"


def _heavy_atoms(chain):
    atoms = []
    for residue in chain:
        for atom in residue:
            if _is_heavy(atom):
                atoms.append(atom)
    return atoms


def _residue_heavy_atoms(chain):
    out = []
    for residue in chain:
        heavy = [atom for atom in residue if _is_heavy(atom)]
        if heavy:
            out.append((residue.get_id(), heavy))
    return out


def _radius_of_gyration(atoms) -> float | None:
    if not atoms:
        return None
    coords = np.array([atom.get_coord() for atom in atoms], dtype=float)
    masses = np.array([_atom_mass(atom) for atom in atoms], dtype=float)
    total_mass = masses.sum()
    if total_mass <= 0:
        return None
    com = (coords * masses[:, None]).sum(axis=0) / total_mass
    sq = ((coords - com) ** 2).sum(axis=1)
    rg = float(np.sqrt((masses * sq).sum() / total_mass))
    return round(rg, 2)


def _min_atom_distance(atoms_a, atoms_b) -> float:
    best = float("inf")
    for atom_a in atoms_a:
        ca = atom_a.get_coord()
        for atom_b in atoms_b:
            cb = atom_b.get_coord()
            d = float(np.linalg.norm(ca - cb))
            if d < best:
                best = d
                if best < CONTACT_CUTOFF:
                    return best
    return best


def _interface_contacts(binder_chain, target_chain) -> int:
    binder_res = _residue_heavy_atoms(binder_chain)
    target_res = _residue_heavy_atoms(target_chain)
    contacts = 0
    for _, atoms_b in binder_res:
        for _, atoms_t in target_res:
            if _min_atom_distance(atoms_b, atoms_t) < CONTACT_CUTOFF:
                contacts += 1
    return contacts


def _structure_root(entity):
    structure = entity
    while structure.get_parent() is not None:
        structure = structure.get_parent()
    return structure


def _isolated_chain_sasa(chain) -> float:
    structure = copy.deepcopy(_structure_root(chain))
    model = structure[0]
    for chain_id in [c.id for c in model]:
        if chain_id != chain.id:
            model.detach_child(chain_id)
    _SR.compute(structure, level="R")
    total = 0.0
    for residue in model[chain.id]:
        total += float(getattr(residue, "sasa", 0.0))
    return total


def _complex_sasa(model) -> float:
    structure = _structure_root(model)
    _SR.compute(structure, level="R")
    total = 0.0
    for chain in model:
        for residue in chain:
            total += float(getattr(residue, "sasa", 0.0))
    return total


def _buried_surface(binder_chain, target_chain) -> float | None:
    try:
        model = binder_chain.get_parent()
        sasa_b = _isolated_chain_sasa(binder_chain)
        sasa_t = _isolated_chain_sasa(target_chain)
        sasa_c = _complex_sasa(model)
        bsa = sasa_b + sasa_t - sasa_c
        return round(max(bsa, 0.0), 1)
    except Exception:
        return None


def _sequence_metrics(binder_seq: str) -> dict[str, float | None]:
    seq = (binder_seq or "").strip().upper()
    if not seq or any(ch not in STANDARD_AA for ch in seq):
        return {
            "charge": None,
            "pi": None,
            "gravy": None,
            "mw_kda": None,
            "aromaticity": None,
            "instability": None,
        }
    pa = ProteinAnalysis(seq)
    return {
        "charge": round(pa.charge_at_pH(7.0), 1),
        "pi": round(pa.isoelectric_point(), 2),
        "gravy": round(pa.gravy(), 3),
        "mw_kda": round(pa.molecular_weight() / 1000.0, 2),
        "aromaticity": round(pa.aromaticity(), 3),
        "instability": round(pa.instability_index(), 1),
    }


def compute_metrics(
    pdb_path: str | Path,
    binder_seq: str,
    binder_chain: str = "A",
    target_chain: str = "B",
) -> dict[str, float | int | None]:
    """Calcula métricas estructurales/fisicoquímicas para un complejo binder–target."""
    path = Path(pdb_path)
    if not path.is_file():
        return {
            "rg": None,
            "if_contacts": None,
            "bsa": None,
            **_sequence_metrics(binder_seq),
        }

    try:
        structure = _PARSER.get_structure(path.stem, path)
        model = structure[0]
        binder = model[binder_chain]
        target = model[target_chain]
    except Exception:
        return {
            "rg": None,
            "if_contacts": None,
            "bsa": None,
            **_sequence_metrics(binder_seq),
        }

    rg = _radius_of_gyration(_heavy_atoms(binder))
    if_contacts = _interface_contacts(binder, target)
    bsa = _buried_surface(binder, target)

    return {
        "rg": rg,
        "if_contacts": if_contacts,
        "bsa": bsa,
        **_sequence_metrics(binder_seq),
    }
