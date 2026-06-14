import { motion, type Variants } from "framer-motion";

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

const C_RAW = "#2b6ef2"; // EvoPro base (raw)
const C_MC = "#e8833a"; // mutación + cruza

type Row = {
  test: string;
  h0: string;
  h1: string;
  p: string;
  sig: string;
};

const ROWS: Row[] = [
  {
    test: "Mann-Whitney U (bilateral)",
    h0: "EvoPro modificado obtiene valores de aptitud iguales que la versión base.",
    h1: "EvoPro modificado obtiene valores de aptitud distintos a la versión base.",
    p: "0.000309",
    sig: "***",
  },
  {
    test: "Mann-Whitney U (unilateral)",
    h0: "EvoPro modificado obtiene valores de aptitud iguales o peores que la versión base.",
    h1: "EvoPro modificado obtiene valores de aptitud mejores que la versión base.",
    p: "0.000154",
    sig: "***",
  },
];

export function Experimentos() {
  return (
    <motion.div
      className="exp"
      variants={wrap}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.15 }}
    >
      <motion.div variants={fade} className="exp-head">
        <h2 className="exp-title">Experimentos iniciales</h2>
        <p className="exp-sub">
          Menor puntaje agregado = mejor solución. La variante con{" "}
          <strong style={{ color: C_MC }}>mutación + cruza</strong> converge a
          valores más bajos que la versión{" "}
          <strong style={{ color: C_RAW }}>base</strong>.
        </p>
      </motion.div>

      <motion.figure variants={fade} className="exp-card exp-figure">
        <img
          className="exp-img"
          src="/graf_exp_01.png"
          alt="Boxplot del mejor puntaje por grupo y curva del mínimo acumulado promedio por generación"
        />
      </motion.figure>

      {/* Tabla de pruebas de hipótesis */}
      <motion.div variants={fade} className="exp-table-wrap">
        <table className="exp-table">
          <thead>
            <tr>
              <th>Prueba</th>
              <th>H₀</th>
              <th>H₁</th>
              <th>p-value</th>
              <th>Sig.</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.test}>
                <td className="exp-td-test">{r.test}</td>
                <td>{r.h0}</td>
                <td>{r.h1}</td>
                <td className="exp-td-num">{r.p}</td>
                <td className="exp-td-sig">{r.sig}</td>
                <td className="exp-td-res">Se rechaza H₀</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="exp-sigkey">*** p &lt; 0.001</p>
      </motion.div>

      <motion.p variants={fade} className="exp-foot">
        Goudy OJ, Nallathambi A, Kinjo T, Randolph NZ, Kuhlman B. (2023). In
        silico evolution of autoinhibitory domains for a PD-L1 antagonist using
        deep learning models. <em>PNAS</em>, 120(49), e2307371120.
      </motion.p>
    </motion.div>
  );
}
