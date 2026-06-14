import { motion, type Variants } from "framer-motion";

const list: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export function Agenda() {
  return (
    <motion.div
      className="agenda"
      variants={list}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.3 }}
    >
      <motion.h2 variants={item} className="agenda-title">
        Agenda
      </motion.h2>

      <ol className="agenda-list">
        <motion.li variants={item}>Recapitulación.</motion.li>

        <motion.li variants={item}>
          Actividades realizadas en este periodo (Diciembre 2025 - Abril 2026).
          <ol className="agenda-sublist">
            <li>Temperatura variable para ProteinMPNN.</li>
            <li>Transición a optimización multiobjetivo.</li>
            <li>MOEA-UD.</li>
            <li>Mecanismo adaptativo de inyección de secuencias.</li>
            <li>Mecanismo de selección de operador genético.</li>
          </ol>
        </motion.li>

        <motion.li variants={item}>
          Actividades subsecuentes (Abril 2026 - Agosto 2026).
          <ol className="agenda-sublist">
            <li>Experimentos finales con objetivos selectos.</li>
            <li>
              Validación de diseños <em>in silico</em>.
            </li>
          </ol>
        </motion.li>

        <motion.li variants={item}>Cronograma de actividades.</motion.li>
      </ol>
    </motion.div>
  );
}
