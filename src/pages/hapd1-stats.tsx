import { motion, type Variants } from "framer-motion";
import stats from "../data/hapd1Stats.json";

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

type TextPart = { text: string; color: string | null };

type TestRow = {
  contrast: string;
  test: string;
  h0: string;
  h1: string;
  p_fmt: string;
  sig: string;
  reject: boolean;
};

const TESTS = stats.tests as TestRow[];
const FIGURE = `${(stats.meta as { figure: string }).figure}?v=overall`;
const HEADLINE = (stats.headline as { text_parts: TextPart[] }).text_parts;
const SIG_KEY = stats.sig_key as string;

export function Hapd1Stats() {
  return (
    <motion.div
      className="exp"
      variants={wrap}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.15 }}
    >
      <motion.div variants={fade} className="exp-head">
        <h2 className="exp-title">HA-PD1 · análisis estadístico</h2>
        <p className="exp-sub">
          {HEADLINE.map((part, i) =>
            part.color ? (
              <strong key={i} style={{ color: part.color }}>
                {part.text}
              </strong>
            ) : (
              <span key={i}>{part.text}</span>
            )
          )}
        </p>
      </motion.div>

      <motion.figure variants={fade} className="exp-card exp-figure">
        <img
          className="exp-img"
          src={FIGURE}
          alt="Boxplot del fitness reponderado por variante en HA-PD1"
        />
      </motion.figure>

      <motion.div variants={fade} className="exp-table-wrap">
        <table className="exp-table">
          <thead>
            <tr>
              <th>Contraste</th>
              <th>Prueba</th>
              <th>H₀</th>
              <th>H₁</th>
              <th>p-value</th>
              <th>Sig.</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            {TESTS.map((r) => (
              <tr key={`${r.contrast}-${r.test}`}>
                <td className="exp-td-test">{r.contrast}</td>
                <td className="exp-td-test">{r.test}</td>
                <td>{r.h0}</td>
                <td>{r.h1}</td>
                <td className="exp-td-num">{r.p_fmt}</td>
                <td className="exp-td-sig">{r.sig}</td>
                <td className="exp-td-res">
                  {r.reject ? "Se rechaza H₀" : "No se rechaza H₀"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="exp-sigkey">{SIG_KEY}</p>
      </motion.div>
    </motion.div>
  );
}
