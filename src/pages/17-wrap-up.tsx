import { motion, type Variants } from "framer-motion";

const wrap: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const fade: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

export function WrapUp() {
  return (
    <motion.div
      className="sintesis"
      variants={wrap}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.2 }}
    >
      <motion.h2 variants={fade} className="sintesis-title">
        Síntesis
      </motion.h2>

      <motion.ol variants={fade} className="sintesis-list">
        <li>
          Formulación monoobjetivo (HA-PD1): cruza y temperatura variable
          mejoran la aptitud frente a la formulación base.
        </li>
        <li>
          Formulación multiobjetivo (VEGF-A): los mecanismos adaptativos
          mejoran hipervolumen y archivo solo en Interface-PAE / pLDDT.
        </li>
        <li>
          Los diseños muestran oclusión estérica significativa del sitio
          VEGFR-2, posicionándolos como <em>leads</em> computacionales
          pendientes de validación experimental.
        </li>
      </motion.ol>

      <motion.h3 variants={fade} className="sintesis-section">
        Trabajo pendiente
      </motion.h3>

      <motion.ol variants={fade} className="sintesis-list">
        <li>Redactar y completar el documento de tesis.</li>
        <li> Desarrollo de interfaz gráfica para uso general del framework.</li>
        <li>
          Fuera del alcance: validación experimental de los 10
          candidatos VEGF-A (unión y competencia con VEGFR-2).
        </li>
      </motion.ol>
    </motion.div>
  );
}
