export type AeProblemaEntry = {
  id: string;
  seq: string;
  pdb: string;
  ok: boolean;
  color: string;
  tiltX: number;
  tiltY: number;
  latX: number;
  latY: number;
};

/** Candidatos MOEA (shortlist Goudy) usados en la demo del puente AE → diseño. */
export const AE_PROBLEMA_POOL: AeProblemaEntry[] = [
  {
    id: "interface_pae_plddt_nomech__0134",
    seq: "ANVVLLSGSQAISLLTSLLDQ",
    pdb: "/pdbs/shortlist-goudy/interface_pae_plddt_nomech__0134.pdb",
    ok: false,
    color: "#f59e0b",
    tiltX: -0.12,
    tiltY: 0.05,
    latX: -5,
    latY: 2,
  },
  {
    id: "ipsae_sc_nomech__0112",
    seq: "PPQAGEKLTHAEAIALLNSAQ",
    pdb: "/pdbs/shortlist-goudy/ipsae_sc_nomech__0112.pdb",
    ok: false,
    color: "#a855f7",
    tiltX: 0.1,
    tiltY: -0.04,
    latX: 6,
    latY: -2,
  },
  {
    id: "interface_pae_plddt_mech__0211",
    seq: "SWTYYAFIDANDEVWLIMVIN",
    pdb: "/pdbs/shortlist-goudy/interface_pae_plddt_mech__0211.pdb",
    ok: false,
    color: "#22d3ee",
    tiltX: 0.03,
    tiltY: 0.12,
    latX: -2,
    latY: 6,
  },
  {
    id: "ipsae_sc_nomech__0071",
    seq: "TPTDLVLSGKDAVKFLQSMLT",
    pdb: "/pdbs/shortlist-goudy/ipsae_sc_nomech__0071.pdb",
    ok: false,
    color: "#fb7185",
    tiltX: -0.08,
    tiltY: 0.1,
    latX: 4,
    latY: 4,
  },
  {
    id: "ipsae_sc_nomech__0043",
    seq: "QDVQYLVTVYNDGELVSSYIY",
    pdb: "/pdbs/shortlist-goudy/ipsae_sc_nomech__0043.pdb",
    ok: true,
    color: "#34d399",
    tiltX: 0,
    tiltY: 0,
    latX: 0,
    latY: 0,
  },
  {
    id: "interface_pae_plddt_nomech__0041",
    seq: "QQNVHLTHEEALQQALDLAGL",
    pdb: "/pdbs/shortlist-goudy/interface_pae_plddt_nomech__0041.pdb",
    ok: false,
    color: "#818cf8",
    tiltX: 0.11,
    tiltY: -0.08,
    latX: -4,
    latY: -5,
  },
];

export const AE_SEQ_PREVIEW = 10;

export function seqPreview(seq: string, n = AE_SEQ_PREVIEW): string {
  if (seq.length <= n) return seq;
  return `${seq.slice(0, n)}…`;
}
