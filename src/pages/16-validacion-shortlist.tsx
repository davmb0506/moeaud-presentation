import { useEffect, useMemo, useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { ComplexViewer } from "../components/ComplexViewer";
import { ABLATION_CONDS, HAPD1_ARMS } from "../data/experimentLabels";
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

type PanelId = "moea_pool1208" | "hapd1_mono60";

type Highlight = {
  id: string;
  hook: string;
  metrics: { label: string; value: (c: Candidate) => string }[];
  pose: "haddock" | "af2";
};

const NATIVE_HADDOCK_SCORE = -80.1;
const NATIVE_COMPLEX_PDB =
  "/pdbs/shortlist-haddock/vegfa_vegfr2_native_haddock.pdb";

const PANEL_DATA = shortlistData as {
  panels?: Record<string, { candidates: Candidate[] }>;
};

const VEGF_HLS: Highlight[] = [
  {
    id: "ipsae_sc_mech__0101",
    hook: "Mejor docking",
    pose: "haddock",
    metrics: [
      { label: "Docking", value: (c) => fmt(c.haddock_score, 1) },
      { label: "Nativo", value: () => fmt(NATIVE_HADDOCK_SCORE, 1) },
      { label: "Ω RMSD", value: (c) => `${fmt(c.rmsd_A, 2)} Å` },
    ],
  },
  {
    id: "interface_pae_plddt_mech__0136",
    hook: "Mejor MM-GBSA",
    pose: "haddock",
    metrics: [
      { label: "MM-GBSA", value: (c) => fmt(c.mmgbsa, 1) },
      { label: "Epítopo", value: (c) => epiPct(c.epitope_coverage) },
      { label: "Docking", value: (c) => fmt(c.haddock_score, 1) },
    ],
  },
  {
    id: "ipsae_sc_nomech__0043",
    hook: "Ω RMSD < 3 Å",
    pose: "af2",
    metrics: [
      { label: "Ω RMSD", value: (c) => `${fmt(c.rmsd_A, 2)} Å` },
      { label: "Docking", value: (c) => fmt(c.haddock_score, 1) },
      { label: "Rosetta", value: (c) => fmt(c.score_rosetta, 2) },
    ],
  },
  {
    id: "interface_pae_plddt_mech__0035",
    hook: "Más epítopo",
    pose: "af2",
    metrics: [
      { label: "Epítopo", value: (c) => epiPct(c.epitope_coverage) },
      { label: "MM-GBSA", value: (c) => fmt(c.mmgbsa, 1) },
      { label: "Docking", value: (c) => fmt(c.haddock_score, 1) },
    ],
  },
];

const HAPD1_HLS: Highlight[] = [
  {
    id: "temp_09__0668",
    hook: "Ω casi idéntico",
    pose: "af2",
    metrics: [
      { label: "Ω RMSD", value: (c) => `${fmt(c.rmsd_A, 2)} Å` },
      { label: "Rosetta", value: (c) => fmt(c.score_rosetta, 2) },
      { label: "pLDDT", value: (c) => fmt(c.plddt_a, 1) },
    ],
  },
  {
    id: "temp_06__0057",
    hook: "Mejor confianza AF2",
    pose: "af2",
    metrics: [
      { label: "ipTM", value: (c) => fmt(c.iptm, 3) },
      { label: "PAE iface", value: (c) => `${fmt(c.pae_iface, 1)} Å` },
      { label: "pLDDT", value: (c) => fmt(c.plddt_a, 1) },
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

function accent(c: Candidate, panel: PanelId) {
  if (panel === "hapd1_mono60") {
    const arm = c.grupo as keyof typeof HAPD1_ARMS;
    return HAPD1_ARMS[arm]?.color ?? HAPD1_ARMS.temp.color;
  }
  return isNomech(c.grupo) ? ABLATION_CONDS.sin.color : ABLATION_CONDS.con.color;
}

function condLabel(c: Candidate, panel: PanelId) {
  if (panel === "hapd1_mono60") {
    const arm = c.grupo as keyof typeof HAPD1_ARMS;
    return HAPD1_ARMS[arm]?.label ?? c.grupo_label;
  }
  return isNomech(c.grupo) ? ABLATION_CONDS.sin.label : ABLATION_CONDS.con.label;
}

function candsOf(id: PanelId): Candidate[] {
  return PANEL_DATA.panels?.[id]?.candidates ?? [];
}

export function ValidacionShortlist() {
  const [panelId, setPanelId] = useState<PanelId>("moea_pool1208");
  const highlights = panelId === "moea_pool1208" ? VEGF_HLS : HAPD1_HLS;
  const all = useMemo(() => candsOf(panelId), [panelId]);
  const [activeId, setActiveId] = useState(highlights[0].id);

  const selectPanel = (id: PanelId) => {
    setPanelId(id);
    setActiveId((id === "moea_pool1208" ? VEGF_HLS : HAPD1_HLS)[0].id);
  };

  const hl = highlights.find((h) => h.id === activeId) ?? highlights[0];
  const active = all.find((c) => c.id === hl.id) ?? null;
  const compareNative = panelId === "moea_pool1208";
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
  }, [panelId, compareNative]);

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
        <h2 className="vhl-title">Selección final</h2>
        <p className="vhl-sub">
          {panelId === "moea_pool1208"
            ? "Cuatro de los 10 del filtro, cada uno por un criterio distinto. El resto queda en el pool."
            : "Dos de los cuatro HA-PD1 que pasan el filtro: el de mejor acuerdo Ω y el de mejor confianza AF2."}
        </p>
      </header>

      <div className="dockstory-case-controls hapd1-shortlist-tabs">
        {(
          [
            ["moea_pool1208", "VEGF-A"],
            ["hapd1_mono60", "HA-PD1"],
          ] as const
        ).map(([id, tab]) => (
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
            {tab}
          </button>
        ))}
      </div>

      <div className="vhl-grid">
        <div className="vhl-list" role="listbox" aria-label="Diseños destacados">
          {highlights.map((h) => {
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
                style={{ borderLeftColor: accent(c, panelId) }}
                onClick={() => setActiveId(h.id)}
              >
                <span className="vhl-hook">{h.hook}</span>
                <span className="vhl-meta">{c.grupo_label}</span>
              </button>
            );
          })}
        </div>

        <div className="vhl-viewer">
          {compareNative ? (
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
          ) : designPdb ? (
            <ComplexViewer key={active?.id} pdbUrl={designPdb} />
          ) : (
            <p className="dockstory-note">PDB no disponible</p>
          )}

          {active && (
            <div className="vhl-info">
              <div className="vhl-info-head">
                <span
                  className="vhl-tag"
                  style={{ background: accent(active, panelId) }}
                >
                  {condLabel(active, panelId)}
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
                {compareNative ? (
                  <>
                    <span className="ablacion-chip target" /> VEGF-A ·{" "}
                    <span className="ablacion-chip binder" /> VEGFR-2 | péptido
                    {hl.pose === "haddock" ? " · pose HADDOCK" : " · pose AF2"}
                  </>
                ) : (
                  <>
                    <span className="ablacion-chip target" /> HA-PD1 ·{" "}
                    <span className="ablacion-chip binder" /> péptido · pose AF2
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
