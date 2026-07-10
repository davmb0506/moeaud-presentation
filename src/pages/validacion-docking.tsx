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
} = dockingData;

const NATIVE_VEGFA_PDB = "/pdbs/docking-validation/vegfa_A_native.pdb";

function criteriaLabel(match: boolean): string {
  return match ? "sí" : "no";
}

export function ValidacionDocking() {
  const [activeId, setActiveId] = useState(focusCases[0]?.id ?? "");
  const active = focusCases.find((item) => item.id === activeId) ?? focusCases[0];

  if (!active) {
    return null;
  }

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
              {outcomeBands.map((band) => (
                <span
                  key={band.key ?? band.label}
                  className={`dockstory-outcome-segment dockstory-outcome-segment-${band.tone}`}
                  style={{ width: band.width }}
                />
              ))}
            </div>

            <div className="dockstory-outcome-grid">
              {outcomeBands.map((band) => (
                <div key={band.key ?? band.label} className="dockstory-outcome-item">
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
          <div className="dockstory-case-tabs">
            {focusCases.map((item) => {
              const isActive = item.id === active.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`dockstory-case-tab${isActive ? " active" : ""}`}
                  onClick={() => setActiveId(item.id)}
                >
                  <span className="dockstory-case-tab-title">{item.tabTitle}</span>
                  <span className="dockstory-case-tab-meta">{item.formulationLabel}</span>
                </button>
              );
            })}
          </div>

          <div className="dockstory-viewer-grid">
            <article className="dockstory-viewer-card">
              <div className="dockstory-viewer-heading">
                <span className="dockstory-viewer-tool">HADDOCK</span>
                <span className="dockstory-viewer-role">Pose de referencia</span>
              </div>
              <div className="dockstory-viewer-frame">
                <ComplexViewer pdbUrl={active.localPdb} referenceUrl={active.localPdb} />
              </div>
            </article>

            <article className="dockstory-viewer-card">
              <div className="dockstory-viewer-heading">
                <span className="dockstory-viewer-tool">CABS-dock</span>
                <span className="dockstory-viewer-role">Sobre VEGFA nativo</span>
              </div>
              <div className="dockstory-viewer-frame">
                <ComplexViewer
                  pdbUrl={active.blindPdb}
                  referenceUrl={NATIVE_VEGFA_PDB}
                  fixTargetFromReference
                />
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
