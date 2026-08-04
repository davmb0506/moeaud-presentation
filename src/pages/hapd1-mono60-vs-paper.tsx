import { useEffect, useMemo, useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { ComplexViewer } from "../components/ComplexViewer";
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
  pdb: string;
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

const VIEWABLE = DESIGNS.filter(
  (d) => d.pdb_resolved && d.pdb && !d.degenerate
);
// Default: best resolved design by ipTM (prefer interface hits from 06–10 panel).
const INITIAL =
  [...VIEWABLE].sort((a, b) => (b.iptm ?? -1) - (a.iptm ?? -1))[0] ??
  VIEWABLE.find((d) => d.arm === "base" && d.criterion === "by_score") ??
  VIEWABLE[0];

function fmt(v: number | null | undefined, digits = 2) {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toFixed(digits);
}

function aidById(id: number) {
  return AIDS.find((a) => a.aid_id === id) ?? AIDS[0];
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

type TraitTone = "ok" | "warn" | "neutral";

function gravyTrait(gravy: number | null | undefined): { label: string; tone: TraitTone } {
  if (gravy == null || Number.isNaN(gravy)) return { label: "—", tone: "neutral" };
  if (gravy >= 0.5) return { label: "hidrofóbico", tone: "warn" };
  if (gravy >= 0) return { label: "levemente hidrofóbico", tone: "neutral" };
  return { label: "hidrofílico", tone: "ok" };
}

function stabilityTrait(ii: number | null | undefined): { label: string; tone: TraitTone } {
  if (ii == null || Number.isNaN(ii)) return { label: "—", tone: "neutral" };
  if (ii < 40) return { label: "estable", tone: "ok" };
  if (ii < 65) return { label: "moderado", tone: "neutral" };
  return { label: "inestable", tone: "warn" };
}

function chargeTrait(charge: number | null | undefined): { label: string; tone: TraitTone } {
  if (charge == null || Number.isNaN(charge)) return { label: "—", tone: "neutral" };
  if (Math.abs(charge) < 1) return { label: "casi neutro", tone: "neutral" };
  if (charge > 0) return { label: "carga +", tone: "ok" };
  return { label: "carga −", tone: "neutral" };
}

function fmtSigned(v: number | null | undefined, digits = 1) {
  if (v == null || Number.isNaN(v)) return "—";
  const s = v.toFixed(digits);
  return v > 0 ? `+${s}` : s;
}

function PeptideMetrics({ p }: { p: PeptideProps }) {
  const gravy = gravyTrait(p.gravy);
  const charge = chargeTrait(p.charge);
  const stability = stabilityTrait(p.instability);
  return (
    <div className="hapd1-peptide">
      <div className="hapd1-metrics hapd1-peptide-metrics">
        <div className="hapd1-metric">
          <span>GRAVY</span>
          <strong>{fmt(p.gravy, 3)}</strong>
          <em className={`hapd1-trait hapd1-trait-${gravy.tone}`}>{gravy.label}</em>
        </div>
        <div className="hapd1-metric">
          <span>Carga pH 7</span>
          <strong>{fmtSigned(p.charge, 1)}</strong>
          <em className={`hapd1-trait hapd1-trait-${charge.tone}`}>{charge.label}</em>
        </div>
        <div className="hapd1-metric">
          <span>pI</span>
          <strong>{fmt(p.pi, 2)}</strong>
        </div>
        <div className="hapd1-metric">
          <span>II</span>
          <strong>{fmt(p.instability, 1)}</strong>
          <em className={`hapd1-trait hapd1-trait-${stability.tone}`}>
            {stability.label}
          </em>
        </div>
        <div className="hapd1-metric">
          <span>Aromaticidad</span>
          <strong>{fmt(p.aromaticity, 3)}</strong>
        </div>
        <div className="hapd1-metric">
          <span>MW</span>
          <strong>{fmt(p.mw_kda, 2)} kDa</strong>
        </div>
      </div>
    </div>
  );
}

export function Hapd1Mono60VsPaper() {
  const [armFilter, setArmFilter] = useState<Arm | "all">("all");
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

  const designHint =
    VIEWABLE.find((d) => d.id === designId) ??
    (armFilter === "all"
      ? VIEWABLE[0]
      : VIEWABLE.find((d) => d.arm === armFilter)) ??
    INITIAL;

  const refAid = useMemo(() => {
    if (aidMode === "nearest_identity") return aidById(designHint.nearest_aid_id);
    if (aidMode === "best_iptm") return aidById(designHint.best_iptm_aid_id);
    return aidById(aidMode);
  }, [aidMode, designHint]);

  const filtered = useMemo(() => {
    const list =
      armFilter === "all"
        ? VIEWABLE
        : VIEWABLE.filter((d) => d.arm === armFilter);
    return [...list].sort((a, b) => a.id.localeCompare(b.id));
  }, [armFilter]);

  const design =
    filtered.find((d) => d.id === designId) ?? filtered[0] ?? INITIAL;

  const seqAlign = useMemo(
    () => alignSequences(design.binder_seq, refAid.binder_seq),
    [design.binder_seq, refAid.binder_seq]
  );

  return (
    <motion.div
      className="hapd1"
      variants={fade}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.12 }}
    >
      <h2 className="validacion-title">Diseños HA-PD1 frente a AiDs experimentales</h2>
      <p className="validacion-sub">
        Diseños y AiDs se predicen con el mismo protocolo AlphaFold2 sobre
        HA-PD1. La figura muestra confianza de interfaz (pLDDT, ipTM, PAE) y
        ProtParam; el KD por SPR (Goudy et al. 2023) solo está disponible para
        los cinco AiDs.
      </p>

      <div className="hapd1-grid">
        <aside className="hapd1-sidebar">
          <section className="validacion-card hapd1-card hapd1-filters-card">
            <div className="hapd1-filters">
              <label className="hapd1-label">
                Experimento
                <select
                  className="hapd1-select"
                  value={armFilter}
                  onChange={(e) => {
                    const next = e.target.value as Arm | "all";
                    setArmFilter(next);
                    const nextList =
                      next === "all"
                        ? VIEWABLE
                        : VIEWABLE.filter((d) => d.arm === next);
                    if (!nextList.some((d) => d.id === designId) && nextList[0]) {
                      setDesignId(nextList[0].id);
                    }
                  }}
                >
                  <option value="all">Todos</option>
                  {(ARM_ORDER).map((arm) => (
                    <option key={arm} value={arm}>
                      {ARM_META[arm].label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="hapd1-label">
                Diseño
                <select
                  className="hapd1-select"
                  value={design.id}
                  onChange={(e) => setDesignId(e.target.value)}
                >
                  {filtered.map((d) => (
                    <option key={d.id} value={d.id}>
                      {formatDesignLabel(d.id, d.arm)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="hapd1-label">
                Referencia AiD
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
                    Mejor por identidad (AiD {design.nearest_aid_id})
                  </option>
                  <option value="best_iptm">
                    Mejor por ipTM (AiD {design.best_iptm_aid_id})
                  </option>
                  {AIDS.map((a) => (
                    <option key={a.aid_id} value={a.aid_id}>
                      AiD {a.aid_id}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="validacion-card hapd1-card hapd1-compare">
            <div className="hapd1-compare-cols">
              <div>
                <div className="hapd1-col-head">
                  <span
                    className="hapd1-tag"
                    style={{ color: ARM_META[design.arm].color }}
                  >
                    {formatDesignLabel(design.id, design.arm)}
                  </span>
                </div>
                <div className="hapd1-metrics">
                  <div className="hapd1-metric">
                    <span>overall_score</span>
                    <strong>{fmt(design.overall_score, 2)}</strong>
                  </div>
                  <div className="hapd1-metric">
                    <span>pLDDT binder</span>
                    <strong>{fmt(design.plddt_a, 1)}</strong>
                  </div>
                  <div className="hapd1-metric">
                    <span>ipTM</span>
                    <strong>{fmt(design.iptm, 3)}</strong>
                  </div>
                  <div className="hapd1-metric">
                    <span>PAE iface</span>
                    <strong>{fmt(design.pae_iface, 1)} Å</strong>
                  </div>
                </div>
              </div>

              <div>
                <div className="hapd1-col-head">
                  <span className="hapd1-tag aid">AiD {refAid.aid_id}</span>
                </div>
                <div className="hapd1-metrics">
                  <div className="hapd1-metric">
                    <span>overall_score</span>
                    <strong>
                      {refAid.overall_score == null
                        ? "—"
                        : fmt(refAid.overall_score, 2)}
                    </strong>
                  </div>
                  <div className="hapd1-metric">
                    <span>pLDDT binder</span>
                    <strong>{fmt(refAid.plddt, 1)}</strong>
                  </div>
                  <div className="hapd1-metric">
                    <span>ipTM</span>
                    <strong>{fmt(refAid.iptm, 3)}</strong>
                  </div>
                  <div className="hapd1-metric">
                    <span>PAE iface</span>
                    <strong>{fmt(refAid.pae, 1)} Å</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="hapd1-seqs">
              <div className="hapd1-seq-block">
                <span className="hapd1-seq-label">
                  {formatDesignLabel(design.id, design.arm)} ·{" "}
                  {design.binder_seq.length} aa
                </span>
                <code className="hapd1-seq">{design.binder_seq}</code>
              </div>
              <div className="hapd1-seq-block">
                <span className="hapd1-seq-label">
                  AiD {refAid.aid_id} · {refAid.binder_seq.length} aa
                </span>
                <code className="hapd1-seq">{refAid.binder_seq}</code>
              </div>
              <div className="hapd1-seq-block hapd1-seq-align">
                <span className="hapd1-seq-label">Alineamiento</span>
                <div className="hapd1-align" aria-label="Alineamiento de secuencias">
                  {seqAlign.long.split("").map((ch, i) => {
                    const inWindow =
                      i >= seqAlign.offset &&
                      i < seqAlign.offset + seqAlign.short.length;
                    const match =
                      inWindow && seqAlign.matches[i - seqAlign.offset];
                    return (
                      <span
                        key={`${ch}-${i}`}
                        className={
                          match
                            ? "hapd1-aa match"
                            : inWindow
                              ? "hapd1-aa miss"
                              : "hapd1-aa outside"
                        }
                        title={
                          inWindow
                            ? `${seqAlign.long[i]} vs ${seqAlign.short[i - seqAlign.offset]}`
                            : ch
                        }
                      >
                        {ch}
                      </span>
                    );
                  })}
                </div>
                <div className="hapd1-align hapd1-align-short">
                  {Array.from({ length: seqAlign.offset }, (_, i) => (
                    <span key={`pad-${i}`} className="hapd1-aa pad">
                      ·
                    </span>
                  ))}
                  {seqAlign.short.split("").map((ch, i) => (
                    <span
                      key={`s-${ch}-${i}`}
                      className={
                        seqAlign.matches[i] ? "hapd1-aa match" : "hapd1-aa miss"
                      }
                    >
                      {ch}
                    </span>
                  ))}
                </div>
                <p className="hapd1-ident">
                  Identidad: {(seqAlign.identity * 100).toFixed(1)}%
                </p>
              </div>
            </div>
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
              <p className="hapd1-legend">
                <span className="ablacion-chip target" /> HA-PD1 ·{" "}
                <span className="ablacion-chip binder" /> AiD paper
              </p>
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
              <p className="hapd1-legend">
                <span className="ablacion-chip target" /> HA-PD1 ·{" "}
                <span className="ablacion-chip binder" /> diseño mono-60
              </p>
            </div>
          </div>

          <section className="validacion-card hapd1-card hapd1-peptide-panel">
            <div className="hapd1-peptide-cols">
              <PeptideMetrics p={refAid} />
              <PeptideMetrics p={design} />
            </div>
          </section>
        </section>
      </div>
    </motion.div>
  );
}
