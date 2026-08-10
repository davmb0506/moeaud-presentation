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

type Item = { text: string; sub?: readonly string[] };

/** Texto del slide “Actividades subsecuentes” del avance de abril. */
const PENDING: readonly Item[] = [
  { text: "Experimentos finales con objetivos seleccionados." },
  {
    text: "Validación de diseños in silico.",
    sub: [
      "Re-predecir candidatos prometedores.",
      "Comparación con herramientas de docking.",
    ],
  },
  { text: "Redacción de tesis." },
  { text: "Implementación de interfaz gráfica." },
];

export function TrabajoPendientePrevio() {
  return (
    <motion.div
      className="sintesis"
      variants={wrap}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.2 }}
    >
      <motion.h2 variants={fade} className="sintesis-title">
        Actividades subsecuentes (Abril 2026 – Agosto 2026)
      </motion.h2>

      <motion.p variants={fade} className="pendiente-sub">
        Trabajo pendiente planteado en el avance anterior:
      </motion.p>

      <motion.ol variants={fade} className="sintesis-list pendiente-list">
        {PENDING.map((item) => (
          <li key={item.text}>
            {item.text}
            {item.sub ? (
              <ol type="a" className="pendiente-sublist">
                {item.sub.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            ) : null}
          </li>
        ))}
      </motion.ol>
    </motion.div>
  );
}
