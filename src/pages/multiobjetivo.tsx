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

const C1 = "#2b6ef2"; // placement
const C2 = "#6a5cff"; // fold
const C3 = "#00b894"; // stability

type Obj = { sym: string; name: string; weight: string; color: string };

const OBJS: Obj[] = [
  { sym: "P", name: "Confianza de acoplamiento", weight: "1", color: C1 },
  { sym: "F", name: "Confianza de plegamiento", weight: "1/10", color: C2 },
  { sym: "S", name: "Estabilidad conformacional", weight: "5", color: C3 },
];

// Mini frente de Pareto: puntos dominados (gris) + frente no dominado (acento).
const DOMINATED = [
  { x: 58, y: 70 },
  { x: 74, y: 60 },
  { x: 86, y: 92 },
  { x: 64, y: 96 },
  { x: 100, y: 78 },
  { x: 92, y: 56 },
];
const FRONT = [
  { x: 30, y: 96 },
  { x: 42, y: 70 },
  { x: 58, y: 50 },
  { x: 80, y: 38 },
  { x: 108, y: 30 },
];

export function Multiobjetivo() {
  return (
    <motion.div
      className="mo"
      variants={wrap}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.15 }}
    >
      <motion.div variants={fade} className="mo-head">
        <h2 className="mo-title">Transición a optimización multiobjetivo</h2>
        <p className="mo-sub">
          EvoPro combina objetivos físicos independientes en un{" "}
          <strong>único escalar</strong>. Como esos objetivos{" "}
          <strong>compiten entre sí</strong>, conviene optimizarlos de forma{" "}
          <strong>simultánea</strong>.
        </p>
      </motion.div>

      <div className="mo-flow">
        {/* Antes: escalarización */}
        <motion.div variants={fade} className="mo-card">
          <span className="mo-card-tag">Enfoque actual · escalarización</span>
          <div className="mo-formula">
            <span className="mo-fx">F(x)</span>
            <span className="mo-eq">=</span>
            <span>
              <span className="mo-w">−1</span>·<span style={{ color: C1 }}>P</span>
            </span>
            <span className="mo-op">−</span>
            <span>
              <span className="mo-w">1/10</span>·<span style={{ color: C2 }}>F</span>
            </span>
            <span className="mo-op">+</span>
            <span>
              <span className="mo-w">5</span>·<span style={{ color: C3 }}>S</span>
            </span>
          </div>
          <ul className="mo-objs">
            {OBJS.map((o) => (
              <li key={o.sym}>
                <span className="mo-chip" style={{ background: o.color }}>
                  {o.sym}
                </span>
                <span className="mo-obj-name">{o.name}</span>
                <span className="mo-obj-w">peso {o.weight}</span>
              </li>
            ))}
          </ul>
          <p className="mo-card-note">
            Suma ponderada con <strong>pesos fijos</strong> → colapsa el problema
            a <strong>una sola solución</strong>.
          </p>
        </motion.div>

        <div className="mo-arrow" aria-hidden>
          <span>→</span>
        </div>

        {/* Después: multiobjetivo */}
        <motion.div variants={fade} className="mo-card mo-card-after">
          <span className="mo-card-tag">Propuesta · multiobjetivo</span>
          <div className="mo-formula">
            <span className="mo-fx">f(x)</span>
            <span className="mo-eq">=</span>
            <span className="mo-vec">
              (<span style={{ color: C1 }}>P</span>,{" "}
              <span style={{ color: C2 }}>F</span>,{" "}
              <span style={{ color: C3 }}>S</span>)
            </span>
          </div>
          <svg className="mo-pareto" viewBox="0 0 150 120" role="img" aria-label="frente de Pareto">
            <line x1="20" y1="8" x2="20" y2="108" className="mo-axis" />
            <line x1="20" y1="108" x2="142" y2="108" className="mo-axis" />
            <text x="8" y="14" className="mo-axislabel">f₂</text>
            <text x="138" y="118" className="mo-axislabel">f₁</text>
            {DOMINATED.map((p, i) => (
              <circle key={`d${i}`} cx={p.x} cy={p.y} r={3} className="mo-dot-dom" />
            ))}
            <polyline
              points={FRONT.map((p) => `${p.x},${p.y}`).join(" ")}
              className="mo-front-line"
            />
            {FRONT.map((p, i) => (
              <circle key={`f${i}`} cx={p.x} cy={p.y} r={3.6} className="mo-dot-front" />
            ))}
          </svg>
          <p className="mo-card-note">
            Optimización simultánea → <strong>frente de Pareto</strong>: conjunto
            de soluciones <strong>no dominadas</strong> (compromisos).
          </p>
        </motion.div>
      </div>

      <motion.ul variants={fade} className="mo-points">
        <li>
          <strong>Objetivos en conflicto.</strong> Surgen de mecanismos físicos
          distintos; mejorar uno suele degradar otro, sin un óptimo único.
        </li>
        <li>
          <strong>Pesos arbitrarios.</strong> La escalarización fija pesos sobre
          escalas heterogéneas y sesga la búsqueda hacia una sola región.
        </li>
        <li>
          <strong>Compromisos ocultos.</strong> Un escalar no recupera el
          conjunto de soluciones de compromiso que sí entrega el frente de
          Pareto.
        </li>
      </motion.ul>

      <motion.p variants={fade} className="mo-cite">
        Nanda V, Belure SV, Shir OM. Searching for the Pareto frontier in
        multi-objective protein design. <em>Biophysical Reviews</em>.
        2017;9(4):339–344.
      </motion.p>
    </motion.div>
  );
}
