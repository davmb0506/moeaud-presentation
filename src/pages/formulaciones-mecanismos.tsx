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

const FORMULATIONS = [
  {
    pair: "Interface-PAE / pLDDT",
    f1: {
      name: "Interface-PAE",
      meaning:
        "Confianza de AlphaFold en la pose relativa VEGF-A–péptido (error esperado en la interfaz).",
    },
    f2: {
      name: "pLDDT",
      meaning:
        "Pliegue: si la estructura local se ve bien resuelta (no dice si la unión es la correcta).",
    },
  },
  {
    pair: "Compuesto / TM-score",
    f1: {
      name: "Compuesto",
      meaning:
        "Calidad de la unión: combina ipSAE, SC y ΔSASA.",
    },
    f2: {
      name: "TM-score",
      meaning:
        "Similitud del pliegue del péptido en el complejo vs el mismo péptido solo (AF2).",
    },
  },
  {
    pair: "ipSAE / SC",
    f1: {
      name: "ipSAE",
      meaning: "Confianza de AlphaFold sobre la interfaz (señal de la red).",
    },
    f2: {
      name: "SC",
      meaning:
        "Encaje de formas: si las superficies se complementan en el contacto.",
    },
  },
] as const;

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
        <h2 className="formech-title">Formulaciones y mecanismos</h2>
        <p className="formech-sub">Se eligieron 3 pares de objetivos.</p>
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
              <dl className="formech-axes">
                <div className="formech-axis">
                  <dt>{active.f1.name}</dt>
                  <dd>{active.f1.meaning}</dd>
                </div>
                <div className="formech-axis">
                  <dt>{active.f2.name}</dt>
                  <dd>{active.f2.meaning}</dd>
                </div>
              </dl>
            </motion.div>
          </AnimatePresence>
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
