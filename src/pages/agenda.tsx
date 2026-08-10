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
        <li>
          Marco y contexto
          <ol type="a">
            <li>Objetivo general</li>
            <li>EvoPro y HA-PD1</li>
            <li>De mono a multiobjetivo</li>
          </ol>
        </li>
        <li>
          Resultados VEGF-A y cribado (énfasis)
          <ol type="a">
            <li>Formulaciones y mecanismos adaptativos</li>
            <li>Resultados de experimentos con mecanismos adaptativos</li>
            <li>Cribado y selección final</li>
          </ol>
        </li>
        <li>
          Síntesis y cierre
          <ol type="a">
            <li>Síntesis y trabajo pendiente</li>
            <li>Referencias</li>
          </ol>
        </li>
      </motion.ol>
    </motion.div>
  );
}
