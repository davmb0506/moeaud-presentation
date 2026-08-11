import { useEffect, useMemo, useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { ComplexViewer } from "../components/ComplexViewer";
import { ABLATION_CONDS } from "../data/experimentLabels";
import shortlistData from "../data/shortlistGoudy.json";

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
  rmsd_A: number | null;
  omega_class: string;
  pdb: string | null;
  epitope_coverage?: number | null;
  mmgbsa?: number | null;
  haddock_score?: number | null;
  haddock_pdb?: string | null;
  haddock_if_contacts?: number | null;
  plddt_a?: number | null;
  iptm?: number | null;
  pae_iface?: number | null;
};

type Highlight = {
  id: string;
  hook: string;
  metrics: { label: string; value: (c: Candidate) => string }[];
  pose: "haddock" | "af2";
};

const NATIVE_HADDOCK_SCORE = -80.1;
const NATIVE_COMPLEX_PDB =
  "/pdbs/shortlist-haddock/vegfa_vegfr2_native_haddock.pdb";

const COMPETITION_BY_GROUP: Record<string, { score: number; p: number }> = {
  interface_pae_plddt_mech: { score: 0.34, p: 0.0 },
  ipsae_sc_nomech: { score: 0.238, p: 0.002 },
  ipsae_sc_mech: { score: 0.103, p: 0.647 },
  interface_pae_plddt_nomech: { score: 0.085, p: 0.848 },
};

const PANEL_DATA = shortlistData as {
  panels?: Record<string, { candidates: Candidate[] }>;
};

const VEGF_HLS: Highlight[] = [
  {
    id: "ipsae_sc_mech__0101",
    hook: "Supera al nativo en docking",
    pose: "haddock",
    metrics: [
      { label: "Docking", value: (c) => fmt(c.haddock_score, 1) },
      { label: "Nativo", value: () => fmt(NATIVE_HADDOCK_SCORE, 1) },
      { label: "Ω RMSD", value: (c) => `${fmt(c.rmsd_A, 2)} Å` },
    ],
  },
  {
    id: "interface_pae_plddt_mech__0136",
    hook: "Mejor energía libre de unión",
    pose: "haddock",
    metrics: [
      { label: "MM-GBSA", value: (c) => fmt(c.mmgbsa, 1) },
      { label: "Epítopo", value: (c) => epiPct(c.epitope_coverage) },
      { label: "Docking", value: (c) => fmt(c.haddock_score, 1) },
    ],
  },
  {
    id: "ipsae_sc_nomech__0043",
    hook: "Estructura más consistente",
    pose: "af2",
    metrics: [
      { label: "Ω RMSD", value: (c) => `${fmt(c.rmsd_A, 2)} Å` },
      { label: "Docking", value: (c) => fmt(c.haddock_score, 1) },
      { label: "Rosetta", value: (c) => fmt(c.score_rosetta, 2) },
    ],
  },
  {
    id: "interface_pae_plddt_mech__0035",
    hook: "Mayor cobertura de epítopo",
    pose: "af2",
    metrics: [
      { label: "Epítopo", value: (c) => epiPct(c.epitope_coverage) },
      { label: "MM-GBSA", value: (c) => fmt(c.mmgbsa, 1) },
      { label: "Docking", value: (c) => fmt(c.haddock_score, 1) },
    ],
  },
];

function fmt(n: number | null | undefined, d = 2) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toFixed(d);
}

function epiPct(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(100 * n)}%`;
}

function isNomech(grupo: string) {
  return grupo.includes("nomech") || grupo.includes("sin");
}

function accent(c: Candidate) {
  return isNomech(c.grupo) ? ABLATION_CONDS.sin.color : ABLATION_CONDS.con.color;
}

function condLabel(c: Candidate) {
  return isNomech(c.grupo) ? ABLATION_CONDS.sin.label : ABLATION_CONDS.con.label;
}

function pairLine(grupo: string) {
  const ma = isNomech(grupo) ? "sin MA" : "con MA";
  if (grupo.includes("ipsae")) return `ipSAE / SC · ${ma}`;
  if (grupo.includes("composite")) return `Compuesto / TM-score · ${ma}`;
  return `Interface-PAE / pLDDT · ${ma}`;
}

function seqIdentity(a: string, b: string) {
  const n = Math.min(a.length, b.length);
  if (!n) return 0;
  let matches = 0;
  for (let i = 0; i < n; i++) if (a[i] === b[i]) matches++;
  return matches / n;
}

function pctRange(values: number[]) {
  if (!values.length) return "—";
  const lo = Math.round(100 * Math.min(...values));
  const hi = Math.round(100 * Math.max(...values));
  if (lo === hi) return `${lo} %`;
  return `${lo}–${hi} %`;
}

export function ValidacionShortlist() {
  const all = useMemo(
    () => PANEL_DATA.panels?.moea_pool1208?.candidates ?? [],
    []
  );
  const [activeId, setActiveId] = useState(VEGF_HLS[0].id);

  const hl = VEGF_HLS.find((h) => h.id === activeId) ?? VEGF_HLS[0];
  const active = all.find((c) => c.id === hl.id) ?? null;
  const highlights = useMemo(
    () =>
      VEGF_HLS.map((h) => all.find((c) => c.id === h.id)).filter(
        (c): c is Candidate => !!c
      ),
    [all]
  );
  const validation = useMemo(() => {
    const pairIds: number[] = [];
    for (let i = 0; i < highlights.length; i++) {
      for (let j = i + 1; j < highlights.length; j++) {
        pairIds.push(
          seqIdentity(highlights[i].binder_seq, highlights[j].binder_seq)
        );
      }
    }
    const epitopes = highlights
      .map((c) => c.epitope_coverage)
      .filter((n): n is number => n != null && !Number.isNaN(n));
    const maxEpi = epitopes.length
      ? Math.round(100 * Math.max(...epitopes))
      : null;
    const competitionCount = highlights.filter((c) => {
      const grp = c.grupo.replace(/__\d+$/, "");
      const entry = COMPETITION_BY_GROUP[grp];
      return entry && entry.p < 0.05;
    }).length;
    return {
      pairwise: pctRange(pairIds),
      epitope: maxEpi != null ? `hasta ${maxEpi} %` : "—",
      competition: `${competitionCount} de ${highlights.length}`,
    };
  }, [highlights]);
  const designPdb =
    hl.pose === "haddock"
      ? active?.haddock_pdb ?? active?.pdb
      : active?.pdb;

  const viewersRef = useRef<HTMLDivElement | null>(null);
  const [viewersActive, setViewersActive] = useState(false);
  const [designViewerActive, setDesignViewerActive] = useState(false);

  useEffect(() => {
    const node = viewersRef.current;
    if (!node) {
      setViewersActive(false);
      setDesignViewerActive(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) =>
        setViewersActive(entry.isIntersecting && entry.intersectionRatio > 0),
      { threshold: [0, 0.05, 0.15], rootMargin: "80px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!viewersActive) {
      setDesignViewerActive(false);
      return;
    }
    const timer = window.setTimeout(() => setDesignViewerActive(true), 280);
    return () => window.clearTimeout(timer);
  }, [viewersActive, active?.id, designPdb]);

  return (
    <motion.div
      className="vhl"
      variants={fade}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.12 }}
    >
      <header className="vhl-head">
        <h2 className="vhl-title">Diseños destacados</h2>
        <p className="vhl-sub">
          Cuatro de los 10 del filtro, cada uno por un criterio distinto.
        </p>
      </header>

      <div className="vhl-grid">
        <div className="vhl-list" role="listbox" aria-label="Diseños destacados">
          {VEGF_HLS.map((h) => {
            const c = all.find((x) => x.id === h.id);
            if (!c) return null;
            const on = h.id === hl.id;
            return (
              <button
                key={h.id}
                type="button"
                role="option"
                aria-selected={on}
                className={"vhl-card" + (on ? " active" : "")}
                style={{ borderLeftColor: accent(c) }}
                onClick={() => setActiveId(h.id)}
              >
                <span className="vhl-hook">{h.hook}</span>
                <span className="vhl-meta">{pairLine(c.grupo)}</span>
              </button>
            );
          })}
        </div>

        <div className="vhl-viewer">
          {designPdb ? (
            <div className="vhl-viewers-2" ref={viewersRef}>
              <div className="vhl-pose">
                <span className="hapd1-tag aid">VEGFR-2 nativo</span>
                <ComplexViewer
                  pdbUrl={NATIVE_COMPLEX_PDB}
                  referenceUrl={NATIVE_COMPLEX_PDB}
                  active={viewersActive ? true : undefined}
                />
              </div>
              <div className="vhl-pose">
                <span className="hapd1-tag">Diseño</span>
                {designPdb ? (
                  <ComplexViewer
                    key={active?.id}
                    pdbUrl={designPdb}
                    referenceUrl={designPdb}
                    active={designViewerActive ? true : undefined}
                  />
                ) : (
                  <p className="dockstory-note">PDB no disponible</p>
                )}
              </div>
            </div>
          ) : (
            <p className="dockstory-note">PDB no disponible</p>
          )}

          {active && (
            <div className="vhl-info">
              <div className="vhl-info-head">
                <span
                  className="vhl-tag"
                  style={{ background: accent(active) }}
                >
                  {condLabel(active)}
                </span>
                <span className="vhl-hook-inline">{hl.hook}</span>
              </div>
              <div className="vhl-metrics">
                {hl.metrics.map((m) => (
                  <div key={m.label}>
                    <span>{m.label}</span>
                    <strong>{m.value(active)}</strong>
                  </div>
                ))}
              </div>
              <code className="vhl-seq">{active.binder_seq}</code>
              <p className="vhl-note">
                <span className="ablacion-chip target" /> VEGF-A ·{" "}
                <span className="ablacion-chip binder" /> VEGFR-2 | péptido
                {hl.pose === "haddock" ? " · pose HADDOCK" : " · pose AF2"}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="vhl-validation">
        <div className="vhl-vstat">
          <span>Identidad entre finalistas</span>
          <strong>{validation.pairwise}</strong>
          <em>soluciones diversas al mismo problema</em>
        </div>
        <div className="vhl-vstat">
          <span>Oclusión de VEGFR-2</span>
          <strong>{validation.competition}</strong>
          <em>compiten por el sitio del receptor</em>
        </div>
        <div className="vhl-vstat">
          <span>Epítopo emergente</span>
          <strong>{validation.epitope}</strong>
          <em>no optimizado directamente</em>
        </div>
      </div>

      <p className="vhl-foot">
        Nota. Docking: score HADDOCK de la pose (más negativo = unión más
        favorable). MM-GBSA: ΔG de unión con el agua como medio continuo, no
        molécula a molécula; también más negativo = mejor.
      </p>
    </motion.div>
  );
}
