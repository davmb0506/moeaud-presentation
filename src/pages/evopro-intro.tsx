import { motion, type Variants } from "framer-motion";
import { Evopro } from "./evopro";

const wrap: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const fade: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const introCopy = (
  <div className="eintro-copy">
    <h2 className="eintro-title">EvoPro</h2>
    <p className="eintro-text">
      EvoPro es una metodología de diseño computacional de proteínas basada en{" "}
      <em>deep learning</em> y en un{" "}
      <strong>algoritmo genético de optimización</strong>. Utiliza{" "}
      <strong>AlphaFold</strong> para el paso de evaluación de individuos y guía
      la evolución con <strong>ProteinMPNN</strong>.
    </p>

    <p className="eintro-text eintro-subhead">La versión base de EvoPro:</p>
    <ul className="eintro-list">
      <li>
        Utiliza <strong>mutación</strong> como operador principal.
      </li>
      <li>No usaba cruza.</li>
      <li>
        Supervivencia por <strong>selección elitista</strong>.
      </li>
    </ul>
  </div>
);

export function EvoproIntro() {
  return (
    <motion.div
      className="eintro"
      variants={wrap}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.25 }}
    >
      <Evopro intro={introCopy} />

      <motion.p variants={fade} className="eintro-cite">
        Goudy, O. J., Nallathambi, A., Kinjo, T., Randolph, N. Z., &amp; Kuhlman,
        B. (2023). In silico evolution of autoinhibitory domains for a PD-L1
        antagonist using deep learning models. <em>Proceedings of the National
        Academy of Sciences of the United States of America</em>, 120(49),
        e2307371120.
      </motion.p>
    </motion.div>
  );
}
