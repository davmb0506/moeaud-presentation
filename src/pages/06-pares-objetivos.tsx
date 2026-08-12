import { motion, type Variants } from "framer-motion";

const wrap: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const fade: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

type PairRow = {
  pair: string;
  f1: { name: string; meaning: string };
  f2: { name: string; meaning: string };
};

const PAIRS: PairRow[] = [
  {
    pair: "Interface-PAE / pLDDT",
    f1: {
      name: "Interface-PAE",
      meaning: "Error esperado de AlphaFold en la pose relativa péptido–VEGF-A.",
    },
    f2: {
      name: "pLDDT",
      meaning: "Confianza local del pliegue del péptido.",
    },
  },
  {
    pair: "Compuesto / TM-score",
    f1: {
      name: "Compuesto",
      meaning: "Score agregado de calidad de interfaz (ipSAE, SC, ΔSASA).",
    },
    f2: {
      name: "TM-score",
      meaning:
        "Similitud estructural del péptido monómero vs. unido al blanco.",
    },
  },
  {
    pair: "ipSAE / SC",
    f1: {
      name: "ipSAE",
      meaning:
        "Error de alineamiento predicho en la interfaz (derivado del PAE de AlphaFold).",
    },
    f2: {
      name: "SC",
      meaning: "Complementariedad de forma entre superficies en contacto.",
    },
  },
];

export function ParesObjetivos() {
  return (
    <motion.div
      className="paresobj"
      variants={wrap}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.15 }}
    >
      <motion.header variants={fade} className="paresobj-head">
        <h2 className="paresobj-title">Formulación multiobjetivo</h2>
        <ul className="paresobj-bullets">
          <li>
            El proyecto mantiene el esquema de EvoPro en cuanto al uso de modelos
            de deep learning para la evaluación y generación de secuencias.
          </li>
          <li>Lo que cambia es lo que se optimiza.</li>
        </ul>
      </motion.header>

      <motion.div variants={fade} className="paresobj-table-wrap">
        <table className="paresobj-table">
          <thead>
            <tr>
              <th>Par</th>
              <th>Objetivo 1</th>
              <th>Objetivo 2</th>
            </tr>
          </thead>
          <tbody>
            {PAIRS.map((row) => (
              <tr key={row.pair}>
                <th scope="row">{row.pair}</th>
                <td>
                  <span className="paresobj-metric">{row.f1.name}</span>
                  <span className="paresobj-mean">{row.f1.meaning}</span>
                </td>
                <td>
                  <span className="paresobj-metric">{row.f2.name}</span>
                  <span className="paresobj-mean">{row.f2.meaning}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </motion.div>
  );
}
