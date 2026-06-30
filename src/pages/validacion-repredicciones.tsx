import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import { ComplexViewer } from "../components/ComplexViewer";
import repredictionData from "../data/repredictionExamples.json";

const fade: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

type RepredictionExample = {
  id: string;
  groupLabel: string;
  groupShort: string;
  repredId: string;
  binder: string;
  iptm: number;
  interfacePae: number;
  binderPlddt: number;
  complexPlddt: number;
  pdb: string;
};

const EXAMPLES = repredictionData.examples as RepredictionExample[];
const INITIAL = EXAMPLES[0];

export function ValidacionRepredicciones() {
  const [activeId, setActiveId] = useState(INITIAL.id);
  const active = EXAMPLES.find((example) => example.id === activeId) ?? INITIAL;

  return (
    <motion.div
      className="repred"
      variants={fade}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.15 }}
    >
      <h2 className="validacion-title">
        Repredicciones estructurales independientes
      </h2>
      <p className="validacion-sub">
        La etapa 5 reevalúa candidatos seleccionados con una corrida
        independiente de AlphaFold para verificar reproducibilidad estructural
        fuera del proceso de optimización.
      </p>

      <div className="repred-grid">
        <aside className="repred-sidebar">
          <section className="validacion-card repred-card repred-context">
            <p className="repred-context-lead">
              Complejos binder–VEGF-A repredichos a partir de candidatos
              priorizados tras la validación en cascada.
            </p>
            <p className="repred-context-note">
              Las repredicciones independientes recuperan complejos con métricas
              estructurales compatibles con una interfaz plausible, lo que
              respalda la robustez de los candidatos priorizados.
            </p>
          </section>

          <section className="validacion-card repred-card">
            <div className="repred-selector">
              {EXAMPLES.map((example) => {
                const activeExample = example.id === active.id;
                return (
                  <button
                    key={example.id}
                    type="button"
                    className={`repred-option${activeExample ? " active" : ""}`}
                    onClick={() => setActiveId(example.id)}
                  >
                    <span className="repred-option-title">
                      {example.groupShort}
                    </span>
                    <span className="repred-option-meta">
                      {example.repredId}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="validacion-card repred-card repred-details">
            <div className="repred-details-head">
              <span className="repred-details-group">{active.groupLabel}</span>
              <code className="repred-details-id">{active.repredId}</code>
            </div>

            <div className="repred-metrics">
              <div className="repred-metric-item">
                <span className="repred-metric-label">ipTM</span>
                <strong className="repred-metric-value">
                  {active.iptm.toFixed(3)}
                </strong>
              </div>
              <div className="repred-metric-item">
                <span className="repred-metric-label">Interface PAE</span>
                <strong className="repred-metric-value">
                  {active.interfacePae.toFixed(1)} Å
                </strong>
              </div>
              <div className="repred-metric-item">
                <span className="repred-metric-label">pLDDT binder</span>
                <strong className="repred-metric-value">
                  {active.binderPlddt.toFixed(1)}
                </strong>
              </div>
              <div className="repred-metric-item">
                <span className="repred-metric-label">pLDDT complejo</span>
                <strong className="repred-metric-value">
                  {active.complexPlddt.toFixed(1)}
                </strong>
              </div>
            </div>

            <code className="repred-seq">{active.binder}</code>
          </section>
        </aside>

        <section className="validacion-card repred-card repred-viewer-card">
          <div className="repred-viewer-stage">
            <ComplexViewer
              pdbUrl={active.pdb}
              referenceUrl={INITIAL.pdb}
            />
          </div>

          <p className="repred-legend">
            <span className="ablacion-chip target" /> VEGF-A (objetivo) ·{" "}
            <span className="ablacion-chip binder" /> binder diseñado
          </p>
          <p className="repred-viewer-note">
            Las repredicciones permiten evaluar si la interfaz propuesta se
            recupera con una corrida independiente, reduciendo el riesgo de
            sobreinterpretar una sola predicción estructural.
          </p>
        </section>
      </div>
    </motion.div>
  );
}
