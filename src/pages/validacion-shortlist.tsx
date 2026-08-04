import { useEffect, useMemo, useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { ComplexViewer } from "../components/ComplexViewer";
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
};

type Panel = {
  status: string;
  candidates: Candidate[];
  note?: string | null;
  target?: string;
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
      `Los ${n} candidatos que pasaron el filtro sobre el pool no dominado (con y sin mecanismos).`,
    targetChip: "VEGF-A",
    tab: "VEGF-A",
  },
  hapd1_mono60: {
    title: "Selección final",
    subtitle: (n) =>
      `Los ${n} del filtro HA-PD1. Confianza AF2 (pLDDT, ipTM, PAE) en ambos lados; el KD por SPR solo existe para los AiDs (Goudy et al. 2023).`,
    targetChip: "HA-PD1",
    tab: "HA-PD1",
  },
};

const PANEL_IDS: ShortlistPanelId[] = ["moea_pool1208", "hapd1_mono60"];
const AIDS = (hapd1VsPaper as { paper_aids: PaperAid[] }).paper_aids;

type TraitTone = "ok" | "warn" | "neutral";

function panelOf(id: ShortlistPanelId): Panel | undefined {
  return (shortlistData as { panels?: Record<string, Panel> }).panels?.[id];
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

function fmtSigned(v: number | null | undefined, digits = 1) {
  if (v == null || Number.isNaN(v)) return "—";
  const s = v.toFixed(digits);
  return v > 0 ? `+${s}` : s;
}

function designLabel(c: Candidate): string {
  return `#${c.rank} · ${c.grupo_label}`;
}

function epiPct(c: Candidate): string {
  if (c.epitope_coverage == null || Number.isNaN(c.epitope_coverage)) return "—";
  return `${Math.round(100 * c.epitope_coverage)}%`;
}

function gravyTrait(gravy: number | null | undefined): {
  label: string;
  tone: TraitTone;
} {
  if (gravy == null || Number.isNaN(gravy))
    return { label: "—", tone: "neutral" };
  if (gravy >= 0.5) return { label: "hidrofóbico", tone: "warn" };
  if (gravy >= 0) return { label: "levemente hidrofóbico", tone: "neutral" };
  return { label: "hidrofílico", tone: "ok" };
}

function stabilityTrait(ii: number | null | undefined): {
  label: string;
  tone: TraitTone;
} {
  if (ii == null || Number.isNaN(ii)) return { label: "—", tone: "neutral" };
  if (ii < 40) return { label: "estable", tone: "ok" };
  if (ii < 65) return { label: "moderado", tone: "neutral" };
  return { label: "inestable", tone: "warn" };
}

function chargeTrait(charge: number | null | undefined): {
  label: string;
  tone: TraitTone;
} {
  if (charge == null || Number.isNaN(charge))
    return { label: "—", tone: "neutral" };
  if (Math.abs(charge) < 1) return { label: "casi neutro", tone: "neutral" };
  if (charge > 0) return { label: "carga +", tone: "ok" };
  return { label: "carga −", tone: "neutral" };
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

type PeptideLike = {
  gravy?: number | null;
  charge?: number | null;
  pI?: number | null;
  pi?: number | null;
  aromaticity?: number | null;
  instability?: number | null;
  mw_kda?: number | null;
};

function PeptideMetrics({ p }: { p: PeptideLike }) {
  const gravy = gravyTrait(p.gravy);
  const charge = chargeTrait(p.charge);
  const stability = stabilityTrait(p.instability);
  const pi = p.pI ?? p.pi;
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
          <strong>{fmt(pi, 2)}</strong>
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
    if (!compareAids) {
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
  }, [compareAids, active?.id]);

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

  return (
    <motion.div
      className="hapd1"
      variants={fade}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.12 }}
    >
      <h2 className="validacion-title">{copy.title}</h2>
      <p className="validacion-sub">{copy.subtitle(candidates.length)}</p>

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

      <div className="hapd1-grid">
        <aside className="hapd1-sidebar">
          <section className="validacion-card hapd1-card hapd1-filters-card">
            <div
              className="hapd1-filters"
              style={{
                gridTemplateColumns: compareAids ? "1fr 1fr" : "1fr",
              }}
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
                  Referencia AiD
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
          </section>

          <section className="validacion-card hapd1-card hapd1-compare">
            {compareAids ? (
              <div className="hapd1-compare-cols">
                <div>
                  <div className="hapd1-col-head">
                    <span className="hapd1-tag" style={{ color: accent }}>
                      {designLabel(active)}
                    </span>
                  </div>
                  <div className="hapd1-metrics">
                    <div className="hapd1-metric">
                      <span>pLDDT binder</span>
                      <strong>{fmt(active.plddt_a, 1)}</strong>
                    </div>
                    <div className="hapd1-metric">
                      <span>ipTM</span>
                      <strong>{fmt(active.iptm, 3)}</strong>
                    </div>
                    <div className="hapd1-metric">
                      <span>PAE iface</span>
                      <strong>{fmt(active.pae_iface, 1)} Å</strong>
                    </div>
                    <div className="hapd1-metric">
                      <span>Ω RMSD</span>
                      <strong>{fmt(active.rmsd_A, 2)} Å</strong>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="hapd1-col-head">
                    <span className="hapd1-tag aid">AiD {refAid.aid_id}</span>
                    <span className="hapd1-crit">SPR · Goudy 2023</span>
                  </div>
                  <div className="hapd1-metrics">
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
                    <div className="hapd1-metric">
                      <span>KD</span>
                      <strong>{fmt(refAid.kd_nM, 1)} nM</strong>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="hapd1-col-head">
                  <span className="hapd1-tag" style={{ color: accent }}>
                    {designLabel(active)}
                  </span>
                </div>
                <div className="hapd1-metrics">
                  {active.plddt_a != null || active.pae_iface != null ? (
                    <>
                      <div className="hapd1-metric">
                        <span>pLDDT</span>
                        <strong>{fmt(active.plddt_a, 1)}</strong>
                      </div>
                      <div className="hapd1-metric">
                        <span>PAE iface</span>
                        <strong>{fmt(active.pae_iface, 1)} Å</strong>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="hapd1-metric">
                        <span>ipSAE</span>
                        <strong>{fmt(active.ipsae, 3)}</strong>
                      </div>
                      <div className="hapd1-metric">
                        <span>SC diseño</span>
                        <strong>{fmt(active.design_sc, 3)}</strong>
                      </div>
                    </>
                  )}
                  <div className="hapd1-metric">
                    <span>dG/dSASA×100</span>
                    <strong>{fmt(active.score_rosetta, 2)}</strong>
                  </div>
                  <div className="hapd1-metric">
                    <span>Ω RMSD</span>
                    <strong>{fmt(active.rmsd_A, 2)} Å</strong>
                  </div>
                  {showEpitope ? (
                    <div className="hapd1-metric">
                      <span>Epítopo VEGFR-2</span>
                      <strong>{epiPct(active)}</strong>
                    </div>
                  ) : null}
                </div>
              </>
            )}

            <div className="hapd1-seqs">
              <div className="hapd1-seq-block">
                <span className="hapd1-seq-label">
                  {designLabel(active)} ·{" "}
                  {active.length ?? active.binder_seq.length} aa
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
                  <div className="hapd1-seq-block hapd1-seq-align">
                    <span className="hapd1-seq-label">Alineamiento</span>
                    <div
                      className="hapd1-align"
                      aria-label="Alineamiento de secuencias"
                    >
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
                            seqAlign.matches[i]
                              ? "hapd1-aa match"
                              : "hapd1-aa miss"
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
                </>
              ) : null}
            </div>
          </section>

          {!compareAids ? (
            <section className="validacion-card hapd1-card hapd1-peptide-panel">
              <PeptideMetrics p={active} />
            </section>
          ) : null}
        </aside>

        <section className="hapd1-main">
          {compareAids ? (
            <>
              <div className="hapd1-viewers" ref={viewersRef}>
                <div className="validacion-card hapd1-card hapd1-viewer-card">
                  <div className="hapd1-viewer-head">
                    <span className="hapd1-tag aid">AiD {refAid.aid_id}</span>
                  </div>
                  <ComplexViewer
                    key={`aid-${refAid.aid_id}`}
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
                    <span className="hapd1-tag" style={{ color: accent }}>
                      {designLabel(active)}
                    </span>
                  </div>
                  {active.pdb ? (
                    <ComplexViewer
                      key={`des-${active.id}`}
                      pdbUrl={active.pdb}
                      referenceUrl={active.pdb}
                      active={designViewerActive ? true : undefined}
                    />
                  ) : (
                    <p className="dockstory-note">PDB no disponible</p>
                  )}
                  <p className="hapd1-legend">
                    <span className="ablacion-chip target" /> HA-PD1 ·{" "}
                    <span className="ablacion-chip binder" /> binder filtrado
                  </p>
                </div>
              </div>
              <section className="validacion-card hapd1-card hapd1-peptide-panel">
                <div className="hapd1-peptide-cols">
                  <PeptideMetrics p={refAid} />
                  <PeptideMetrics p={active} />
                </div>
              </section>
            </>
          ) : (
            <div className="validacion-card hapd1-card hapd1-viewer-card moea-viewer-card">
              <div className="hapd1-viewer-head">
                <span className="hapd1-tag" style={{ color: accent }}>
                  {designLabel(active)}
                </span>
              </div>
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
                <span className="ablacion-chip binder" /> binder diseñado
              </p>
            </div>
          )}
        </section>
      </div>
    </motion.div>
  );
}
