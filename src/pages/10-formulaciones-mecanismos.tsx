import { AnimatePresence, motion, type Variants } from "framer-motion";

export const FORMECH_MAX_STEP = 2;

const wrap: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const fade: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

type Axis = {
  name: string;
  units: string;
  better: "↓" | "↑";
  meaning: string;
};

type Formulation = {
  pair: string;
  seeks: string;
  conflict: string;
  f1: Axis;
  f2: Axis;
};

const FORMULATIONS: Formulation[] = [
  {
    pair: "Interface-PAE / pLDDT",
    seeks:
      "Pose de unión confiable sin sacrificar la calidad del pliegue local.",
    conflict:
      "AF puede mejorar la confianza de la interfaz degradando la del pliegue (o al revés).",
    f1: {
      name: "Interface-PAE (iPAE)",
      units: "Å",
      better: "↓",
      meaning:
        "Error esperado de la pose relativa VEGF-A–péptido (PAE intercadena).",
    },
    f2: {
      name: "pLDDT",
      units: "0–100",
      better: "↑",
      meaning: "Si la estructura local se ve bien resuelta (confianza de pliegue).",
    },
  },
  {
    pair: "Compuesto / TM-score",
    seeks:
      "Buena calidad de unión sin exigir un cambio grande de pliegue al unirse.",
    conflict:
      "A veces mejorar el contacto pide deformar el péptido respecto a su forma sola.",
    f1: {
      name: "Compuesto",
      units: "0–1",
      better: "↑",
      meaning: "Calidad de la unión: combina ipSAE, SC y ΔSASA.",
    },
    f2: {
      name: "TM-score",
      units: "0–1",
      better: "↑",
      meaning:
        "Similitud del pliegue del péptido solo vs en el complejo (AF2).",
    },
  },
  {
    pair: "ipSAE / SC",
    seeks:
      "Interfaz que la red confía y que además encaja geométricamente.",
    conflict:
      "Alta confianza de AF no implica buen encaje de formas (y al revés).",
    f1: {
      name: "ipSAE",
      units: "0–1",
      better: "↑",
      meaning:
        "Score de confianza de interfaz a partir de la matriz PAE (no es iPAE en Å).",
    },
    f2: {
      name: "SC",
      units: "0–1",
      better: "↑",
      meaning:
        "Complementaridad de formas en el contacto (geometría 3D, no AF).",
    },
  },
];

const MECHANISMS = [
  {
    name: "Selección de operadores",
    why: "Reajusta las proporciones de mutación, ProteinMPNN y variantes locales según si el hipervolumen mejora o no.",
  },
  {
    name: "Inyección de diversidad",
    why: "Si el hipervolumen se estanca, inyecta secuencias nuevas (exploración, refinamiento o extremos del frente).",
  },
] as const;

function AxisCard({ axis }: { axis: Axis }) {
  return (
    <div className="formech-axis">
      <div className="formech-axis-top">
        <dt>{axis.name}</dt>
        <span className="formech-axis-meta">
          {axis.units} · {axis.better} mejor
        </span>
      </div>
      <dd>{axis.meaning}</dd>
    </div>
  );
}

export function FormulacionesMecanismos({
  step = 0,
  onStepChange,
}: {
  step?: number;
  onStepChange?: (next: number) => void;
}) {
  const s = Math.max(0, Math.min(FORMECH_MAX_STEP, step));
  const active = FORMULATIONS[s];

  const go = (next: number) => {
    const n = Math.max(0, Math.min(FORMECH_MAX_STEP, next));
    onStepChange?.(n);
  };

  return (
    <motion.div
      className="formech"
      variants={wrap}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.15 }}
    >
      <motion.div variants={fade} className="formech-head">
        <h2 className="formech-title">Formulaciones multiobjetivo</h2>
      </motion.div>

      <motion.div variants={fade} className="formech-viz">
        <section className="formech-block">
          <div className="formech-pair-head">
            <h3 className="formech-label">Pares de objetivos</h3>
            <div className="formech-pair-nav" role="group" aria-label="Par de objetivos">
              <button
                type="button"
                className="formech-nav-btn"
                onClick={() => go(s - 1)}
                disabled={s === 0}
                aria-label="Par anterior"
              >
                ←
              </button>
              <span className="formech-step-idx">
                {s + 1} / {FORMULATIONS.length}
              </span>
              <button
                type="button"
                className="formech-nav-btn"
                onClick={() => go(s + 1)}
                disabled={s === FORMECH_MAX_STEP}
                aria-label="Par siguiente"
              >
                →
              </button>
            </div>
          </div>

          <div className="formech-pips" role="tablist" aria-label="Elegir par">
            {FORMULATIONS.map((f, i) => (
              <button
                key={f.pair}
                type="button"
                role="tab"
                aria-selected={i === s}
                className={"formech-pip" + (i === s ? " is-on" : "")}
                onClick={() => go(i)}
                aria-label={f.pair}
              />
            ))}
          </div>

          <div className="formech-pair-stage">
            <AnimatePresence mode="wait">
              <motion.div
                key={active.pair}
                className="formech-pair"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <h4 className="formech-pair-title">{active.pair}</h4>

                <p className="formech-seek">
                  <span className="formech-seek-k">Qué busca</span>
                  {active.seeks}
                </p>

                <dl className="formech-axes">
                  <AxisCard axis={active.f1} />
                  <AxisCard axis={active.f2} />
                </dl>

                <p className="formech-conflict">
                  <span className="formech-conflict-k">Conflicto</span>
                  {active.conflict}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        <section className="formech-block formech-mech-col">
          <h3 className="formech-label">Mecanismos adaptativos (MA)</h3>
          <ol className="formech-list formech-list-mech">
            {MECHANISMS.map((m) => (
              <li key={m.name}>
                <strong>{m.name}</strong>
                <span>{m.why}</span>
              </li>
            ))}
          </ol>
        </section>
      </motion.div>
    </motion.div>
  );
}
