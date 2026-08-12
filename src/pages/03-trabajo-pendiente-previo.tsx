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

export function TrabajoPendientePrevio() {
  return (
    <motion.div
      className="cronograma"
      variants={wrap}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.2 }}
    >
      <motion.h2 variants={fade} className="cronograma-title">
        Actividades pendientes del periodo anterior
      </motion.h2>

      <motion.div variants={fade} className="cronograma-body">
        <aside className="cronograma-pending">
          <h3>Pendientes</h3>
          <ol>
            <li>Experimentos finales</li>
            <li>Validación de resultados</li>
            <li>Redacción de tesis</li>
          </ol>
        </aside>

        <img
          className="cronograma-img"
          src="/cronograma.png"
          alt="Cronograma de actividades 2026"
        />
      </motion.div>
    </motion.div>
  );
}
