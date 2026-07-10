import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import { ComplexViewer } from "../components/ComplexViewer";
import dockingData from "../data/dockingValidation.json";

const fade: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const {
  total,
  local_completed,
  blind_completed: native_completed,
  kpis,
  outcomeBands,
  focusCases,
  candidates,
} = dockingData;

const NATIVE_VEGFA_PDB = "/pdbs/docking-validation/vegfa_A_native.pdb";

type DockingOutcome = "dual" | "close" | "site" | "weak";

type DockingCandidate = {
  repred_id: string;
  group: string;
  blind_cluster: string;
  close_to_local: boolean;
  covers_expected_site: boolean;
  outcome: DockingOutcome;
  rmsd_to_haddock: number | null;
  site_coverage: number | null;
};

type DockingCase = {
  id: string;
  tabTitle: string;
  formulationLabel: string;
  repredId: string;
  outcomeLabel: string;
  poseMatch: boolean;
  siteMatch: boolean;
  localPdb: string | null;
  blindPdb: string | null;
  rmsd: string;
  site: string;
  tone: "success" | "mixed" | "site" | "weak";
};

const GROUP_LABELS: Record<string, string> = {
  interface_pae_plddt_mech: "ipPAE + mecanismos",
  composite_tmscore_mech: "Composite + mecanismos",
  interface_pae_plddt_nomech: "ipPAE sin mecanismos",
  composite_tmscore_nomech: "Composite sin mecanismos",
  ipsae_sc_mech: "ipSAE/SC + mecanismos",
  ipsae_sc_nomech: "ipSAE/SC sin mecanismos",
};

const OUTCOME_TAB_LABELS: Record<DockingOutcome, string> = {
  dual: "Cumple ambos criterios",
  close: "Solo RMSD, sin sitio",
  site: "Solo sitio, sin RMSD",
  weak: "No cumple criterios",
};

const OUTCOME_BADGE_LABELS: Record<DockingOutcome, string> = {
  dual: "Replica el acomodo local y cubre el sitio VEGFR2",
  close: "Replica el acomodo local, pero no cubre el sitio VEGFR2",
  site: "No replica el acomodo local, pero cubre el sitio VEGFR2",
  weak: "No replica el acomodo local ni cubre el sitio VEGFR2",
};

const OUTCOME_TONES: Record<DockingOutcome, DockingCase["tone"]> = {
  dual: "success",
  close: "mixed",
  site: "site",
  weak: "weak",
};

const focusByRepredId = new Map(
  focusCases.map((item) => [item.repredId, item] as const),
);

function formatRmsd(value: number | null): string {
  return value == null ? "N/D" : `${value.toFixed(2)} Å`;
}

function formatSiteCoverage(value: number | null): string {
  return value == null ? "N/D" : `${(value * 100).toFixed(1)}%`;
}

function compactCluster(cluster: string): string {
  if (!cluster) return "";
  return cluster.replace(/^cluster_/, "cluster");
}

function localPdbUrl(repredId: string): string {
  return `/pdbs/docking-validation/${repredId}_local.pdb`;
}

function blindPdbUrl(repredId: string, blindCluster: string): string | null {
  const compact = compactCluster(blindCluster);
  if (!compact) return null;
  return `/pdbs/docking-validation/${repredId}_blind_${compact}.pdb`;
}

const allCases: DockingCase[] = (candidates as DockingCandidate[]).map(
  (candidate, index) => {
    const focus = focusByRepredId.get(candidate.repred_id);
    return {
      id: `candidate-${index + 1}`,
      tabTitle: OUTCOME_TAB_LABELS[candidate.outcome],
      formulationLabel: GROUP_LABELS[candidate.group] ?? candidate.group,
      repredId: candidate.repred_id,
      outcomeLabel: OUTCOME_BADGE_LABELS[candidate.outcome],
      poseMatch: candidate.close_to_local,
      siteMatch: candidate.covers_expected_site,
      localPdb: focus?.localPdb ?? localPdbUrl(candidate.repred_id),
      blindPdb:
        focus?.blindPdb ?? blindPdbUrl(candidate.repred_id, candidate.blind_cluster),
      rmsd: formatRmsd(candidate.rmsd_to_haddock),
      site: formatSiteCoverage(candidate.site_coverage),
      tone: OUTCOME_TONES[candidate.outcome],
    };
  },
);

const fallbackCases: DockingCase[] = focusCases.map((item: any, index) => ({
  id: item.id ?? `focus-${index + 1}`,
  tabTitle: item.tabTitle ?? item.shortLabel ?? "Caso destacado",
  formulationLabel: item.formulationLabel ?? "",
  repredId: item.repredId ?? "",
  outcomeLabel:
    item.outcomeLabel ??
    item.badge ??
    item.reading ??
    "Clasificación sin etiqueta disponible",
  poseMatch: Boolean(item.poseMatch),
  siteMatch: Boolean(item.siteMatch),
  localPdb: item.localPdb ?? null,
  blindPdb: item.blindPdb ?? null,
  rmsd: item.rmsd ?? "N/D",
  site: item.site ?? "N/D",
  tone:
    item.tone === "success" || item.tone === "mixed" || item.tone === "site"
      ? item.tone
      : "weak",
}));

function criteriaLabel(match: boolean): string {
  return match ? "sí" : "no";
}

export function ValidacionDocking() {
  const cases = allCases.length > 0 ? allCases : fallbackCases;
  const [activeId, setActiveId] = useState(cases[0]?.id ?? "");
  const activeIndex = Math.max(
    cases.findIndex((item) => item.id === activeId),
    0,
  );
  const active = cases[activeIndex];

  if (!active) {
    return null;
  }

  const previousCase = () => {
    const nextIndex = (activeIndex - 1 + cases.length) % cases.length;
    setActiveId(cases[nextIndex].id);
  };

  const nextCase = () => {
    const nextIndex = (activeIndex + 1) % cases.length;
    setActiveId(cases[nextIndex].id);
  };

  return (
    <motion.div
      className="dockstory"
      variants={fade}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.15 }}
    >
      <div className="dockstory-grid">
        <motion.div variants={fade} className="dockstory-copy">
          <h2 className="dockstory-title">Resultados del Docking</h2>
          <p className="dockstory-text">
            <strong>{total} candidatos</strong> del frente
          </p>

          <ul className="dockstory-mode-list">
            <li className="dockstory-mode-item dockstory-mode-local">
              <span className="dockstory-mode-name">Local guiado (HADDOCK)</span>
              <span className="dockstory-mode-role">PDB de referencia</span>
              <strong className="dockstory-mode-count">
                {local_completed}/{total}
              </strong>
            </li>
            <li className="dockstory-mode-item dockstory-mode-native">
              <span className="dockstory-mode-name">Sobre VEGFA nativo (CABS-dock)</span>
              <span className="dockstory-mode-role">Búsqueda global</span>
              <strong className="dockstory-mode-count">
                {native_completed}/{total}
              </strong>
            </li>
          </ul>

          <p className="dockstory-scope">
            Por candidato se calculan el RMSD del péptido y la cobertura del
            epitopo VEGFR2, y se evalúan con criterios fijos (≤25 Å y ≥20%).
          </p>

          <span className="dockstory-section-title">Cumplimiento de criterios</span>
          <div className="dockstory-kpi-grid">
            {kpis.map((kpi) => (
              <article key={kpi.label} className="dockstory-kpi-card">
                <span className="dockstory-kpi-label">{kpi.label}</span>
                <strong className="dockstory-kpi-value">{kpi.value}</strong>
                <span className="dockstory-kpi-count">{kpi.count}</span>
              </article>
            ))}
          </div>

          <section className="dockstory-outcome-card">
            <span className="dockstory-section-title">
              Clasificación de los {total} candidatos (docking sobre VEGFA nativo)
            </span>

            <div className="dockstory-outcome-bar" aria-hidden>
              {outcomeBands.map((band, index) => (
                <span
                  key={`${band.label}-${index}`}
                  className={`dockstory-outcome-segment dockstory-outcome-segment-${band.tone}`}
                  style={{ width: band.width }}
                />
              ))}
            </div>

            <div className="dockstory-outcome-grid">
              {outcomeBands.map((band, index) => (
                <div key={`${band.label}-${index}`} className="dockstory-outcome-item">
                  <span
                    className={`dockstory-outcome-dot dockstory-outcome-dot-${band.tone}`}
                    aria-hidden
                  />
                  <div>
                    <strong>{band.count}</strong>
                    <p>{band.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </motion.div>

        <motion.div variants={fade} className="dockstory-panel dockstory-panel-visual">
          <div className="dockstory-case-controls">
            <span className="dockstory-case-counter">
              Candidato {activeIndex + 1} de {cases.length}
            </span>
            <div className="dockstory-case-nav">
              <button
                type="button"
                className="dockstory-case-nav-btn"
                onClick={previousCase}
              >
                Anterior
              </button>
              <button
                type="button"
                className="dockstory-case-nav-btn"
                onClick={nextCase}
              >
                Siguiente
              </button>
            </div>
          </div>

          <label className="dockstory-case-select-wrap">
            <select
              className="dockstory-case-select"
              value={active.id}
              onChange={(event) => setActiveId(event.target.value)}
            >
              {cases.map((item, index) => (
                <option key={item.id} value={item.id}>
                  {index + 1}. {item.repredId} · {item.tabTitle}
                </option>
              ))}
            </select>
          </label>

          <div className="dockstory-case-headline">
            <span className="dockstory-case-tab-title">{active.tabTitle}</span>
            <span className="dockstory-case-tab-meta">{active.formulationLabel}</span>
          </div>

          <div className="dockstory-viewer-grid">
            <article className="dockstory-viewer-card">
              <div className="dockstory-viewer-heading">
                <span className="dockstory-viewer-tool">HADDOCK</span>
                <span className="dockstory-viewer-role">Pose de referencia</span>
              </div>
              <div className="dockstory-viewer-frame">
                {active.localPdb ? (
                  <ComplexViewer pdbUrl={active.localPdb} referenceUrl={active.localPdb} />
                ) : (
                  <div className="dockstory-viewer-missing">PDB local no disponible</div>
                )}
              </div>
            </article>

            <article className="dockstory-viewer-card">
              <div className="dockstory-viewer-heading">
                <span className="dockstory-viewer-tool">CABS-dock</span>
                <span className="dockstory-viewer-role">Sobre VEGFA nativo</span>
              </div>
              <div className="dockstory-viewer-frame">
                {active.blindPdb ? (
                  <ComplexViewer
                    pdbUrl={active.blindPdb}
                    referenceUrl={NATIVE_VEGFA_PDB}
                    fixTargetFromReference
                  />
                ) : (
                  <div className="dockstory-viewer-missing">
                    PDB de docking sobre VEGFA nativo no disponible
                  </div>
                )}
              </div>
            </article>
          </div>

          <div className="dockstory-case-summary">
            <div className="dockstory-case-metrics">
              <div className="dockstory-case-metric">
                <span>RMSD al local</span>
                <strong>{active.rmsd}</strong>
              </div>
              <div className="dockstory-case-metric">
                <span>Cobertura epitopo VEGFR2</span>
                <strong>{active.site}</strong>
              </div>
              <div className="dockstory-case-metric dockstory-case-metric-id">
                <span>Repredicción</span>
                <strong>{active.repredId}</strong>
              </div>
            </div>

            <div className="dockstory-case-criteria">
              <span>Criterio RMSD ≤25 Å: {criteriaLabel(active.poseMatch)}</span>
              <span>Criterio sitio ≥20%: {criteriaLabel(active.siteMatch)}</span>
            </div>

            <div
              className={`dockstory-case-badge dockstory-case-badge-${active.tone}`}
            >
              <p>{active.outcomeLabel}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
