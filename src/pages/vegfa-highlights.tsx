import { useMemo, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { ComplexViewer } from "../components/ComplexViewer";
import { DesignCharacterization } from "../components/DesignCharacterization";
import { ABLATION_CONDS } from "../data/experimentLabels";
import shortlistData from "../data/shortlistGoudy.json";

const fade: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

type Cand = {
  id: string;
  rank: number;
  grupo: string;
  grupo_label: string;
  binder_seq: string;
  score_rosetta: number | null;
  rmsd_A: number | null;
  omega_class: string;
  epitope_coverage: number | null;
  mmgbsa: number | null;
  sc: number | null;
  pae_iface: number | null;
  plddt_a: number | null;
  pdb: string | null;
  gravy: number | null;
  charge: number | null;
  pI: number | null;
  mw_kda: number | null;
  aromaticity: number | null;
  instability: number | null;
};

type Highlight = {
  id: string;
  hook: string;
  why: string;
};

/** Cuatro diseños VEGF-A de la selección final, cada uno por un criterio distinto. */
const HIGHLIGHTS: Highlight[] = [
  {
    id: "ipsae_sc_nomech__0043",
    hook: "Único Ω estricto",
    why: "Menor RMSD AlphaFold–OmegaFold de la selección (2.63 Å). Grupo ipSAE/SC sin mecanismos.",
  },
  {
    id: "interface_pae_plddt_mech__0035",
    hook: "Mayor cobertura de epítopo",
    why: "64 % del sitio VEGFR-2 contactado en la pose AF2. Grupo Interface-PAE/pLDDT con mecanismos.",
  },
  {
    id: "interface_pae_plddt_mech__0136",
    hook: "Menor energía MM-GBSA",
    why: "ΔG MM-GBSA −139 kcal/mol y 57 % de cobertura de epítopo.",
  },
  {
    id: "interface_pae_plddt_nomech__0134",
    hook: "Mejor Rosetta del embudo",
    why: "Primer lugar por dG/dSASA (−4.58). 50 % de epítopo; sin mecanismos.",
  },
];

const ALL = (
  (shortlistData as { panels: { moea_pool1208: { candidates: Cand[] } } })
    .panels.moea_pool1208.candidates ?? []
);

function byId(id: string): Cand | undefined {
  return ALL.find((c) => c.id === id);
}

function isNomech(grupo: string) {
  return grupo.includes("nomech");
}

function accent(grupo: string) {
  return isNomech(grupo) ? ABLATION_CONDS.sin.color : ABLATION_CONDS.con.color;
}

function condLabel(grupo: string) {
  return isNomech(grupo) ? ABLATION_CONDS.sin.label : ABLATION_CONDS.con.label;
}

function fmt(n: number | null | undefined, d = 2) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toFixed(d);
}

function epiPct(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(100 * n)}%`;
}

function omegaLabel(c: string | null | undefined) {
  if (c === "pass") return "estricto";
  if (c === "soft" || c === "marginal") return "laxo";
  if (c === "fail") return "falla";
  return c ?? "—";
}

const REF =
  byId("ipsae_sc_nomech__0043") ?? byId(HIGHLIGHTS[0].id) ?? ALL[0];

export function VegfaHighlights() {
  const [activeId, setActiveId] = useState(HIGHLIGHTS[0].id);
  const activeHl = HIGHLIGHTS.find((h) => h.id === activeId) ?? HIGHLIGHTS[0];
  const active = useMemo(() => byId(activeId) ?? null, [activeId]);

  return (
    <motion.div
      className="vhl"
      variants={fade}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.12 }}
    >
      <header className="vhl-head">
        <h2 className="vhl-title">Cuatro diseños VEGF-A de la selección final</h2>
        <p className="vhl-sub">
          Del embudo sobre 1208 no dominadas. Cada entrada destaca por un
          criterio distinto (acuerdo Ω, epítopo, MM-GBSA o Rosetta).
        </p>
      </header>

      <div className="vhl-grid">
        <div className="vhl-list" role="listbox" aria-label="Diseños destacados">
          {HIGHLIGHTS.map((h) => {
            const c = byId(h.id);
            if (!c) return null;
            const on = h.id === activeId;
            return (
              <button
                key={h.id}
                type="button"
                role="option"
                aria-selected={on}
                className={"vhl-card" + (on ? " active" : "")}
                style={{ borderLeftColor: accent(c.grupo) }}
                onClick={() => setActiveId(h.id)}
              >
                <span className="vhl-hook">{h.hook}</span>
                <span className="vhl-id">{c.id}</span>
                <span className="vhl-meta">
                  {c.grupo_label} · Ω {omegaLabel(c.omega_class)} · epi{" "}
                  {epiPct(c.epitope_coverage)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="vhl-viewer">
          <ComplexViewer
            pdbUrl={active?.pdb ?? null}
            referenceUrl={REF?.pdb ?? null}
          />
          {active && activeHl && (
            <div className="vhl-info">
              <div className="vhl-info-head">
                <span
                  className="vhl-tag"
                  style={{ background: accent(active.grupo) }}
                >
                  {condLabel(active.grupo)}
                </span>
                <span className="vhl-hook-inline">{activeHl.hook}</span>
              </div>
              <p className="vhl-why">{activeHl.why}</p>
              <div className="vhl-metrics">
                <div>
                  <span>Rosetta dG/dSASA</span>
                  <strong>{fmt(active.score_rosetta, 2)}</strong>
                </div>
                <div>
                  <span>Ω RMSD</span>
                  <strong>{fmt(active.rmsd_A, 2)} Å</strong>
                </div>
                <div>
                  <span>Epítopo</span>
                  <strong>{epiPct(active.epitope_coverage)}</strong>
                </div>
                <div>
                  <span>MM-GBSA</span>
                  <strong>{fmt(active.mmgbsa, 1)}</strong>
                </div>
                <div>
                  <span>PAE iface</span>
                  <strong>{fmt(active.pae_iface, 1)}</strong>
                </div>
                <div>
                  <span>pLDDT péptido</span>
                  <strong>{fmt(active.plddt_a, 1)}</strong>
                </div>
              </div>
              <DesignCharacterization
                m={{
                  charge: active.charge,
                  pi: active.pI,
                  gravy: active.gravy,
                  mw_kda: active.mw_kda,
                  aromaticity: active.aromaticity,
                  instability: active.instability,
                }}
              />
              <code className="vhl-seq">{active.binder_seq}</code>
              <p className="vhl-note">
                <span className="ablacion-chip target" /> VEGF-A ·{" "}
                <span className="ablacion-chip binder" /> péptido · pose AF2
                (superpuesta a la referencia Ω estricto)
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
