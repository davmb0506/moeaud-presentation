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
            <li>Objetivo y punto de partida (EvoPro)</li>
            <li>Resultados monoobjetivo (HA-PD1)</li>
          </ol>
        </li>
        <li>
          Resultados multiobjetivo
          <ol type="a">
            <li>Diseño experimental y formulaciones</li>
            <li>Ablación de mecanismos adaptativos</li>
            <li>Cribado y selección final</li>
          </ol>
        </li>
        <li>Síntesis y cierre</li>
      </motion.ol>
    </motion.div>
  );
}
