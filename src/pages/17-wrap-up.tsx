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
          En la formulación monoobjetivo sobre HA-PD1, el uso de cruza y de
          temperatura variable mejoró la aptitud respecto a la formulación
          base.
        </li>
        <li>
          En la formulación multiobjetivo sobre VEGF-A, los mecanismos
          adaptativos mejoraron el rendimiento y ampliaron el conjunto final
          de secuencias, en particular en el par Interface-PAE / pLDDT.
        </li>
        <li>
          Tras la validación in silico —relajación, control composicional y
          repredicción independiente—, el marco produce secuencias
          estructuralmente plausibles y diversas, listas como candidatos para
          una caracterización experimental futura.
        </li>
      </motion.ol>
    </motion.div>
  );
}

export function TrabajoPendiente() {
  return (
    <motion.div
      className="sintesis sintesis--split"
      variants={wrap}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.2 }}
    >
      <motion.h2 variants={fade} className="sintesis-title">
        Trabajo pendiente
      </motion.h2>

      <div className="sintesis-columns">
        <motion.ol variants={fade} className="sintesis-list">
          <li>Continuar redactando el documento de tesis. Se escribieron los capitulos 1, 2 y 3, actualmente escribiendo el cuarto y aplicando las correcciones sugeridas.</li>
          
        </motion.ol>

        <motion.div variants={fade} className="sintesis-cronograma">
          <img
            src="/img/cronograma.png"
            alt="Cronograma actualizado"
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
