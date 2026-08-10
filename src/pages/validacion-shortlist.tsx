import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, type Variants } from "framer-motion";
import { ComplexViewer } from "../components/ComplexViewer";
import {
  fmtChar,
  fmtSignedChar,
  gravyTrait,
  stabilityTrait,
  ValueWithTrait,
} from "../components/DesignCharacterization";
import {
  ABLATION_CONDS,
  HAPD1_ARMS,
} from "../data/experimentLabels";
import shortlistData from "../data/shortlistGoudy.json";
import hapd1VsPaper from "../data/hapd1Mono60VsPaper.json";

const fade: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

type Candidate = {
  id: string;
  rank: number;
  grupo: string;
  grupo_label: string;
  binder_seq: string;
  score_rosetta: number | null;
  dsasa: number | null;
  n_interface_res: number | null;
  rmsd_A: number | null;
  omega_class: string;
  pdb: string | null;
  length?: number;
  gravy?: number | null;
  instability?: number | null;
  mw_kda?: number | null;
  pI?: number | null;
  charge?: number | null;
  aromaticity?: number | null;
  epitope_coverage?: number | null;
  sc?: number | null;
  iptm?: number | null;
  pae_iface?: number | null;
  plddt_a?: number | null;
  overall_score?: number | null;
  ipsae?: number | null;
  design_sc?: number | null;
  af2_source?: string | null;
  haddock_score?: number | null;
  haddock_vs_native?: number | null;
  haddock_beats_native?: boolean | null;
  haddock_pdb?: string | null;
  haddock_if_contacts?: number | null;
  haddock_dsasa?: number | null;
};

type Panel = {
  status: string;
  candidates: Candidate[];
  note?: string | null;
  target?: string;
  haddock?: {
    native_control_score?: number;
    native_if_contacts?: number | null;
    native_dsasa?: number | null;
    struct_metrics_note?: string;
  } | null;
};

type PaperAid = {
  aid_id: number;
  kd_nM: number;
  binder_seq: string;
  plddt: number | null;
  iptm: number | null;
  pae: number | null;
  pdb: string;
  gravy: number | null;
  charge: number | null;
  pi: number | null;
  aromaticity: number | null;
  instability: number | null;
  mw_kda: number | null;
  rg?: number | null;
  if_contacts?: number | null;
  bsa?: number | null;
};

export type ShortlistPanelId = "moea_pool1208" | "hapd1_mono60";

const PANEL_COPY: Record<
  ShortlistPanelId,
  {
    title: string;
    subtitle: (n: number) => string;
    targetChip: string;
    tab: string;
  }
> = {
  moea_pool1208: {
    title: "Selección final",
    subtitle: (n) =>
      `Los ${n} candidatos del filtro sobre el conjunto no dominado. El score de docking se muestra junto a la referencia del complejo nativo VEGF–VEGFR-2 (−80.1).`,
    targetChip: "VEGF-A",
    tab: "VEGF-A",
  },
  hapd1_mono60: {
    title: "Selección final",
    subtitle: (n) =>
      `Los ${n} diseños HA-PD1 que pasan los filtros de validación. Se comparan con AiDs del artículo (Goudy et al. 2023).`,
    targetChip: "HA-PD1",
    tab: "HA-PD1",
  },
};

const PANEL_IDS: ShortlistPanelId[] = ["moea_pool1208", "hapd1_mono60"];
const AIDS = (hapd1VsPaper as { paper_aids: PaperAid[] }).paper_aids;
const NATIVE_HADDOCK_SCORE = -80.099;
const NATIVE_COMPLEX_PDB =
  "/pdbs/shortlist-haddock/vegfa_vegfr2_native_haddock.pdb";
const PANEL_DATA = shortlistData as {
  panels?: Record<string, Panel>;
};

function panelOf(id: ShortlistPanelId): Panel | undefined {
  return PANEL_DATA.panels?.[id];
}

function isNomech(grupo: string): boolean {
  return grupo.includes("nomech") || grupo.includes("sin");
}

function accentFor(c: Candidate, panelId: ShortlistPanelId): string {
  if (panelId === "hapd1_mono60") {
    const arm = c.grupo as keyof typeof HAPD1_ARMS;
    return HAPD1_ARMS[arm]?.color ?? HAPD1_ARMS.temp.color;
  }
  return isNomech(c.grupo)
    ? ABLATION_CONDS.sin.color
    : ABLATION_CONDS.con.color;
}

function fmt(n: number | null | undefined, digits = 2) {
  if (n == null || Number.isNaN(n)) return "—";
  return Number(n).toFixed(digits);
}

type CmpTone = "win" | "lose" | "neutral";

function cmpTone(
  design: number | null | undefined,
  aid: number | null | undefined,
  higherIsBetter: boolean
): CmpTone {
  if (design == null || aid == null || Number.isNaN(design) || Number.isNaN(aid))
    return "neutral";
  if (Math.abs(design - aid) < 1e-9) return "neutral";
  const better = higherIsBetter ? design > aid : design < aid;
  return better ? "win" : "lose";
}

function designLabel(c: Candidate): string {
  return `#${c.rank} · ${c.grupo_label}`;
}

function epiPct(c: Candidate): string {
  if (c.epitope_coverage == null || Number.isNaN(c.epitope_coverage)) return "—";
  return `${Math.round(100 * c.epitope_coverage)}%`;
}

function aidById(id: number) {
  return AIDS.find((a) => a.aid_id === id) ?? AIDS[0];
}

/** Max sliding-window identity; returns alignment of shorter onto longer. */
function alignSequences(a: string, b: string) {
  if (!a || !b) {
    return {
      identity: 0,
      short: a || b,
      long: a || b,
      offset: 0,
      matches: [] as boolean[],
    };
  }
  const aIsShort = a.length <= b.length;
  const short = aIsShort ? a : b;
  const long = aIsShort ? b : a;
  let bestOffset = 0;
  let bestMatches = 0;
  for (let off = 0; off <= long.length - short.length; off++) {
    let m = 0;
    for (let i = 0; i < short.length; i++) {
      if (short[i] === long[off + i]) m++;
    }
    if (m > bestMatches) {
      bestMatches = m;
      bestOffset = off;
    }
  }
  const matches = short
    .split("")
    .map((ch, i) => ch === long[bestOffset + i]);
  return {
    identity: short.length ? bestMatches / short.length : 0,
    short,
    long,
    offset: bestOffset,
    matches,
  };
}

function nearestAidId(seq: string): number {
  let bestId = AIDS[0]?.aid_id ?? 4;
  let bestIden = -1;
  for (const aid of AIDS) {
    const iden = alignSequences(seq, aid.binder_seq).identity;
    if (iden > bestIden) {
      bestIden = iden;
      bestId = aid.aid_id;
    }
  }
  return bestId;
}

export function ValidacionShortlist() {
  const [panelId, setPanelId] = useState<ShortlistPanelId>("moea_pool1208");
  const panel = panelOf(panelId);
  const copy = PANEL_COPY[panelId];
  const candidates = useMemo(
    () => [...(panel?.candidates ?? [])].sort((a, b) => a.rank - b.rank),
    [panel]
  );
  const [designId, setDesignId] = useState(candidates[0]?.id ?? "");
  const [aidId, setAidId] = useState<number | "nearest">("nearest");
  const [viewersActive, setViewersActive] = useState(false);
  const [designViewerActive, setDesignViewerActive] = useState(false);
  const viewersRef = useRef<HTMLDivElement | null>(null);

  const selectPanel = (id: ShortlistPanelId) => {
    setPanelId(id);
    const next = panelOf(id)?.candidates ?? [];
    const sorted = [...next].sort((a, b) => a.rank - b.rank);
    setDesignId(sorted[0]?.id ?? "");
    setAidId("nearest");
  };

  const active = useMemo(() => {
    const fromState = candidates.find((c) => c.id === designId);
    return fromState ?? candidates[0] ?? null;
  }, [candidates, designId]);

  const compareAids = panelId === "hapd1_mono60";
  const compareNative = panelId === "moea_pool1208";
  const isCompare = compareAids || compareNative;

  const nearestAid = useMemo(
    () => (active ? nearestAidId(active.binder_seq) : AIDS[0]?.aid_id ?? 4),
    [active]
  );

  const refAid = useMemo(() => {
    const id = aidId === "nearest" ? nearestAid : aidId;
    return aidById(id);
  }, [aidId, nearestAid]);

  const seqAlign = useMemo(
    () =>
      active
        ? alignSequences(active.binder_seq, refAid.binder_seq)
        : alignSequences("", ""),
    [active, refAid]
  );

  useEffect(() => {
    if (!isCompare) {
      setViewersActive(false);
      setDesignViewerActive(false);
      return;
    }
    const node = viewersRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) =>
        setViewersActive(entry.isIntersecting && entry.intersectionRatio > 0),
      { threshold: [0, 0.05, 0.15], rootMargin: "80px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isCompare, active?.id]);

  useEffect(() => {
    if (!viewersActive) {
      setDesignViewerActive(false);
      return;
    }
    const timer = window.setTimeout(() => setDesignViewerActive(true), 220);
    return () => window.clearTimeout(timer);
  }, [viewersActive, active?.id, refAid.aid_id]);

  if (!panel || panel.status === "pending" || !active) {
    return (
      <motion.div
        className="hapd1"
        variants={fade}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.12 }}
      >
        <h2 className="validacion-title">{copy.title}</h2>
        <div
          className="dockstory-case-controls"
          style={{ marginBottom: 14, gap: 8 }}
        >
          {PANEL_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className="dockstory-case-nav-btn"
              onClick={() => selectPanel(id)}
              style={{
                opacity: id === panelId ? 1 : 0.55,
                fontWeight: id === panelId ? 700 : 400,
              }}
            >
              {PANEL_COPY[id].tab}
            </button>
          ))}
        </div>
        <p className="validacion-sub">
          {panel?.note ?? "Pendiente del filtro."}
        </p>
      </motion.div>
    );
  }

  const accent = accentFor(active, panelId);
  const showEpitope = panelId === "moea_pool1208";
  const nativeIf = panel.haddock?.native_if_contacts ?? null;
  const nativeDsasa = panel.haddock?.native_dsasa ?? null;

  const gravy = gravyTrait(active.gravy);
  const stab = stabilityTrait(active.instability);
  const aidGravy = gravyTrait(refAid.gravy);
  const aidStab = stabilityTrait(refAid.instability);

  type MetricRow = { label: string; value: ReactNode };
  const designMetrics: MetricRow[] = showEpitope
    ? [
        ...(active.plddt_a != null || active.pae_iface != null
          ? [
              { label: "pLDDT", value: fmt(active.plddt_a, 1) },
              { label: "PAE iface", value: `${fmt(active.pae_iface, 1)} Å` },
            ]
          : [
              { label: "ipSAE", value: fmt(active.ipsae, 3) },
              { label: "SC", value: fmt(active.design_sc, 3) },
            ]),
        { label: "dG/dSASA×100", value: fmt(active.score_rosetta, 2) },
        ...(active.haddock_score != null
          ? [
              {
                label: "Docking",
                value: fmt(active.haddock_score, 1),
              },
            ]
          : []),
        { label: "Ω RMSD", value: `${fmt(active.rmsd_A, 2)} Å` },
        { label: "Epítopo VEGFR-2", value: epiPct(active) },
      ]
    : [
        { label: "pLDDT péptido", value: fmt(active.plddt_a, 1) },
        { label: "ipTM", value: fmt(active.iptm, 3) },
        { label: "PAE iface", value: `${fmt(active.pae_iface, 1)} Å` },
        { label: "Ω RMSD", value: `${fmt(active.rmsd_A, 2)} Å` },
      ];

  const charRows: MetricRow[] = [
    {
      label: "Contactos IF",
      value: fmtChar(active.n_interface_res, 0),
    },
    {
      label: "ΔSASA",
      value: `${fmtChar(active.dsasa, 0)} Å²`,
    },
    {
      label: "GRAVY",
      value: (
        <ValueWithTrait value={fmtChar(active.gravy, 3)} trait={gravy} />
      ),
    },
    {
      label: "Carga pH 7",
      value: fmtSignedChar(active.charge, 1),
    },
    {
      label: "pI",
      value: fmtChar(active.pI, 2),
    },
    {
      label: "II",
      value: (
        <ValueWithTrait value={fmtChar(active.instability, 1)} trait={stab} />
      ),
    },
    {
      label: "Aromaticidad",
      value: fmtChar(active.aromaticity, 3),
    },
    {
      label: "MW",
      value: `${fmtChar(active.mw_kda, 2)} kDa`,
    },
  ];

  return (
    <motion.div
      className={`hapd1 hapd1-shortlist${isCompare ? " is-compare" : ""}`}
      variants={fade}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.12 }}
    >
      <h2 className="validacion-title">{copy.title}</h2>
      <p className="validacion-sub">{copy.subtitle(candidates.length)}</p>

      <div className="dockstory-case-controls hapd1-shortlist-tabs">
        {PANEL_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className="dockstory-case-nav-btn"
            onClick={() => selectPanel(id)}
            style={{
              opacity: id === panelId ? 1 : 0.55,
              fontWeight: id === panelId ? 700 : 400,
            }}
          >
            {PANEL_COPY[id].tab}
          </button>
        ))}
      </div>

      <div className="hapd1-grid">
        <aside className="hapd1-sidebar">
          <section className="validacion-card hapd1-card hapd1-compare">
            <div
              className={`hapd1-filters${
                compareAids ? " hapd1-filters-2" : ""
              }`}
            >
              <label className="hapd1-label">
                Diseño
                <select
                  className="hapd1-select"
                  value={active.id}
                  onChange={(e) => setDesignId(e.target.value)}
                >
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {designLabel(c)}
                    </option>
                  ))}
                </select>
              </label>
              {compareAids ? (
                <label className="hapd1-label">
                  AiD
                  <select
                    className="hapd1-select"
                    value={String(aidId)}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAidId(v === "nearest" ? "nearest" : Number(v));
                    }}
                  >
                    <option value="nearest">
                      Mejor por identidad (AiD {nearestAid})
                    </option>
                    {AIDS.map((a) => (
                      <option key={a.aid_id} value={a.aid_id}>
                        AiD {a.aid_id} · KD {a.kd_nM} nM
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            {compareAids ? (
              <div className="hapd1-delta-head">
                <span className="hapd1-kd">
                  KD AiD <strong>{fmt(refAid.kd_nM, 1)} nM</strong>
                </span>
              </div>
            ) : compareNative ? (
              <div className="hapd1-delta-head">
                <span className="hapd1-kd">
                  Referencia nativa{" "}
                  <strong>{fmt(NATIVE_HADDOCK_SCORE, 1)}</strong>
                </span>
              </div>
            ) : null}

            {compareAids || compareNative ? (
              <>
                {compareAids ? (
                  <p className="hapd1-diff-key" aria-hidden>
                    <span className="hapd1-diff-swatch best" /> mejor valor
                  </p>
                ) : (
                  <p className="hapd1-diff-key">
                    Docking del nativo es referencia de protocolo (VEGFR ≫
                    péptido). Contactos IF y ΔSASA usan el mismo método en ambas
                    poses de docking.
                  </p>
                )}
                <table className="hapd1-delta-table hapd1-diff-table">
                  <thead>
                    <tr>
                      <th>Indicador</th>
                      <th>Diseño</th>
                      <th>{compareAids ? "AiD" : "Ref. nativa"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(compareAids
                      ? ([
                          {
                            section: "Validación",
                            label: "pLDDT péptido",
                            design: fmt(active.plddt_a, 1),
                            other: fmt(refAid.plddt, 1),
                            tone: cmpTone(active.plddt_a, refAid.plddt, true),
                          },
                          {
                            label: "ipTM",
                            design: fmt(active.iptm, 3),
                            other: fmt(refAid.iptm, 3),
                            tone: cmpTone(active.iptm, refAid.iptm, true),
                          },
                          {
                            label: "PAE iface",
                            design: `${fmt(active.pae_iface, 1)} Å`,
                            other: `${fmt(refAid.pae, 1)} Å`,
                            tone: cmpTone(active.pae_iface, refAid.pae, false),
                          },
                          {
                            label: "Ω RMSD",
                            design: `${fmt(active.rmsd_A, 2)} Å`,
                            other: "—",
                            tone: "neutral" as const,
                          },
                          {
                            label: "KD",
                            design: "—",
                            other: `${fmt(refAid.kd_nM, 1)} nM`,
                            tone: "neutral" as const,
                          },
                          {
                            section: "Estructura / péptido",
                            label: "Contactos IF",
                            design: fmtChar(active.n_interface_res, 0),
                            other: fmtChar(refAid.if_contacts ?? null, 0),
                            tone: cmpTone(
                              active.n_interface_res,
                              refAid.if_contacts,
                              true
                            ),
                          },
                          {
                            label: "ΔSASA",
                            design: `${fmtChar(active.dsasa, 0)} Å²`,
                            other: `${fmtChar(refAid.bsa ?? null, 0)} Å²`,
                            tone: cmpTone(active.dsasa, refAid.bsa, true),
                          },
                          {
                            label: "GRAVY",
                            design: (
                              <ValueWithTrait
                                value={fmtChar(active.gravy, 3)}
                                trait={gravy}
                              />
                            ),
                            other: (
                              <ValueWithTrait
                                value={fmtChar(refAid.gravy, 3)}
                                trait={aidGravy}
                              />
                            ),
                            tone: "neutral" as const,
                          },
                          {
                            label: "Carga pH 7",
                            design: fmtSignedChar(active.charge, 1),
                            other: fmtSignedChar(refAid.charge, 1),
                            tone: "neutral" as const,
                          },
                          {
                            label: "pI",
                            design: fmtChar(active.pI, 2),
                            other: fmtChar(refAid.pi, 2),
                            tone: "neutral" as const,
                          },
                          {
                            label: "II",
                            design: (
                              <ValueWithTrait
                                value={fmtChar(active.instability, 1)}
                                trait={stab}
                              />
                            ),
                            other: (
                              <ValueWithTrait
                                value={fmtChar(refAid.instability, 1)}
                                trait={aidStab}
                              />
                            ),
                            tone: cmpTone(
                              active.instability,
                              refAid.instability,
                              false
                            ),
                          },
                          {
                            label: "Aromaticidad",
                            design: fmtChar(active.aromaticity, 3),
                            other: fmtChar(refAid.aromaticity, 3),
                            tone: "neutral" as const,
                          },
                          {
                            label: "MW",
                            design: `${fmtChar(active.mw_kda, 2)} kDa`,
                            other: `${fmtChar(refAid.mw_kda, 2)} kDa`,
                            tone: "neutral" as const,
                          },
                        ] satisfies Array<{
                          section?: string;
                          label: string;
                          design: ReactNode;
                          other: ReactNode;
                          tone: CmpTone;
                        }>)
                      : ([
                          {
                            section: "Docking / interfaz",
                            label: "Docking",
                            design: fmt(active.haddock_score, 1),
                            other: fmt(NATIVE_HADDOCK_SCORE, 1),
                            tone: "neutral" as const,
                          },
                          {
                            label: "Contactos IF",
                            design: fmtChar(active.haddock_if_contacts, 0),
                            other: fmtChar(nativeIf, 0),
                            tone: "neutral" as const,
                          },
                          {
                            label: "ΔSASA",
                            design:
                              active.haddock_dsasa != null
                                ? `${fmtChar(active.haddock_dsasa, 0)} Å²`
                                : "—",
                            other:
                              nativeDsasa != null
                                ? `${fmtChar(nativeDsasa, 0)} Å²`
                                : "—",
                            tone: "neutral" as const,
                          },
                          {
                            label: "Epítopo VEGFR-2",
                            design: epiPct(active),
                            other: "sitio nativo",
                            tone: "neutral" as const,
                          },
                        ] satisfies Array<{
                          section?: string;
                          label: string;
                          design: ReactNode;
                          other: ReactNode;
                          tone: CmpTone;
                        }>
                    )).map((r) => (
                      <Fragment key={r.label}>
                        {r.section ? (
                          <tr className="hapd1-diff-section">
                            <td colSpan={3}>{r.section}</td>
                          </tr>
                        ) : null}
                        <tr className={`hapd1-diff-row tone-${r.tone}`}>
                          <td>
                            <span className="hapd1-delta-label">{r.label}</span>
                          </td>
                          <td
                            className={
                              r.tone === "win" ? "hapd1-val-best" : undefined
                            }
                          >
                            {r.design}
                          </td>
                          <td
                            className={
                              r.tone === "lose" ? "hapd1-val-best" : undefined
                            }
                          >
                            {r.other}
                          </td>
                        </tr>
                      </Fragment>
                    ))}
                  </tbody>
                </table>
                {compareNative ? (
                  <table className="hapd1-delta-table hapd1-diff-table">
                    <thead>
                      <tr>
                        <th>Indicador</th>
                        <th>Diseño</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="hapd1-diff-section">
                        <td colSpan={2}>Solo diseño (no aplica al nativo)</td>
                      </tr>
                      {(
                        [
                          {
                            label: "dG/dSASA×100",
                            value: fmt(active.score_rosetta, 2),
                          },
                          {
                            label: "Ω RMSD",
                            value: `${fmt(active.rmsd_A, 2)} Å`,
                          },
                          {
                            label: "GRAVY",
                            value: (
                              <ValueWithTrait
                                value={fmtChar(active.gravy, 3)}
                                trait={gravy}
                              />
                            ),
                          },
                          {
                            label: "Carga pH 7",
                            value: fmtSignedChar(active.charge, 1),
                          },
                          {
                            label: "pI",
                            value: fmtChar(active.pI, 2),
                          },
                          {
                            label: "II",
                            value: (
                              <ValueWithTrait
                                value={fmtChar(active.instability, 1)}
                                trait={stab}
                              />
                            ),
                          },
                          {
                            label: "Aromaticidad",
                            value: fmtChar(active.aromaticity, 3),
                          },
                          {
                            label: "MW",
                            value: `${fmtChar(active.mw_kda, 2)} kDa`,
                          },
                        ] as const
                      ).map((r) => (
                        <tr key={r.label}>
                          <td>
                            <span className="hapd1-delta-label">{r.label}</span>
                          </td>
                          <td>{r.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
              </>
            ) : (
              <table className="hapd1-delta-table hapd1-diff-table">
                <thead>
                  <tr>
                    <th>Indicador</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hapd1-diff-section">
                    <td colSpan={2}>Cribado</td>
                  </tr>
                  {designMetrics.map((r) => (
                    <tr key={r.label}>
                      <td>
                        <span className="hapd1-delta-label">{r.label}</span>
                      </td>
                      <td>{r.value}</td>
                    </tr>
                  ))}
                  <tr className="hapd1-diff-section">
                    <td colSpan={2}>Estructura / péptido</td>
                  </tr>
                  {charRows.map((r) => (
                    <tr key={r.label}>
                      <td>
                        <span className="hapd1-delta-label">{r.label}</span>
                      </td>
                      <td>{r.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="hapd1-seqs">
              <div className="hapd1-seq-block">
                <span className="hapd1-seq-label">
                  Secuencia · {active.length ?? active.binder_seq.length} aa
                </span>
                <code className="hapd1-seq">{active.binder_seq}</code>
              </div>
              {compareAids ? (
                <>
                  <div className="hapd1-seq-block">
                    <span className="hapd1-seq-label">
                      AiD {refAid.aid_id} · {refAid.binder_seq.length} aa
                    </span>
                    <code className="hapd1-seq">{refAid.binder_seq}</code>
                  </div>
                  <p className="hapd1-ident">
                    Identidad: {(seqAlign.identity * 100).toFixed(1)}%
                  </p>
                </>
              ) : null}
            </div>
          </section>
        </aside>

        <section className="hapd1-main">
          {isCompare ? (
            <>
              <div className="hapd1-viewers" ref={viewersRef}>
                <div className="validacion-card hapd1-card hapd1-viewer-card">
                  <div className="hapd1-viewer-head">
                    <span className="hapd1-tag aid">
                      {compareAids ? `AiD ${refAid.aid_id}` : "VEGFR-2 nativo"}
                    </span>
                  </div>
                  <ComplexViewer
                    key={
                      compareAids
                        ? `aid-${refAid.aid_id}`
                        : "native-vegfr2"
                    }
                    pdbUrl={compareAids ? refAid.pdb : NATIVE_COMPLEX_PDB}
                    referenceUrl={
                      compareAids ? refAid.pdb : NATIVE_COMPLEX_PDB
                    }
                    active={viewersActive ? true : undefined}
                  />
                </div>
                <div className="validacion-card hapd1-card hapd1-viewer-card">
                  <div className="hapd1-viewer-head">
                    <span className="hapd1-tag" style={{ color: accent }}>
                      Diseño
                    </span>
                  </div>
                  {(compareNative
                    ? active.haddock_pdb ?? active.pdb
                    : active.pdb) ? (
                    <ComplexViewer
                      key={`des-${active.id}-${compareNative ? "hd" : "af"}`}
                      pdbUrl={
                        (compareNative
                          ? active.haddock_pdb ?? active.pdb
                          : active.pdb) as string
                      }
                      referenceUrl={
                        (compareNative
                          ? active.haddock_pdb ?? active.pdb
                          : active.pdb) as string
                      }
                      active={designViewerActive ? true : undefined}
                    />
                  ) : (
                    <p className="dockstory-note">PDB no disponible</p>
                  )}
                </div>
              </div>
              <p className="hapd1-legend hapd1-legend-shared">
                {compareAids ? (
                  <>
                    <span className="ablacion-chip target" /> HA-PD1 ·{" "}
                    <span className="ablacion-chip binder" /> péptido (AiD |
                    diseño)
                  </>
                ) : (
                  <>
                    <span className="ablacion-chip target" /> VEGF-A ·{" "}
                    <span className="ablacion-chip binder" /> VEGFR-2 | péptido
                  </>
                )}
              </p>
            </>
          ) : (
            <div className="validacion-card hapd1-card hapd1-viewer-card moea-viewer-card">
              {active.pdb ? (
                <ComplexViewer
                  key={`${panelId}-${active.pdb}`}
                  pdbUrl={active.pdb}
                />
              ) : (
                <p className="dockstory-note">PDB no disponible</p>
              )}
              <p className="hapd1-legend">
                <span className="ablacion-chip target" /> {copy.targetChip} ·{" "}
                <span className="ablacion-chip binder" /> péptido diseñado
              </p>
            </div>
          )}
        </section>
      </div>
    </motion.div>
  );
}
