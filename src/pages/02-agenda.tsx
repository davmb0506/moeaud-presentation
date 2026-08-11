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
          Recapitulación
          <ol type="a">
            <li>Objetivo general</li>
            <li>EvoPro como punto de partida</li>
            <li>Variantes monoobjetivo en HA-PD1</li>
            <li>Actividades pendientes</li>
            <li>Transición a multiobjetivo</li>
          </ol>
        </li>
        <li>
          Resultados
          <ol type="a">
            <li>Formulaciones multiobjetivo</li>
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
