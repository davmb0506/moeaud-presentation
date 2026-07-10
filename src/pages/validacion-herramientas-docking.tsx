import { useEffect, useState } from "react";
import { motion, type Variants, useReducedMotion } from "framer-motion";
import { DockingScene3D, type DockingMode } from "../components/DockingScene3D";

const fade: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const CARDS = [
  {
    mode: "guided" as DockingMode,
    chip: "HADDOCK3",
    title: "Refina una pose candidata",
    process: ["Pose inicial", "Búsqueda local", "Refinamiento", "Complejos rankeados"],
    input: ["PDB del complejo (VEGF-A + péptido ya colocado)"],
    output: ["Complejos refinados rankeados cerca del sitio"],
    summary: "Refina una hipotesis estructural inicial.",
  },
  {
    mode: "blind" as DockingMode,
    chip: "CABS-dock · búsqueda global",
    title: "Explora la superficie sin pose inicial",
    process: ["Sin pose inicial", "Exploración global", "Convergencia", "Parche de unión inferido"],
    input: ["VEGF-A + secuencia del péptido (sin pose inicial)"],
    output: ["Parches de unión inferidos y grupos de poses"],
    summary: "Infiere dónde podría unirse el péptido sobre VEGFA nativo.",
  },
] as const;

function CardRow({
  label,
  items,
  tone,
}: {
  label: string;
  items: readonly string[];
  tone: DockingMode;
}) {
  return (
    <div className={`dock3-row dock3-row-${tone}`}>
      <span className="dock3-row-label">{label}</span>
      <div className="dock3-row-items">
        {items.map((item) => (
          <span key={item} className="dock3-row-chip">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProcessNarrative({
  tone,
  steps,
  activeStep,
}: {
  tone: DockingMode;
  steps: readonly string[];
  activeStep: number;
}) {
  return (
    <div className={`dock3-process dock3-process-${tone}`}>
      <span className="dock3-process-label">Proceso</span>
      <ol className="dock3-process-line" aria-label="Proceso de busqueda">
        {steps.map((step, index) => {
          const state =
            index === activeStep ? "active" : index < activeStep ? "past" : "upcoming";
          return (
            <li
              key={step}
              className={`dock3-process-step dock3-process-step-${state}`}
              aria-current={index === activeStep ? "step" : undefined}
            >
              <span className="dock3-process-dot" />
              <span className="dock3-process-text">{step}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function DockingCard({
  mode,
  chip,
  title,
  process,
  input,
  output,
  summary,
  paused,
  activeStep,
}: {
  mode: DockingMode;
  chip: string;
  title: string;
  process: readonly string[];
  input: readonly string[];
  output: readonly string[];
  summary: string;
  paused: boolean;
  activeStep: number;
}) {
  return (
    <article className={`dock3-card dock3-card-${mode}`}>
      <div className="dock3-card-head">
        <span className={`dock3-chip dock3-chip-${mode}`}>{chip}</span>
        <h3 className="dock3-card-title">{title}</h3>
      </div>

      <div className="dock3-scene-shell">
        <DockingScene3D mode={mode} paused={paused} activeStep={activeStep} />
      </div>

      <ProcessNarrative tone={mode} steps={process} activeStep={activeStep} />

      <div className="dock3-card-meta">
        <CardRow label="Entrada" items={input} tone={mode} />
        <CardRow label="Salida" items={output} tone={mode} />
      </div>

      <p className="dock3-summary">{summary}</p>
    </article>
  );
}

export function ValidacionHerramientasDocking() {
  const prefersReducedMotion = useReducedMotion();
  const [manualPaused, setManualPaused] = useState<boolean | null>(null);
  const paused = Boolean(manualPaused ?? prefersReducedMotion);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setActiveStep((step) => (step + 1) % 4);
    }, 2200);
    return () => window.clearInterval(id);
  }, [paused]);

  return (
    <motion.div
      className="dock3"
      variants={fade}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.15 }}
    >
      <div className="dock3-head">
        <div className="dock3-copy">
          <h2 className="dock3-title">Docking molecular</h2>
          <p className="dock3-intro">
            HADDOCK3 evalúa y refina una pose candidata; CABS-dock hace una búsqueda
            global sobre VEGFA cuando no se impone una pose inicial.
          </p>
        </div>

        <button
          type="button"
          className="dock3-toggle"
          onClick={() => setManualPaused(!paused)}
          aria-pressed={paused}
        >
          {paused ? "Reproducir animacion" : "Pausar animacion"}
        </button>
      </div>

      <div className="dock3-grid">
        {CARDS.map((card) => (
          <DockingCard
            key={card.mode}
            mode={card.mode}
            chip={card.chip}
            title={card.title}
            process={card.process}
            input={card.input}
            output={card.output}
            summary={card.summary}
            paused={paused}
            activeStep={activeStep}
          />
        ))}
      </div>

      {prefersReducedMotion && manualPaused == null ? (
        <p className="dock3-note">
          La escena inicia pausada para respetar la preferencia del sistema de reducir
          movimiento.
        </p>
      ) : null}
    </motion.div>
  );
}
