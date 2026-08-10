import { useEffect, useMemo, useRef, useState, Fragment, type ReactNode } from "react";
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
  EXPERIMENT_ARMS,
  formatDesignLabel,
} from "../data/experimentLabels";
import raw from "../data/hapd1Mono60VsPaper.json";

const fade: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

type Arm = "base" | "temp" | "mutation";

type PeptideProps = {
  gravy: number | null;
  charge: number | null;
  pi: number | null;
  aromaticity: number | null;
  instability: number | null;
  mw_kda: number | null;
};

type PaperAid = {
  aid_id: number;
  kd_nM: number;
  binder_seq: string;
  plddt: number | null;
  iptm: number | null;
  pae: number | null;
  complex_plddt: number | null;
  overall_score: number | null;
  plddt_chain_a?: number | null;
  contact?: number | null;
  bonus?: number | null;
  pdb: string;
  rg?: number | null;
  if_contacts?: number | null;
  bsa?: number | null;
} & PeptideProps;

type Design = {
  id: string;
  label?: string;
  run: string;
  source_run?: string;
  arm: Arm;
  sol_index?: number;
  rank: number | null;
  criterion: "by_score" | "by_interface";
  criteria: string[];
  rank_by_score: number | null;
  rank_by_interface: number | null;
  binder_seq: string;
  overall_score: number;
  plddt_a: number | null;
  iptm: number | null;
  pae_iface: number | null;
  contact?: number | null;
  degenerate: boolean;
  al_fraction: number;
  pdb: string | null;
  pdb_resolved: boolean;
  nearest_aid_id: number;
  seq_identity_to_nearest_aid: number;
  delta_vs_nearest_aid: {
    plddt: number | null;
    iptm: number | null;
    pae: number | null;
  };
  best_iptm_aid_id: number;
  rg?: number | null;
  if_contacts?: number | null;
  bsa?: number | null;
} & PeptideProps;

type AidRefMode = "nearest_identity" | "best_iptm" | number;

const ARM_ORDER: Arm[] = ["mutation", "base", "temp"];

const ARM_META: Record<Arm, { label: string; short: string; color: string }> = {
  mutation: EXPERIMENT_ARMS.mutation,
  base: EXPERIMENT_ARMS.base,
  temp: EXPERIMENT_ARMS.temp,
};

const DESIGNS = raw.designs as Design[];
const AIDS = raw.paper_aids as PaperAid[];

const POOL = DESIGNS.filter(
  (d) => d.pdb_resolved && d.pdb && !d.degenerate
);

/** Mejores mono-60: top-1 overall_score por brazo + top-2 ipTM AF2. */
function pickBestMono(designs: Design[]): Design[] {
  const byId = new Map<string, Design>();
  for (const arm of ARM_ORDER) {
    const best = designs
      .filter((d) => d.arm === arm)
      .sort((a, b) => a.overall_score - b.overall_score)[0];
    if (best) byId.set(best.id, best);
  }
  const byIptm = [...designs].sort((a, b) => (b.iptm ?? -1) - (a.iptm ?? -1));
  for (const d of byIptm.slice(0, 2)) byId.set(d.id, d);
  return [...byId.values()].sort((a, b) => a.overall_score - b.overall_score);
}

const VIEWABLE = pickBestMono(POOL);
const INITIAL =
  [...VIEWABLE].sort((a, b) => (b.iptm ?? -1) - (a.iptm ?? -1))[0] ??
  VIEWABLE[0];

function fmt(v: number | null | undefined, digits = 2) {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toFixed(digits);
}

function fmtSigned(v: number | null | undefined, digits = 1) {
  if (v == null || Number.isNaN(v)) return "—";
  const s = v.toFixed(digits);
  return v > 0 ? `+${s}` : s;
}

function aidById(id: number) {
  return AIDS.find((a) => a.aid_id === id) ?? AIDS[0];
}

type DeltaTone = "win" | "lose" | "neutral";

function deltaTone(
  design: number | null | undefined,
  aid: number | null | undefined,
  higherIsBetter: boolean
): DeltaTone {
  if (design == null || aid == null || Number.isNaN(design) || Number.isNaN(aid))
    return "neutral";
  if (Math.abs(design - aid) < 1e-9) return "neutral";
  const better = higherIsBetter ? design > aid : design < aid;
  return better ? "win" : "lose";
}

/** Max sliding-window identity; returns alignment of shorter onto longer. */
function alignSequences(a: string, b: string) {
  if (!a || !b) {
    return {
      identity: 0,
      shortLabel: "a" as const,
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
  let bestFlags: boolean[] = [];
  for (let i = 0; i <= long.length - short.length; i++) {
    const flags = short.split("").map((ch, j) => ch === long[i + j]);
    const hits = flags.filter(Boolean).length;
    if (hits > bestMatches) {
      bestMatches = hits;
      bestOffset = i;
      bestFlags = flags;
    }
  }
  return {
    identity: short.length ? bestMatches / short.length : 0,
    shortLabel: aIsShort ? ("design" as const) : ("aid" as const),
    short,
    long,
    offset: bestOffset,
    matches: bestFlags,
  };
}

export function Hapd1Mono60VsPaper() {
  const [designId, setDesignId] = useState(INITIAL.id);
  const [aidMode, setAidMode] = useState<AidRefMode>("nearest_identity");
  const [viewersActive, setViewersActive] = useState(false);
  const [designViewerActive, setDesignViewerActive] = useState(false);
  const viewersRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = viewersRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) =>
        setViewersActive(entry.isIntersecting && entry.intersectionRatio > 0),
      { threshold: [0, 0.05, 0.15], rootMargin: "80px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // El 2.º WebGL a veces nace en blanco si se crea a la vez que el AiD.
  useEffect(() => {
    if (!viewersActive) {
      setDesignViewerActive(false);
      return;
    }
    const timer = window.setTimeout(() => setDesignViewerActive(true), 220);
    return () => window.clearTimeout(timer);
  }, [viewersActive]);

  const design =
    VIEWABLE.find((d) => d.id === designId) ?? VIEWABLE[0] ?? INITIAL;

  const refAid = useMemo(() => {
    if (aidMode === "nearest_identity") return aidById(design.nearest_aid_id);
    if (aidMode === "best_iptm") return aidById(design.best_iptm_aid_id);
    return aidById(aidMode);
  }, [aidMode, design]);

  const seqAlign = useMemo(
    () => alignSequences(design.binder_seq, refAid.binder_seq),
    [design.binder_seq, refAid.binder_seq]
  );
  const matchCount = seqAlign.matches.filter(Boolean).length;
  const comparedLen = seqAlign.short.length;
  const diffCount = Math.max(0, comparedLen - matchCount);

  const dPlddt =
    design.plddt_a != null && refAid.plddt != null
      ? design.plddt_a - refAid.plddt
      : null;
  const dIptm =
    design.iptm != null && refAid.iptm != null
      ? design.iptm - refAid.iptm
      : null;
  const dScore =
    refAid.overall_score != null
      ? design.overall_score - refAid.overall_score
      : null;
  const dPae =
    design.pae_iface != null && refAid.pae != null
      ? design.pae_iface - refAid.pae
      : null;
  const dContact =
    design.contact != null && refAid.contact != null
      ? design.contact - refAid.contact
      : null;

  const dRg =
    design.rg != null && refAid.rg != null ? design.rg - refAid.rg : null;
  const dIf =
    design.if_contacts != null && refAid.if_contacts != null
      ? design.if_contacts - refAid.if_contacts
      : null;
  const dBsa =
    design.bsa != null && refAid.bsa != null ? design.bsa - refAid.bsa : null;
  const dGravy =
    design.gravy != null && refAid.gravy != null
      ? design.gravy - refAid.gravy
      : null;
  const dCharge =
    design.charge != null && refAid.charge != null
      ? design.charge - refAid.charge
      : null;
  const dPi =
    design.pi != null && refAid.pi != null ? design.pi - refAid.pi : null;
  const dIi =
    design.instability != null && refAid.instability != null
      ? design.instability - refAid.instability
      : null;
  const dAro =
    design.aromaticity != null && refAid.aromaticity != null
      ? design.aromaticity - refAid.aromaticity
      : null;
  const dMw =
    design.mw_kda != null && refAid.mw_kda != null
      ? design.mw_kda - refAid.mw_kda
      : null;

  const aidGravy = gravyTrait(refAid.gravy);
  const desGravy = gravyTrait(design.gravy);
  const aidStab = stabilityTrait(refAid.instability);
  const desStab = stabilityTrait(design.instability);

  type CmpRow = {
    key: string;
    label: string;
    section?: string;
    design: ReactNode;
    aid: ReactNode;
    delta: string;
    tone: DeltaTone;
  };

  const rows: CmpRow[] = [
    {
      key: "plddt",
      label: "pLDDT péptido",
      section: "AlphaFold",
      design: fmt(design.plddt_a, 1),
      aid: fmt(refAid.plddt, 1),
      delta: fmtSigned(dPlddt, 1),
      tone: deltaTone(design.plddt_a, refAid.plddt, true),
    },
    {
      key: "contact",
      label: "Puntuación de contacto",
      design: fmt(design.contact, 1),
      aid: fmt(refAid.contact, 1),
      delta: fmtSigned(dContact, 1),
      tone: deltaTone(design.contact, refAid.contact, true),
    },
    {
      key: "iptm",
      label: "ipTM",
      design: fmt(design.iptm, 3),
      aid: fmt(refAid.iptm, 3),
      delta: fmtSigned(dIptm, 3),
      tone: deltaTone(design.iptm, refAid.iptm, true),
    },
    {
      key: "score",
      label: "Aptitud",
      design: fmt(design.overall_score, 1),
      aid: refAid.overall_score == null ? "—" : fmt(refAid.overall_score, 1),
      delta: fmtSigned(dScore, 1),
      tone: deltaTone(design.overall_score, refAid.overall_score, false),
    },
    {
      key: "pae",
      label: "PAE iface",
      design: `${fmt(design.pae_iface, 1)} Å`,
      aid: `${fmt(refAid.pae, 1)} Å`,
      delta: `${fmtSigned(dPae, 1)} Å`,
      tone: deltaTone(design.pae_iface, refAid.pae, false),
    },
    {
      key: "rg",
      label: "Radio de giro",
      section: "Estructura / péptido",
      design: `${fmtChar(design.rg, 1)} Å`,
      aid: `${fmtChar(refAid.rg, 1)} Å`,
      delta: `${fmtSigned(dRg, 1)} Å`,
      tone: "neutral",
    },
    {
      key: "if",
      label: "Contactos IF",
      design: fmtChar(design.if_contacts, 0),
      aid: fmtChar(refAid.if_contacts, 0),
      delta: fmtSigned(dIf, 0),
      tone: deltaTone(design.if_contacts, refAid.if_contacts, true),
    },
    {
      key: "bsa",
      label: "ΔSASA",
      design: `${fmtChar(design.bsa, 0)} Å²`,
      aid: `${fmtChar(refAid.bsa, 0)} Å²`,
      delta: `${fmtSigned(dBsa, 0)} Å²`,
      tone: deltaTone(design.bsa, refAid.bsa, true),
    },
    {
      key: "gravy",
      label: "GRAVY",
      design: (
        <ValueWithTrait value={fmtChar(design.gravy, 3)} trait={desGravy} />
      ),
      aid: (
        <ValueWithTrait value={fmtChar(refAid.gravy, 3)} trait={aidGravy} />
      ),
      delta: fmtSigned(dGravy, 3),
      tone: "neutral",
    },
    {
      key: "charge",
      label: "Carga pH 7",
      design: fmtSignedChar(design.charge, 1),
      aid: fmtSignedChar(refAid.charge, 1),
      delta: fmtSigned(dCharge, 1),
      tone: "neutral",
    },
    {
      key: "pi",
      label: "pI",
      design: fmtChar(design.pi, 2),
      aid: fmtChar(refAid.pi, 2),
      delta: fmtSigned(dPi, 2),
      tone: "neutral",
    },
    {
      key: "ii",
      label: "II",
      design: (
        <ValueWithTrait
          value={fmtChar(design.instability, 1)}
          trait={desStab}
        />
      ),
      aid: (
        <ValueWithTrait
          value={fmtChar(refAid.instability, 1)}
          trait={aidStab}
        />
      ),
      delta: fmtSigned(dIi, 1),
      tone: deltaTone(design.instability, refAid.instability, false),
    },
    {
      key: "aro",
      label: "Aromaticidad",
      design: fmtChar(design.aromaticity, 3),
      aid: fmtChar(refAid.aromaticity, 3),
      delta: fmtSigned(dAro, 3),
      tone: "neutral",
    },
    {
      key: "mw",
      label: "MW",
      design: `${fmtChar(design.mw_kda, 2)} kDa`,
      aid: `${fmtChar(refAid.mw_kda, 2)} kDa`,
      delta: `${fmtSigned(dMw, 2)} kDa`,
      tone: "neutral",
    },
  ];

  return (
    <motion.div
      className="hapd1 hapd1-mono60"
      variants={fade}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.12 }}
    >
      <h2 className="validacion-title">
        Diseños HA-PD1 frente a AiDs experimentales
      </h2>
      <p className="validacion-sub">
        Mejores diseños del panel de 60 generaciones frente a AiDs de Goudy et
        al. (2023). El KD experimental solo existe para los AiDs.
      </p>

      <div className="hapd1-grid">
        <aside className="hapd1-sidebar">
          <section className="validacion-card hapd1-card hapd1-compare">
            <div className="hapd1-filters hapd1-filters-2">
              <label className="hapd1-label">
                Diseño
                <select
                  className="hapd1-select"
                  value={design.id}
                  onChange={(e) => setDesignId(e.target.value)}
                >
                  {VIEWABLE.map((d) => (
                    <option key={d.id} value={d.id}>
                      {formatDesignLabel(d.id, d.arm)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="hapd1-label">
                AiD
                <select
                  className="hapd1-select"
                  value={String(aidMode)}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "nearest_identity" || v === "best_iptm") {
                      setAidMode(v);
                    } else {
                      setAidMode(Number(v));
                    }
                  }}
                >
                  <option value="nearest_identity">
                    Más cercano (AiD {design.nearest_aid_id})
                  </option>
                  <option value="best_iptm">
                    Mejor ipTM (AiD {design.best_iptm_aid_id})
                  </option>
                  {AIDS.map((a) => (
                    <option key={a.aid_id} value={a.aid_id}>
                      AiD {a.aid_id} · KD {fmt(a.kd_nM, 1)} nM
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="hapd1-delta-head">
              <span
                className="hapd1-tag"
                style={{ color: ARM_META[design.arm].color }}
              >
                {formatDesignLabel(design.id, design.arm)}
              </span>
              <span className="hapd1-delta-vs">vs</span>
              <span className="hapd1-tag aid">AiD {refAid.aid_id}</span>
              <span className="hapd1-kd">
                KD <strong>{fmt(refAid.kd_nM, 1)} nM</strong>
              </span>
            </div>

            <p className="hapd1-diff-key" aria-hidden>
              <span className="hapd1-diff-swatch best" /> mejor valor
              <span className="hapd1-diff-swatch delta" /> Δ = diseño − AiD
            </p>

            <table className="hapd1-delta-table hapd1-diff-table">
              <thead>
                <tr>
                  <th>Indicador</th>
                  <th>Diseño</th>
                  <th>AiD</th>
                  <th>Δ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <Fragment key={r.key}>
                    {r.section ? (
                      <tr className="hapd1-diff-section">
                        <td colSpan={4}>{r.section}</td>
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
                        {r.aid}
                      </td>
                      <td className={`hapd1-delta hapd1-delta-${r.tone}`}>
                        {r.delta}
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>

            <p className="hapd1-ident-callout">
              Identidad:{" "}
              <strong>{(seqAlign.identity * 100).toFixed(1)}%</strong>
              <span>
                {" "}
                · {design.binder_seq.length} aa · {refAid.binder_seq.length} aa
              </span>
            </p>
          </section>
        </aside>

        <section className="hapd1-main">
          <div className="hapd1-viewers" ref={viewersRef}>
            <div className="validacion-card hapd1-card hapd1-viewer-card">
              <div className="hapd1-viewer-head">
                <span className="hapd1-tag aid">AiD {refAid.aid_id}</span>
              </div>
              <ComplexViewer
                pdbUrl={refAid.pdb}
                referenceUrl={refAid.pdb}
                active={viewersActive ? true : undefined}
              />
            </div>

            <div className="validacion-card hapd1-card hapd1-viewer-card">
              <div className="hapd1-viewer-head">
                <span
                  className="hapd1-tag"
                  style={{ color: ARM_META[design.arm].color }}
                >
                  {formatDesignLabel(design.id, design.arm)}
                </span>
              </div>
              <ComplexViewer
                pdbUrl={design.pdb}
                referenceUrl={design.pdb}
                active={designViewerActive ? true : undefined}
              />
            </div>
          </div>
          <div className="validacion-card hapd1-card hapd1-seq-under">
            <div className="hapd1-seq-row">
              <span className="hapd1-seq-label aid">AiD {refAid.aid_id}</span>
              <code className="hapd1-seq-code">{refAid.binder_seq}</code>
            </div>
            <div className="hapd1-seq-row">
              <span
                className="hapd1-seq-label"
                style={{ color: ARM_META[design.arm].color }}
              >
                {formatDesignLabel(design.id, design.arm)}
              </span>
              <code className="hapd1-seq-code">{design.binder_seq}</code>
            </div>
            <p className="hapd1-seq-meta">
              Identidad local <strong>{(seqAlign.identity * 100).toFixed(1)}%</strong>
              {" · "}
              cambios <strong>{diffCount}</strong> / {comparedLen} residuos
            </p>
          </div>
          <p className="hapd1-legend hapd1-legend-shared">
            <span className="ablacion-chip target" /> HA-PD1 ·{" "}
            <span className="ablacion-chip binder" /> péptido (AiD | diseño)
          </p>
        </section>
      </div>
    </motion.div>
  );
}
