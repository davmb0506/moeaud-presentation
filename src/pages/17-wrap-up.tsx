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
          mejoran el rendimiento y aumentan el tamaño del conjunto final de
          secuencias en el par de objetivos Interface-PAE / pLDDT.
        </li>
        <li>
          Los diseños muestran oclusión estérica significativa del sitio
          VEGFR-2, posicionándolos como candidatos computacionales
          pendientes de validación experimental.
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
