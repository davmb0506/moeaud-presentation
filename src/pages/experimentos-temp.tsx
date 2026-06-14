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

const C_EVO = "#2b6ef2"; // EvoPro base
const C_MPNN = "#e2433f"; // ProteinMPNN con temperatura variable

type Row = {
  test: string;
  h0: string;
  h1: string;
  u: string;
  p: string;
  sig: string;
};

const ROWS: Row[] = [
  {
    test: "Mann-Whitney U (bilateral)",
    h0: "EvoPro modificado obtiene valores de aptitud iguales que la versión base.",
    h1: "EvoPro modificado obtiene valores de aptitud distintos a la versión base.",
    u: "731.0",
    p: "0.000007",
    sig: "***",
  },
  {
    test: "Mann-Whitney U (unilateral)",
    h0: "EvoPro modificado obtiene valores de aptitud iguales o peores que la versión base.",
    h1: "EvoPro modificado obtiene valores de aptitud mejores que la versión base.",
    u: "139.0",
    p: "0.000004",
    sig: "***",
  },
];

export function ExperimentosTemp() {
  return (
    <motion.div
      className="exp"
      variants={wrap}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.15 }}
    >
      <motion.div variants={fade} className="exp-head">
        <h2 className="exp-title">
          Experimento con temperatura variable
        </h2>
        <p className="exp-sub">
          Con{" "}
          <strong style={{ color: C_MPNN }}>ProteinMPNN de temperatura variable</strong>{" "}
          la población converge a valores más bajos (−194.9) que la versión{" "}
          <strong style={{ color: C_EVO }}>EvoPro base</strong> (−187.2).
        </p>
      </motion.div>

      <motion.figure variants={fade} className="exp-card exp-figure">
        <img
          className="exp-img exp-img-sm"
          src="/graf_exp_02_promedio.png"
          alt="Curva de convergencia promedio: EvoPro base frente a ProteinMPNN con temperatura variable"
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
    </motion.div>
  );
}
