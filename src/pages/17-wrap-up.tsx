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
          En la formulación monoobjetivo (dominio autoinhibitorio de HA-PD1),
          tanto el operador de cruza como ProteinMPNN con temperatura variable
          mejoraron el valor de la función de aptitud frente a la base.
        </li>
        <li>
          En la formulación multiobjetivo sobre VEGF-A, los mecanismos
          adaptativos mejoraron el hipervolumen y el tamaño del archivo solo
          en Interface-PAE / pLDDT.
        </li>
        <li>
          A partir del conjunto no dominado (1208 secuencias), el cribado
          deja <strong>10</strong> candidatos finales. En docking local se
          reporta el score de cada uno junto a la referencia del complejo
          nativo VEGF–VEGFR-2 (−80.1); el mejor del panel llega a −131.4.
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
