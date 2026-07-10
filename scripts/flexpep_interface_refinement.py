#!/usr/bin/env python3
"""Orthogonal interface refinement for short VEGF-A binders with PyRosetta.

This stage is designed as a relative, orthogonal filter for a small set of
top-ranked peptide-VEGF-A complexes. It refines each complex locally with
all-atom physics and explicit peptide flexibility, then compares the design
against composition-matched scrambled controls that start from the same pose.

Expected manifest columns (CSV or TSV):
    candidate_id,parent_id,variant_id,kind,pdb_path,binder_chain,receptor_chain

Where:
    - candidate_id: logical candidate identifier.
    - parent_id: groups a design with its scrambled controls.
    - variant_id: unique row identifier.
    - kind: "design" or "scrambled" (aliases: control, negative).
    - pdb_path: path to the input complex PDB.
    - binder_chain / receptor_chain: optional overrides per row.

The external convention can remain A=binder and B=receptor. Internally, the
script rewrites the complex to receptor=A and peptide=B because the direct
PyRosetta FlexPepDock wrapper expects that arrangement to run stably.
"""

from __future__ import annotations

import argparse
import csv
import logging
import math
import shlex
import statistics
import sys
import tempfile
import warnings
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

try:
    import pyrosetta
    from pyrosetta import create_score_function, init, pose_from_pdb
    from pyrosetta.rosetta.core.kinematics import MoveMap
    from pyrosetta.rosetta.core.pack.task import TaskFactory
    from pyrosetta.rosetta.core.pack.task.operation import (
        IncludeCurrent,
        InitializeFromCommandline,
        OperateOnResidueSubset,
        PreventRepackingRLT,
        RestrictToRepacking,
    )
    from pyrosetta.rosetta.core.select.residue_selector import (
        ChainSelector,
        InterGroupInterfaceByVectorSelector,
    )
    from pyrosetta.rosetta.protocols.analysis import InterfaceAnalyzerMover
    from pyrosetta.rosetta.protocols.flexpep_docking import (
        FlexPepDockingFlags,
        FlexPepDockingPoseMetrics,
        FlexPepDockingProtocol,
    )
    from pyrosetta.rosetta.protocols.minimization_packing import PackRotamersMover
    from pyrosetta.rosetta.protocols.relax import FastRelax
    from pyrosetta.rosetta.protocols.simple_filters import ShapeComplementarityFilter
except ImportError as exc:  # pragma: no cover - import failure is handled at runtime
    pyrosetta = None
    PYROSETTA_IMPORT_ERROR = exc
else:
    PYROSETTA_IMPORT_ERROR = None

warnings.filterwarnings(
    "ignore",
    message="The `Pose.scores` dictionary is deprecated",
    category=DeprecationWarning,
)


BASE_INIT_FLAGS = "-mute all -ex1 -ex2aro -use_input_sc -no_optH false -flip_HNQ -constant_seed -jran {seed}"
FLEXPEP_INIT_FLAGS = "-pep_refine -flexPepDocking:receptor_chain A -flexPepDocking:peptide_chain B"
DEFAULT_CONTACT_CUTOFF = 5.0
DEFAULT_FUNCTIONAL_REFERENCE = Path("public/3V2A.pdb")
DEFAULT_FUNCTIONAL_RECEPTOR_CHAIN = "A"
DEFAULT_FUNCTIONAL_PARTNER_CHAIN = "R"
KIND_ALIASES = {
    "design": "design",
    "binder": "design",
    "candidate": "design",
    "scrambled": "scrambled",
    "control": "scrambled",
    "negative": "scrambled",
}
WATER_RESNAMES = {"HOH", "WAT", "DOD"}
MINIMIZE_METRICS = {"total_score", "flexpep_i_sc", "dG_separated"}
MAXIMIZE_METRICS = {"BSA", "packstat", "sc", "functional_overlap"}
CLI_STATE = {}
PYROSETTA_READY = False


@dataclass(frozen=True)
class ManifestEntry:
    candidate_id: str
    parent_id: str
    variant_id: str
    kind: str
    pdb_path: Path
    binder_chain: str
    receptor_chain: str


@dataclass(frozen=True)
class ResidueRecord:
    pose_index: int
    seq_position: int
    pdb_number: int
    icode: str
    chain: str
    name1: str


@dataclass(frozen=True)
class FunctionalPatch:
    source_pdb: Path
    receptor_chain: str
    partner_chain: str
    receptor_sequence: str
    patch_seq_positions: Tuple[int, ...]
    patch_labels: Tuple[str, ...]


@dataclass
class PreparedComplex:
    entry: ManifestEntry
    cleaned_external_pdb: Path
    internal_pdb: Path
    pose: "pyrosetta.rosetta.core.pose.Pose"
    receptor_records: List[ResidueRecord]
    receptor_sequence: str
    mapped_patch_positions: Tuple[int, ...]


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Orthogonal interface refinement for peptide-VEGF-A complexes with PyRosetta.",
    )
    parser.add_argument("--manifest", required=True, type=Path, help="CSV or TSV manifest of design/control complexes.")
    parser.add_argument("--outdir", required=True, type=Path, help="New output directory for this refinement stage.")
    parser.add_argument("--decoys", required=True, type=int, help="Number of FlexPepDock refinement decoys per complex.")
    parser.add_argument("--binder-chain", default="A", help="Default external binder chain ID.")
    parser.add_argument("--receptor-chain", default="B", help="Default external receptor chain ID.")
    parser.add_argument(
        "--functional-reference-pdb",
        type=Path,
        default=DEFAULT_FUNCTIONAL_REFERENCE,
        help="Reference PDB used to derive the VEGFR-2 functional patch (default: public/3V2A.pdb).",
    )
    parser.add_argument(
        "--functional-receptor-chain",
        default=DEFAULT_FUNCTIONAL_RECEPTOR_CHAIN,
        help="VEGF-A chain in the functional reference PDB.",
    )
    parser.add_argument(
        "--functional-partner-chain",
        default=DEFAULT_FUNCTIONAL_PARTNER_CHAIN,
        help="VEGFR-2 chain in the functional reference PDB.",
    )
    parser.add_argument("--seed", type=int, default=12345, help="Deterministic Rosetta RNG seed.")
    parser.add_argument("--relax-repeats", type=int, default=2, help="FastRelax repeats before FlexPepDock.")
    parser.add_argument("--relax-max-iter", type=int, default=200, help="FastRelax max iterations.")
    parser.add_argument(
        "--contact-cutoff",
        type=float,
        default=DEFAULT_CONTACT_CUTOFF,
        help="Heavy-atom contact cutoff in angstroms for site recovery and functional overlap.",
    )
    parser.add_argument(
        "--keep-hetatm",
        default="",
        help="Comma-separated residue names from HETATM records to preserve. Waters are always removed.",
    )
    return parser


def ensure_pyrosetta_available() -> None:
    if pyrosetta is None:
        raise RuntimeError(f"PyRosetta is not available in this environment: {PYROSETTA_IMPORT_ERROR}")


def validate_chain_id(chain_id: str, field_name: str) -> str:
    chain_id = (chain_id or "").strip()
    if len(chain_id) != 1:
        raise ValueError(f"{field_name} must be a single-character chain ID, got {chain_id!r}")
    return chain_id


def normalize_kind(value: str) -> str:
    normalized = KIND_ALIASES.get(value.strip().lower())
    if normalized is None:
        raise ValueError(f"Unsupported kind {value!r}; use design or scrambled/control.")
    return normalized


def parse_manifest(manifest_path: Path, default_binder_chain: str, default_receptor_chain: str) -> List[ManifestEntry]:
    if not manifest_path.is_file():
        raise FileNotFoundError(f"Manifest not found: {manifest_path}")
    sample = manifest_path.read_text(encoding="utf-8").splitlines()
    if not sample:
        raise ValueError(f"Manifest is empty: {manifest_path}")
    delimiter = "\t" if manifest_path.suffix.lower() in {".tsv", ".tab"} else ","
    entries: List[ManifestEntry] = []
    with manifest_path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle, delimiter=delimiter)
        required = {"candidate_id", "variant_id", "kind", "pdb_path"}
        missing = required.difference(reader.fieldnames or [])
        if missing:
            raise ValueError(f"Manifest missing required columns: {sorted(missing)}")
        for row in reader:
            if not any((value or "").strip() for value in row.values()):
                continue
            candidate_id = row["candidate_id"].strip()
            variant_id = row["variant_id"].strip()
            parent_id = (row.get("parent_id") or candidate_id).strip()
            kind = normalize_kind(row["kind"])
            pdb_path = Path(row["pdb_path"]).expanduser().resolve()
            binder_chain = validate_chain_id(row.get("binder_chain") or default_binder_chain, "binder_chain")
            receptor_chain = validate_chain_id(row.get("receptor_chain") or default_receptor_chain, "receptor_chain")
            if binder_chain == receptor_chain:
                raise ValueError(f"{variant_id}: binder_chain and receptor_chain must differ.")
            entries.append(
                ManifestEntry(
                    candidate_id=candidate_id,
                    parent_id=parent_id,
                    variant_id=variant_id,
                    kind=kind,
                    pdb_path=pdb_path,
                    binder_chain=binder_chain,
                    receptor_chain=receptor_chain,
                )
            )
    if not entries:
        raise ValueError("Manifest did not contain any usable rows.")
    return entries


def setup_output_dirs(outdir: Path) -> Dict[str, Path]:
    outdir = outdir.expanduser().resolve()
    subdirs = {
        "root": outdir,
        "prepared": outdir / "prepared_complexes",
        "relaxed": outdir / "relaxed_complexes",
        "best_models": outdir / "best_models",
        "logs": outdir / "logs",
    }
    for path in subdirs.values():
        path.mkdir(parents=True, exist_ok=True)
    return subdirs


def setup_logger(log_path: Path) -> logging.Logger:
    logger = logging.getLogger("flexpep_interface_refinement")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()
    formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)

    file_handler = logging.FileHandler(log_path, encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    return logger


def init_pyrosetta_once(seed: int, logger: logging.Logger) -> str:
    global PYROSETTA_READY
    ensure_pyrosetta_available()
    init_flags = f"{BASE_INIT_FLAGS.format(seed=seed)} {FLEXPEP_INIT_FLAGS}"
    if not PYROSETTA_READY:
        init(init_flags)
        PYROSETTA_READY = True
    logger.info("PyRosetta version: %s", pyrosetta_version_string())
    logger.info("PyRosetta init flags: %s", init_flags)
    logger.info("Random seed: %d", seed)
    return init_flags


def pyrosetta_version_string() -> str:
    return str(pyrosetta.version()).splitlines()[-1].strip()


def residue_name_from_line(line: str) -> str:
    return line[17:20].strip()


def rewrite_chain_id(line: str, new_chain: str) -> str:
    if len(line) < 22:
        return line
    return f"{line[:21]}{new_chain}{line[22:]}"


def collect_atom_lines_by_chain(lines: Iterable[str]) -> Dict[str, List[str]]:
    chains: Dict[str, List[str]] = {}
    for line in lines:
        if line[:6].strip() not in {"ATOM", "HETATM"}:
            continue
        chain = (line[21] if len(line) > 21 else "").strip()
        chains.setdefault(chain, []).append(line)
    return chains


def clean_complex_pdb(entry: ManifestEntry, out_path: Path, keep_hetatm: Sequence[str]) -> Path:
    keep_hetatm_set = {name.strip().upper() for name in keep_hetatm if name.strip()}
    source_lines = entry.pdb_path.read_text(encoding="utf-8", errors="ignore").splitlines()
    kept: List[str] = []
    present_chains = set()
    for line in source_lines:
        record = line[:6].strip()
        atom_name = line[12:16].strip() if len(line) >= 16 else ""
        if atom_name.startswith("H"):
            continue
        if record == "ATOM":
            chain = (line[21] if len(line) > 21 else "").strip()
            if chain in {entry.binder_chain, entry.receptor_chain}:
                kept.append(line)
                present_chains.add(chain)
        elif record == "HETATM":
            resname = residue_name_from_line(line).upper()
            if resname in WATER_RESNAMES or resname not in keep_hetatm_set:
                continue
            chain = (line[21] if len(line) > 21 else "").strip()
            if chain in {entry.binder_chain, entry.receptor_chain}:
                kept.append(line)
                present_chains.add(chain)
    if present_chains != {entry.binder_chain, entry.receptor_chain}:
        raise ValueError(
            f"{entry.variant_id}: after cleaning, expected chains "
            f"{sorted({entry.binder_chain, entry.receptor_chain})} but found {sorted(present_chains)}"
        )
    by_chain = collect_atom_lines_by_chain(kept)
    ordered_lines = by_chain[entry.binder_chain] + ["TER"] + by_chain[entry.receptor_chain] + ["TER", "END"]
    out_path.write_text("\n".join(ordered_lines) + "\n", encoding="utf-8")
    return out_path


def internalize_complex_pdb(entry: ManifestEntry, cleaned_external_pdb: Path, out_path: Path) -> Path:
    lines = cleaned_external_pdb.read_text(encoding="utf-8").splitlines()
    atom_lines = [line for line in lines if line[:6].strip() in {"ATOM", "HETATM"}]
    receptor_lines = [
        rewrite_chain_id(line, "A")
        for line in atom_lines
        if len(line) > 21 and line[21] == entry.receptor_chain
    ]
    peptide_lines = [
        rewrite_chain_id(line, "B")
        for line in atom_lines
        if len(line) > 21 and line[21] == entry.binder_chain
    ]
    if not receptor_lines or not peptide_lines:
        raise ValueError(f"{entry.variant_id}: failed to internalize receptor/peptide chains.")
    out_path.write_text("\n".join(receptor_lines + ["TER"] + peptide_lines + ["TER", "END"]) + "\n", encoding="utf-8")
    return out_path


def extract_chain_records(pose: "pyrosetta.rosetta.core.pose.Pose", chain_id: str) -> List[ResidueRecord]:
    pdb_info = pose.pdb_info()
    records: List[ResidueRecord] = []
    seq_position = 0
    for pose_index in range(1, pose.size() + 1):
        if pdb_info.chain(pose_index) != chain_id:
            continue
        seq_position += 1
        records.append(
            ResidueRecord(
                pose_index=pose_index,
                seq_position=seq_position,
                pdb_number=pdb_info.number(pose_index),
                icode=pdb_info.icode(pose_index).strip(),
                chain=chain_id,
                name1=pose.residue(pose_index).name1(),
            )
        )
    if not records:
        raise ValueError(f"Chain {chain_id!r} is empty in pose.")
    return records


def chain_sequence(records: Sequence[ResidueRecord]) -> str:
    return "".join(record.name1 for record in records)


def global_sequence_mapping(reference: str, target: str) -> Dict[int, int]:
    if reference == target:
        return {index: index for index in range(1, len(reference) + 1)}
    match_score = 2
    mismatch_score = -1
    gap_score = -1
    rows = len(reference) + 1
    cols = len(target) + 1
    scores = [[0] * cols for _ in range(rows)]
    back: List[List[str]] = [[""] * cols for _ in range(rows)]
    for i in range(1, rows):
        scores[i][0] = i * gap_score
        back[i][0] = "up"
    for j in range(1, cols):
        scores[0][j] = j * gap_score
        back[0][j] = "left"
    for i in range(1, rows):
        for j in range(1, cols):
            diag = scores[i - 1][j - 1] + (match_score if reference[i - 1] == target[j - 1] else mismatch_score)
            up = scores[i - 1][j] + gap_score
            left = scores[i][j - 1] + gap_score
            best = max(diag, up, left)
            if best == diag:
                back[i][j] = "diag"
            elif best == up:
                back[i][j] = "up"
            else:
                back[i][j] = "left"
            scores[i][j] = best
    mapping: Dict[int, int] = {}
    i = len(reference)
    j = len(target)
    while i > 0 or j > 0:
        direction = back[i][j]
        if direction == "diag":
            if reference[i - 1] == target[j - 1]:
                mapping[i] = j
            i -= 1
            j -= 1
        elif direction == "up":
            i -= 1
        elif direction == "left":
            j -= 1
        else:
            break
    return mapping


def heavy_atom_contact_positions(
    pose: "pyrosetta.rosetta.core.pose.Pose",
    query_chain: str,
    partner_chain: str,
    cutoff: float,
) -> List[int]:
    pdb_info = pose.pdb_info()
    query_positions = [i for i in range(1, pose.size() + 1) if pdb_info.chain(i) == query_chain]
    partner_positions = [i for i in range(1, pose.size() + 1) if pdb_info.chain(i) == partner_chain]
    cutoff_sq = cutoff * cutoff
    contacts: List[int] = []
    for query_index in query_positions:
        query_residue = pose.residue(query_index)
        found_contact = False
        for partner_index in partner_positions:
            partner_residue = pose.residue(partner_index)
            for atom_i in range(1, query_residue.nheavyatoms() + 1):
                xyz_i = query_residue.xyz(atom_i)
                for atom_j in range(1, partner_residue.nheavyatoms() + 1):
                    if (xyz_i - partner_residue.xyz(atom_j)).norm_squared() <= cutoff_sq:
                        contacts.append(query_index)
                        found_contact = True
                        break
                if found_contact:
                    break
            if found_contact:
                break
    return contacts


def jaccard_overlap(a: Sequence[int], b: Sequence[int]) -> float:
    set_a = set(a)
    set_b = set(b)
    if not set_a and not set_b:
        return 0.0
    return len(set_a & set_b) / len(set_a | set_b)


def pose_scores_dict(pose: "pyrosetta.rosetta.core.pose.Pose") -> Dict[str, float]:
    return {key: float(pose.scores[key]) for key in pose.scores.keys()}


def derive_functional_patch(
    reference_pdb: Path,
    receptor_chain: str,
    partner_chain: str,
    cutoff: float,
) -> FunctionalPatch:
    pose = pose_from_pdb(str(reference_pdb))
    receptor_records = extract_chain_records(pose, receptor_chain)
    receptor_sequence = chain_sequence(receptor_records)
    contact_pose_indices = heavy_atom_contact_positions(pose, receptor_chain, partner_chain, cutoff)
    index_to_record = {record.pose_index: record for record in receptor_records}
    patch_records = [index_to_record[index] for index in contact_pose_indices if index in index_to_record]
    return FunctionalPatch(
        source_pdb=reference_pdb,
        receptor_chain=receptor_chain,
        partner_chain=partner_chain,
        receptor_sequence=receptor_sequence,
        patch_seq_positions=tuple(record.seq_position for record in patch_records),
        patch_labels=tuple(format_residue_label(record, receptor_chain) for record in patch_records),
    )


def format_residue_label(record: ResidueRecord, chain_id: str) -> str:
    suffix = record.icode if record.icode else ""
    return f"{chain_id}:{record.pdb_number}{suffix}"


def map_patch_to_candidate(functional_patch: FunctionalPatch, candidate_sequence: str) -> Tuple[int, ...]:
    mapping = global_sequence_mapping(functional_patch.receptor_sequence, candidate_sequence)
    mapped = [mapping[position] for position in functional_patch.patch_seq_positions if position in mapping]
    return tuple(mapped)


def build_interface_selector() -> InterGroupInterfaceByVectorSelector:
    selector = InterGroupInterfaceByVectorSelector(ChainSelector("A"), ChainSelector("B"))
    return selector


def build_interface_task_factory(interface_selector: InterGroupInterfaceByVectorSelector) -> TaskFactory:
    task_factory = TaskFactory()
    task_factory.push_back(InitializeFromCommandline())
    task_factory.push_back(IncludeCurrent())
    task_factory.push_back(RestrictToRepacking())
    task_factory.push_back(OperateOnResidueSubset(PreventRepackingRLT(), ~interface_selector))
    return task_factory


def build_relax_movemap(
    pose: "pyrosetta.rosetta.core.pose.Pose",
    receptor_interface_positions: Sequence[int],
) -> MoveMap:
    movemap = MoveMap()
    movemap.set_jump(True)
    pdb_info = pose.pdb_info()
    for pose_index in range(1, pose.size() + 1):
        chain_id = pdb_info.chain(pose_index)
        if chain_id == "B":
            movemap.set_bb(pose_index, True)
            movemap.set_chi(pose_index, True)
        elif chain_id == "A" and pose_index in receptor_interface_positions:
            movemap.set_chi(pose_index, True)
    return movemap


def prepare_complex(
    entry: ManifestEntry,
    output_dirs: Dict[str, Path],
    keep_hetatm: Sequence[str],
    functional_patch: FunctionalPatch,
    logger: logging.Logger,
) -> PreparedComplex:
    cleaned_external_pdb = output_dirs["prepared"] / f"{entry.variant_id}__cleaned_external.pdb"
    internal_pdb = output_dirs["prepared"] / f"{entry.variant_id}__internal_AB.pdb"
    clean_complex_pdb(entry, cleaned_external_pdb, keep_hetatm)
    internalize_complex_pdb(entry, cleaned_external_pdb, internal_pdb)
    pose = pose_from_pdb(str(internal_pdb))
    receptor_records = extract_chain_records(pose, "A")
    receptor_sequence = chain_sequence(receptor_records)
    mapped_patch_positions = map_patch_to_candidate(functional_patch, receptor_sequence)
    coverage = len(mapped_patch_positions) / max(1, len(functional_patch.patch_seq_positions))
    if coverage < 0.8:
        logger.warning(
            "%s | Functional patch mapping coverage is low (%.1f%%). Review receptor sequence compatibility.",
            entry.variant_id,
            coverage * 100.0,
        )
    return PreparedComplex(
        entry=entry,
        cleaned_external_pdb=cleaned_external_pdb,
        internal_pdb=internal_pdb,
        pose=pose,
        receptor_records=receptor_records,
        receptor_sequence=receptor_sequence,
        mapped_patch_positions=mapped_patch_positions,
    )


def prepack_complex(
    pose: "pyrosetta.rosetta.core.pose.Pose",
    scorefxn: "pyrosetta.rosetta.core.scoring.ScoreFunction",
) -> Tuple["pyrosetta.rosetta.core.pose.Pose", List[int], Dict[str, float]]:
    interface_selector = build_interface_selector()
    interface_positions = interface_selector.get_residues(pose)
    selector_metadata = {
        "nearby_atom_cut": float(interface_selector.nearby_atom_cut()),
        "vector_dist_cut": float(interface_selector.vector_dist_cut()),
        "cb_dist_cut": float(interface_selector.cb_dist_cut()),
        "vector_angle_cut": float(interface_selector.vector_angle_cut()),
    }
    packer = PackRotamersMover(scorefxn, build_interface_task_factory(interface_selector))
    packed_pose = pose.clone()
    packer.apply(packed_pose)
    return packed_pose, interface_positions, selector_metadata


def relax_complex(
    pose: "pyrosetta.rosetta.core.pose.Pose",
    scorefxn: "pyrosetta.rosetta.core.scoring.ScoreFunction",
    receptor_interface_positions: Sequence[int],
    relax_repeats: int,
    relax_max_iter: int,
) -> "pyrosetta.rosetta.core.pose.Pose":
    relaxed_pose = pose.clone()
    relax = FastRelax(scorefxn, relax_repeats)
    relax.set_scorefxn(scorefxn)
    relax.set_task_factory(build_interface_task_factory(build_interface_selector()))
    relax.set_movemap(build_relax_movemap(relaxed_pose, receptor_interface_positions))
    relax.constrain_coords(True)
    relax.constrain_relax_to_start_coords(True)
    relax.coord_constrain_sidechains(True)
    relax.ramp_down_constraints(True)
    relax.max_iter(relax_max_iter)
    relax.apply(relaxed_pose)
    pyrosetta.rosetta.core.pose.remove_virtual_residues(relaxed_pose)
    return relaxed_pose


def build_flexpep_flags(pose: "pyrosetta.rosetta.core.pose.Pose") -> FlexPepDockingFlags:
    flags = FlexPepDockingFlags()
    flags.set_receptor_chain("A")
    flags.set_user_defined_receptor(True)
    flags.set_peptide_chain("B")
    flags.set_user_defined_peptide(True)
    flags.updateChains(pose)
    flags.setDefaultAnchors(pose)
    return flags


def run_flexpep_refinement_decoy(
    pose: "pyrosetta.rosetta.core.pose.Pose",
    scorefxn: "pyrosetta.rosetta.core.scoring.ScoreFunction",
    mapped_patch_positions: Sequence[int],
    contact_cutoff: float,
) -> Dict[str, object]:
    refined_pose = pose.clone()
    FlexPepDockingProtocol(1).apply(refined_pose)
    total_score = float(scorefxn(refined_pose))

    flexpep_flags = build_flexpep_flags(refined_pose)
    flexpep_metrics = FlexPepDockingPoseMetrics(flexpep_flags).calc_interface_metrics(refined_pose, 1, scorefxn)
    flexpep_i_sc = float(flexpep_metrics["I_sc"]) if "I_sc" in flexpep_metrics else math.nan
    flexpep_reweighted: Optional[float] = None
    score_cache = pose_scores_dict(refined_pose)
    for key in ("reweighted_sc", "reweighted_score"):
        if key in score_cache:
            flexpep_reweighted = score_cache[key]
            break

    analyzer = InterfaceAnalyzerMover("B_A", False, scorefxn)
    analyzer.set_compute_interface_sc(True)
    analyzer.set_compute_packstat(True)
    analyzer.set_compute_interface_delta_hbond_unsat(True)
    analyzer.set_compute_separated_sasa(True)
    analyzer.set_pack_input(False)
    analyzer.set_pack_separated(False)
    analyzer.apply(refined_pose)

    analyzer_scores = pose_scores_dict(refined_pose)
    sc_filter = ShapeComplementarityFilter()
    sc_filter.jump_id(1)
    sc_value = float(sc_filter.score(refined_pose))

    receptor_records = extract_chain_records(refined_pose, "A")
    index_to_record = {record.pose_index: record for record in receptor_records}
    contact_pose_indices = heavy_atom_contact_positions(refined_pose, "A", "B", contact_cutoff)
    contact_records = [index_to_record[index] for index in contact_pose_indices if index in index_to_record]
    contact_seq_positions = tuple(record.seq_position for record in contact_records)

    return {
        "pose": refined_pose,
        "total_score": total_score,
        "flexpep_i_sc": flexpep_i_sc,
        "flexpep_reweighted": flexpep_reweighted,
        "dG_separated": float(analyzer.get_interface_dG()),
        "BSA": float(analyzer.get_interface_delta_sasa()),
        "nres_int": int(analyzer.get_num_interface_residues()),
        "delta_unsatHbonds": float(analyzer.get_interface_delta_hbond_unsat()),
        "hbonds_int": float(analyzer_scores.get("hbonds_int", math.nan)),
        "packstat": float(analyzer.get_interface_packstat()),
        "sc": sc_value,
        "functional_overlap": jaccard_overlap(contact_seq_positions, mapped_patch_positions),
        "receptor_contact_seq_positions": ";".join(str(position) for position in contact_seq_positions),
        "receptor_contact_labels": ";".join(format_residue_label(record, "A") for record in contact_records),
    }


def best_metric_value(metric: str, values: Sequence[float]) -> float:
    if metric in MINIMIZE_METRICS:
        return min(values)
    return max(values)


def summarize_variant(entry: ManifestEntry, rows: Sequence[Dict[str, object]]) -> Dict[str, object]:
    summary: Dict[str, object] = {
        "candidate_id": entry.candidate_id,
        "parent_id": entry.parent_id,
        "variant_id": entry.variant_id,
        "kind": entry.kind,
        "pdb_path": str(entry.pdb_path),
        "n_decoys": len(rows),
    }
    metrics = [
        "total_score",
        "flexpep_i_sc",
        "dG_separated",
        "BSA",
        "packstat",
        "sc",
        "functional_overlap",
    ]
    for metric in metrics:
        numeric_values = [float(row[metric]) for row in rows if is_finite_number(row[metric])]
        if not numeric_values:
            summary[f"best_{metric}"] = math.nan
            summary[f"median_{metric}"] = math.nan
            continue
        summary[f"best_{metric}"] = best_metric_value(metric, numeric_values)
        summary[f"median_{metric}"] = float(statistics.median(numeric_values))
    best_row = min(rows, key=lambda row: float(row["total_score"]))
    summary["best_decoy_index"] = best_row["decoy_index"]
    summary["best_receptor_contact_labels"] = best_row["receptor_contact_labels"]
    summary["best_receptor_contact_seq_positions"] = best_row["receptor_contact_seq_positions"]
    return summary


def is_finite_number(value: object) -> bool:
    if isinstance(value, bool):
        return False
    if isinstance(value, (int, float)):
        return math.isfinite(float(value))
    return False


def mannwhitney_u_p(a: Sequence[float], b: Sequence[float]) -> Tuple[float, float]:
    combined = sorted([(value, 0) for value in a] + [(value, 1) for value in b])
    ranks = [0.0] * len(combined)
    i = 0
    while i < len(combined):
        j = i
        while j + 1 < len(combined) and combined[j + 1][0] == combined[i][0]:
            j += 1
        rank = (i + j) / 2 + 1
        for k in range(i, j + 1):
            ranks[k] = rank
        i = j + 1
    rank_sum_a = sum(ranks[index] for index in range(len(combined)) if combined[index][1] == 0)
    n_a = len(a)
    n_b = len(b)
    u_a = rank_sum_a - n_a * (n_a + 1) / 2
    mu = n_a * n_b / 2
    sigma = math.sqrt(n_a * n_b * (n_a + n_b + 1) / 12)
    z_score = (u_a - mu) / sigma if sigma else 0.0
    p_value = 2 * (1 - 0.5 * (1 + math.erf(abs(z_score) / math.sqrt(2))))
    return u_a, p_value


def cliffs_delta(a: Sequence[float], b: Sequence[float]) -> float:
    greater = 0
    lower = 0
    for value_a in a:
        for value_b in b:
            if value_a > value_b:
                greater += 1
            elif value_a < value_b:
                lower += 1
    total = len(a) * len(b)
    return (greater - lower) / total if total else 0.0


def classify_effect_size(delta: float) -> str:
    magnitude = abs(delta)
    if magnitude < 0.147:
        return "negligible"
    if magnitude < 0.33:
        return "small"
    if magnitude < 0.474:
        return "medium"
    return "large"


def compute_stats_rows(decoy_rows: Sequence[Dict[str, object]]) -> List[Dict[str, object]]:
    stats_rows: List[Dict[str, object]] = []
    metrics = ["total_score", "flexpep_i_sc", "dG_separated", "BSA", "packstat", "sc", "functional_overlap"]
    by_parent: Dict[str, List[Dict[str, object]]] = {}
    for row in decoy_rows:
        by_parent.setdefault(str(row["parent_id"]), []).append(row)
    for parent_id, rows in sorted(by_parent.items()):
        design_rows = [row for row in rows if row["kind"] == "design"]
        scrambled_rows = [row for row in rows if row["kind"] == "scrambled"]
        if not design_rows or not scrambled_rows:
            continue
        for metric in metrics:
            design_values = [float(row[metric]) for row in design_rows if is_finite_number(row[metric])]
            scrambled_values = [float(row[metric]) for row in scrambled_rows if is_finite_number(row[metric])]
            if not design_values or not scrambled_values:
                continue
            u_stat, p_value = mannwhitney_u_p(design_values, scrambled_values)
            delta = cliffs_delta(design_values, scrambled_values)
            stats_rows.append(
                {
                    "candidate_id": parent_id,
                    "metric": metric,
                    "n_design": len(design_values),
                    "n_scrambled": len(scrambled_values),
                    "design_median": float(statistics.median(design_values)),
                    "scrambled_median": float(statistics.median(scrambled_values)),
                    "U": u_stat,
                    "p_value": p_value,
                    "cliffs_delta": delta,
                    "effect_size": classify_effect_size(delta),
                    "better_direction": "lower_is_better" if metric in MINIMIZE_METRICS else "higher_is_better",
                }
            )
    return stats_rows


def build_verdict_rows(
    summary_rows: Sequence[Dict[str, object]],
    stats_rows: Sequence[Dict[str, object]],
) -> List[Dict[str, object]]:
    stats_index = {(row["candidate_id"], row["metric"]): row for row in stats_rows}
    by_parent: Dict[str, Dict[str, List[Dict[str, object]]]] = {}
    for row in summary_rows:
        by_parent.setdefault(str(row["parent_id"]), {"design": [], "scrambled": []})[str(row["kind"])].append(row)
    verdict_rows: List[Dict[str, object]] = []
    for parent_id, grouped in sorted(by_parent.items()):
        designs = grouped["design"]
        scrambles = grouped["scrambled"]
        if not designs:
            continue
        design = designs[0]
        best_scramble_dg = min((float(row["median_dG_separated"]) for row in scrambles), default=math.inf)
        best_scramble_overlap = max((float(row["median_functional_overlap"]) for row in scrambles), default=-math.inf)
        best_scramble_best_overlap = max((float(row["best_functional_overlap"]) for row in scrambles), default=-math.inf)
        dg_stats = stats_index.get((parent_id, "dG_separated"))
        overlap_stats = stats_index.get((parent_id, "functional_overlap"))

        dg_significant = bool(
            dg_stats
            and float(dg_stats["p_value"]) < 0.05
            and float(dg_stats["design_median"]) < float(dg_stats["scrambled_median"])
        )
        dg_large_effect = bool(dg_stats and abs(float(dg_stats["cliffs_delta"])) >= 0.474)
        overlap_beats_controls = (
            float(design["median_functional_overlap"]) > best_scramble_overlap
            and float(design["best_functional_overlap"]) > best_scramble_best_overlap
        )
        composition_alarm = (
            float(design["median_dG_separated"]) >= best_scramble_dg
            and float(design["best_functional_overlap"]) <= best_scramble_best_overlap
        )

        if composition_alarm:
            verdict = "descartar"
            note = "Un barajado iguala o supera dG y overlap; la señal parece dominada por composición."
        elif dg_significant and dg_large_effect and overlap_beats_controls:
            verdict = "fuerte"
            note = "La interfaz resiste el refinamiento y supera a los barajados tanto en estabilidad relativa como en recuperación funcional."
        elif dg_significant and overlap_beats_controls:
            verdict = "moderado"
            note = "Hay ventaja estadística en estabilidad y el parche funcional se recupera mejor que en los controles."
        elif dg_significant or overlap_beats_controls:
            verdict = "preliminar"
            note = "La señal es prometedora pero aún parcial: mejora en energía relativa o en recuperación funcional, no ambas de forma clara."
        else:
            verdict = "descartar"
            note = "No hay una separación robusta frente a los barajados en esta etapa ortogonal."

        verdict_rows.append(
            {
                "candidate_id": parent_id,
                "variant_id": design["variant_id"],
                "median_dG_separated": design["median_dG_separated"],
                "median_overlap": design["median_functional_overlap"],
                "best_overlap": design["best_functional_overlap"],
                "dG_p_value": float(dg_stats["p_value"]) if dg_stats else math.nan,
                "dG_cliffs_delta": float(dg_stats["cliffs_delta"]) if dg_stats else math.nan,
                "overlap_p_value": float(overlap_stats["p_value"]) if overlap_stats else math.nan,
                "verdict": verdict,
                "note": note,
            }
        )
    return verdict_rows


def dump_external_pose(
    pose: "pyrosetta.rosetta.core.pose.Pose",
    out_path: Path,
    binder_chain: str,
    receptor_chain: str,
) -> None:
    with tempfile.NamedTemporaryFile("w+", suffix=".pdb", delete=False) as handle:
        temp_path = Path(handle.name)
    pose.dump_pdb(str(temp_path))
    lines = temp_path.read_text(encoding="utf-8").splitlines()
    atom_lines = [line for line in lines if line[:6].strip() in {"ATOM", "HETATM"}]
    binder_lines = [rewrite_chain_id(line, binder_chain) for line in atom_lines if len(line) > 21 and line[21] == "B"]
    receptor_lines = [rewrite_chain_id(line, receptor_chain) for line in atom_lines if len(line) > 21 and line[21] == "A"]
    out_path.write_text("\n".join(binder_lines + ["TER"] + receptor_lines + ["TER", "END"]) + "\n", encoding="utf-8")
    temp_path.unlink(missing_ok=True)


def write_csv(path: Path, rows: Sequence[Dict[str, object]], fieldnames: Sequence[str]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def render_readme(
    outdir: Path,
    init_flags: str,
    functional_patch: FunctionalPatch,
    selector_metadata: Dict[str, float],
    summary_rows: Sequence[Dict[str, object]],
    stats_rows: Sequence[Dict[str, object]],
    verdict_rows: Sequence[Dict[str, object]],
    failures: Sequence[str],
) -> None:
    selector_line = "- Prepack interface selector defaults: n/a"
    if selector_metadata:
        selector_line = (
            "- Prepack interface selector defaults: "
            f"`nearby_atom_cut={selector_metadata['nearby_atom_cut']}` "
            f"`vector_dist_cut={selector_metadata['vector_dist_cut']}` "
            f"`cb_dist_cut={selector_metadata['cb_dist_cut']}` "
            f"`vector_angle_cut={selector_metadata['vector_angle_cut']}`"
        )
    lines = [
        "# Orthogonal Interface Refinement",
        "",
        "## Reproducibility",
        "",
        f"- Command: `{shlex.join(sys.argv)}`",
        f"- PyRosetta version: `{pyrosetta_version_string()}`",
        "- Score function: `ref2015`",
        f"- Init flags: `{init_flags}`",
        f"- Seed: `{CLI_STATE['seed']}`",
        f"- FlexPepDock decoys per complex: `{CLI_STATE['decoys']}`",
        f"- FastRelax repeats: `{CLI_STATE['relax_repeats']}`",
        f"- FastRelax max iterations: `{CLI_STATE['relax_max_iter']}`",
        f"- Contact cutoff for site recovery / overlap: `{CLI_STATE['contact_cutoff']:.2f} A`",
        selector_line,
        (
            f"- Functional patch reference: `{functional_patch.source_pdb}` "
            f"({functional_patch.receptor_chain} vs {functional_patch.partner_chain})"
        ),
        f"- Functional patch residues (reference sequence positions): `{', '.join(str(x) for x in functional_patch.patch_seq_positions)}`",
        f"- Functional patch residues (reference PDB labels): `{', '.join(functional_patch.patch_labels)}`",
        "",
        "## Notes",
        "",
        "- This stage supports relative ranking only. It does not estimate absolute affinity or Kd.",
        "- `flexpep_I_sc` is extracted directly from `FlexPepDockingPoseMetrics`.",
        "- `flexpep_reweighted` is reported only if the direct PyRosetta wrapper exposes it in pose scores; otherwise it remains blank.",
        "- Functional overlap is computed in receptor sequence-position space after aligning the candidate receptor to the VEGF-A chain from `3V2A`.",
        "",
        "## Candidate Verdicts",
        "",
        "| Candidate | Variant | Median dG_separated | Median overlap | Best overlap | dG p-value | Cliff's delta | Verdict | Note |",
        "| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |",
    ]
    for row in verdict_rows:
        lines.append(
            f"| {row['candidate_id']} | {row['variant_id']} | "
            f"{float(row['median_dG_separated']):.3f} | {float(row['median_overlap']):.3f} | "
            f"{float(row['best_overlap']):.3f} | {float(row['dG_p_value']):.4g} | "
            f"{float(row['dG_cliffs_delta']):.3f} | {row['verdict']} | {row['note']} |"
        )
    if not verdict_rows:
        lines.append("| n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | No design rows completed. |")

    lines.extend(
        [
            "",
            "## Outputs",
            "",
            "- `flexpep_decoys.csv`: per-decoy metrics for every design and scrambled control.",
            "- `flexpep_interface_summary.csv`: best and median metrics per variant.",
            "- `flexpep_vs_scrambled_stats.csv`: Mann-Whitney U and Cliff's delta by candidate and metric.",
            "- `best_models/`: best refined design model per candidate in the external chain convention.",
        ]
    )
    if failures:
        lines.extend(
            [
                "",
                "## Failures",
                "",
            ]
        )
        for failure in failures:
            lines.append(f"- {failure}")
    (outdir / "README.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    args = build_arg_parser().parse_args()
    CLI_STATE.update(
        {
            "seed": args.seed,
            "decoys": args.decoys,
            "relax_repeats": args.relax_repeats,
            "relax_max_iter": args.relax_max_iter,
            "contact_cutoff": args.contact_cutoff,
        }
    )

    output_dirs = setup_output_dirs(args.outdir)
    logger = setup_logger(output_dirs["logs"] / "flexpep_interface_refinement.log")
    init_flags = init_pyrosetta_once(args.seed, logger)

    keep_hetatm = [token.strip().upper() for token in args.keep_hetatm.split(",") if token.strip()]
    entries = parse_manifest(
        args.manifest.resolve(),
        validate_chain_id(args.binder_chain, "binder_chain"),
        validate_chain_id(args.receptor_chain, "receptor_chain"),
    )
    logger.info("Loaded %d manifest rows from %s", len(entries), args.manifest.resolve())

    functional_patch = derive_functional_patch(
        args.functional_reference_pdb.resolve(),
        validate_chain_id(args.functional_receptor_chain, "functional_receptor_chain"),
        validate_chain_id(args.functional_partner_chain, "functional_partner_chain"),
        args.contact_cutoff,
    )
    logger.info(
        "Functional patch from %s contains %d receptor residues.",
        functional_patch.source_pdb,
        len(functional_patch.patch_seq_positions),
    )

    scorefxn = create_score_function("ref2015")
    all_decoy_rows: List[Dict[str, object]] = []
    summary_rows: List[Dict[str, object]] = []
    failures: List[str] = []
    selector_metadata: Dict[str, float] = {}
    best_design_models: Dict[str, Tuple[float, ManifestEntry, "pyrosetta.rosetta.core.pose.Pose"]] = {}

    for entry in entries:
        logger.info("Running %s (%s)", entry.variant_id, entry.kind)
        try:
            prepared = prepare_complex(entry, output_dirs, keep_hetatm, functional_patch, logger)
            prepacked_pose, interface_positions, selector_metadata = prepack_complex(prepared.pose, scorefxn)
            relaxed_pose = relax_complex(
                prepacked_pose,
                scorefxn,
                interface_positions,
                args.relax_repeats,
                args.relax_max_iter,
            )
            relaxed_external_pdb = output_dirs["relaxed"] / f"{entry.variant_id}__relaxed_external.pdb"
            dump_external_pose(relaxed_pose, relaxed_external_pdb, entry.binder_chain, entry.receptor_chain)

            variant_rows: List[Dict[str, object]] = []
            best_variant_score = math.inf
            best_variant_pose = None
            for decoy_index in range(1, args.decoys + 1):
                metrics = run_flexpep_refinement_decoy(
                    relaxed_pose,
                    scorefxn,
                    prepared.mapped_patch_positions,
                    args.contact_cutoff,
                )
                pose = metrics.pop("pose")
                row = {
                    "candidate_id": entry.candidate_id,
                    "parent_id": entry.parent_id,
                    "variant_id": entry.variant_id,
                    "kind": entry.kind,
                    "source_pdb": str(entry.pdb_path),
                    "binder_chain": entry.binder_chain,
                    "receptor_chain": entry.receptor_chain,
                    "decoy_index": decoy_index,
                    **metrics,
                }
                row["receptor_contact_labels"] = str(row["receptor_contact_labels"]).replace("A:", f"{entry.receptor_chain}:")
                variant_rows.append(row)
                if float(row["total_score"]) < best_variant_score:
                    best_variant_score = float(row["total_score"])
                    best_variant_pose = pose.clone()
            if best_variant_pose is None:
                raise RuntimeError(f"{entry.variant_id}: no decoys completed.")
            all_decoy_rows.extend(variant_rows)
            summary_row = summarize_variant(entry, variant_rows)
            summary_rows.append(summary_row)

            if entry.kind == "design":
                current = best_design_models.get(entry.parent_id)
                if current is None or best_variant_score < current[0]:
                    best_design_models[entry.parent_id] = (best_variant_score, entry, best_variant_pose)
        except Exception as exc:  # pragma: no cover - pipeline should keep going when possible
            failure = f"{entry.variant_id}: {exc}"
            logger.exception("Failure while processing %s", entry.variant_id)
            failures.append(failure)

    decoy_fieldnames = [
        "candidate_id",
        "parent_id",
        "variant_id",
        "kind",
        "source_pdb",
        "binder_chain",
        "receptor_chain",
        "decoy_index",
        "total_score",
        "flexpep_i_sc",
        "flexpep_reweighted",
        "dG_separated",
        "BSA",
        "nres_int",
        "delta_unsatHbonds",
        "hbonds_int",
        "packstat",
        "sc",
        "functional_overlap",
        "receptor_contact_seq_positions",
        "receptor_contact_labels",
    ]
    summary_fieldnames = [
        "candidate_id",
        "parent_id",
        "variant_id",
        "kind",
        "pdb_path",
        "n_decoys",
        "best_decoy_index",
        "best_total_score",
        "median_total_score",
        "best_flexpep_i_sc",
        "median_flexpep_i_sc",
        "best_dG_separated",
        "median_dG_separated",
        "best_BSA",
        "median_BSA",
        "best_packstat",
        "median_packstat",
        "best_sc",
        "median_sc",
        "best_functional_overlap",
        "median_functional_overlap",
        "best_receptor_contact_labels",
        "best_receptor_contact_seq_positions",
    ]

    write_csv(output_dirs["root"] / "flexpep_decoys.csv", all_decoy_rows, decoy_fieldnames)
    write_csv(output_dirs["root"] / "flexpep_interface_summary.csv", summary_rows, summary_fieldnames)

    stats_rows = compute_stats_rows(all_decoy_rows)
    stats_fieldnames = [
        "candidate_id",
        "metric",
        "n_design",
        "n_scrambled",
        "design_median",
        "scrambled_median",
        "U",
        "p_value",
        "cliffs_delta",
        "effect_size",
        "better_direction",
    ]
    write_csv(output_dirs["root"] / "flexpep_vs_scrambled_stats.csv", stats_rows, stats_fieldnames)

    for parent_id, (_, entry, pose) in best_design_models.items():
        out_path = output_dirs["best_models"] / f"{parent_id}__best_refined.pdb"
        dump_external_pose(pose, out_path, entry.binder_chain, entry.receptor_chain)

    verdict_rows = build_verdict_rows(summary_rows, stats_rows)
    render_readme(
        output_dirs["root"],
        init_flags,
        functional_patch,
        selector_metadata,
        summary_rows,
        stats_rows,
        verdict_rows,
        failures,
    )
    logger.info("Finished. Results written to %s", output_dirs["root"])


if __name__ == "__main__":
    main()
