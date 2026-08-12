import { motion, type Variants } from "framer-motion";

const wrap: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const fade: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

export function EvoproIntro() {
  return (
    <motion.div
      className="eintro"
      variants={wrap}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.25 }}
    >
      <div className="eintro-layout">
        <motion.div variants={fade} className="eintro-copy">
          <h2 className="eintro-title">EvoPro</h2>
          <p className="eintro-text">
            EvoPro es una metodología de diseño computacional de proteínas
            basada en <em>deep learning</em> y en un{" "}
            <strong>algoritmo genético de optimización</strong>. Utiliza{" "}
            <strong>AlphaFold</strong> para el paso de evaluación de individuos
            y guía la evolución con <strong>ProteinMPNN</strong>.
          </p>
        </motion.div>

        <motion.div variants={fade} className="eintro-flow">
          <img
            className="eintro-fig"
            src="/evopro-flowchart.png"
            alt="Esquema de EvoPro: ciclo de predicción estructural, scoring, generación de secuencias y pool; detalle Rank → Prune → Refill (Goudy et al., 2023)"
          />
        </motion.div>
      </div>

      <motion.p variants={fade} className="eintro-cite">
        Goudy, O. J., Nallathambi, A., Kinjo, T., Randolph, N. Z., &amp; Kuhlman,
        B. (2023). In silico evolution of autoinhibitory domains for a PD-L1
        antagonist using deep learning models.{" "}
        <em>
          Proceedings of the National Academy of Sciences of the United States
          of America
        </em>
        , 120(49), e2307371120.{" "}
        <a
          href="https://www.pnas.org/doi/10.1073/pnas.2307371120"
          target="_blank"
          rel="noreferrer"
        >
          https://doi.org/10.1073/pnas.2307371120
        </a>
      </motion.p>
    </motion.div>
  );
}
