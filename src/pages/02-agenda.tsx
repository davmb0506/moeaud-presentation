import { motion, type Variants } from "framer-motion";

const list: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
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

      <motion.ol variants={item} className="agenda-list">
        <li>Objetivo y caso de estudio</li>
        <li>Conceptos previos</li>
        <li>Metodología</li>
        <li>Resultados</li>
        <li>Conclusiones</li>
        <li>Trabajo futuro</li>
      </motion.ol>
    </motion.div>
  );
}
