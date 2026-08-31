import { motion, type Variants } from "framer-motion";

const fade: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

export function HipotesisDiseno() {
  return (
    <motion.div
      className="hipdis"
      variants={fade}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.25 }}
    >
      <div className="showcase-grid hipdis-grid">
        <div className="hipdis-fig-wrap">
          <img
            className="hipdis-fig"
            src="/img/folding-funnel.png"
            alt="Embudo de plegado: estados desplegado, intermediario y nativo en el paisaje de energía libre"
          />
          <p className="hipdis-fig-cite">
            Romero-Romero S, Fernández-Velasco DA, Costas M. Estabilidad
            termodinámica de proteínas. Educación Química. 2018;29(3):3–17.
          </p>
        </div>

        <div className="objective">
          <h2 className="objective-title">La hipótesis termodinámica</h2>
          <ul className="hipdis-list">
            <li>
              La estructura nativa de una proteína es su única conformación de
              mínima energía libre.
            </li>
            <li>
              Este estado nativo está determinado únicamente por la secuencia de
              aminoácidos.
            </li>
            <li>
              El diseño de proteínas es el problema inverso: proponer secuencias
              que realicen una estructura o función deseada.
            </li>
            <li>
              Enfoque de esta tesis: diseño <em>in silico</em> con backbone fijo,
              modelos de aprendizaje profundo y optimización evolutiva
              multiobjetivo.
            </li>
          </ul>
          <p className="hipdis-bridge">
            Plegado: secuencia → estructura. Diseño: estructura / función →
            secuencia.
          </p>
          <p className="hipdis-cite">
            Anfinsen CB. Principles that govern the folding of protein chains.
            Science. 1973;181(4096):223–230. · Huang P-S, Boyken SE, Baker D. The
            coming of age of de novo protein design. Nature. 2016;537:320–347.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
