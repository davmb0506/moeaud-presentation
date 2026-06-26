import { motion, type Variants } from "framer-motion";

const wrap: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const fade: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const STAGES = [
  {
    step: "01",
    title: "Extracción",
    what: "Pool final, réplicas y complejos disponibles.",
    why: "Consolidación inicial",
  },
  {
    step: "02",
    title: "ProtParam",
    what: "II, GRAVY, pI y contenido de Cys.",
    why: "Filtro fisicoquímico",
  },
  {
    step: "03",
    title: "Interfaz",
    what: "Delta SASA, contactos y consistencia básica.",
    why: "Verificación de interfaz",
  },
  {
    step: "04",
    title: "Energía",
    what: "ΔG y métricas complementarias de afinidad.",
    why: "Caracterización energética",
  },
  {
    step: "05",
    title: "Geometría",
    what: "Choques, estereoquímica y calidad estructural.",
    why: "Control estructural",
  },
  {
    step: "06",
    title: "Ranking",
    what: "Dominancia de Pareto y agregación multi-criterio.",
    why: "Priorización final",
  },
] as const;

export function ValidacionFlujo() {
  return (
    <motion.div
      className="valflow"
      variants={wrap}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.15 }}
    >
      <motion.div variants={fade} className="valflow-head">
        <h2 className="valflow-title">Flujo de validación</h2>
        <p className="valflow-sub">
          Secuencia de filtros y métricas complementarias aplicada a los
          candidatos obtenidos por MOEA-UD.
        </p>
      </motion.div>

      <br></br>
      <br></br>

      <div className="valflow-pipeline">
        {STAGES.map((stage) => (
          <motion.article
            key={stage.step}
            variants={fade}
            className="valflow-stage"
          >
            <span className="valflow-stage-step">{stage.step}</span>
            <h3 className="valflow-stage-title">{stage.title}</h3>
            <p className="valflow-stage-what">{stage.what}</p>
            <p className="valflow-stage-why">{stage.why}</p>
          </motion.article>
        ))}
      </div>
    </motion.div>
  );
}
