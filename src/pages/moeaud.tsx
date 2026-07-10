import { type ReactNode } from "react";
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

const POINTS = [
  {
    no: "01",
    title: "Vectores adaptativos",
    text: "A diferencia de NSGA-III y MOEA/D, no conserva direcciones rígidas toda la corrida: las redistribuye hacia las zonas útiles del frente.",
  },
  {
    no: "02",
    title: "Archivo externo",
    text: "Las soluciones no dominadas se guardan fuera de la población actual, así que actúan como memoria estable del frente.",
  },
  {
    no: "03",
    title: "Señal UD",
    text: "Los indicadores de uniformidad y diversidad detectan si el frente quedó mal repartido o mal cubierto y guían la redistribución.",
  },
] as const;

const REFERENCES: ReactNode[] = [
  <>
    Marquez-Vega LA, Falcon-Cardona JG, Covantes Osuna E. A Multi-Objective
    Evolutionary Algorithm Based on Uniformity and Diversity to Handle Regular
    and Irregular Pareto Front Shapes. <em>IEEE Access</em>. 2024;12:158878-158907.
    doi:10.1109/ACCESS.2024.3486255.
  </>,
  <>
    Deb K, Pratap A, Agarwal S, Meyarivan T. A fast and elitist
    multiobjective genetic algorithm: NSGA-II. <em>IEEE Trans Evol Comput</em>.
    2002;6(2):182-197.
  </>,
  <>
    Deb K, Jain H. An evolutionary many-objective optimization algorithm using
    reference-point-based nondominated sorting approach, part I.{" "}
    <em>IEEE Trans Evol Comput</em>. 2014;18(4):577-601.
  </>,
  <>
    Zhang Q, Li H. MOEA/D: a multiobjective evolutionary algorithm based on
    decomposition. <em>IEEE Trans Evol Comput</em>. 2007;11(6):712-731.
  </>,
];

// ---------------------------------------------------------------------------
// Geometría del gráfico (espacio de objetivos, minimización).
// Ideal en la esquina inferior-izquierda; frente convexo decreciente con un
// hueco (frente irregular) para ilustrar el problema de los vectores fijos.
// ---------------------------------------------------------------------------
const VB_W = 340;
const VB_H = 296;
const PAD = { l: 30, r: 16, t: 16, b: 34 };
const PW = VB_W - PAD.l - PAD.r;
const PH = VB_H - PAD.t - PAD.b;
const sx = (u: number) => PAD.l + u * PW;
const sy = (v: number) => PAD.t + (1 - v) * PH;

const IDEAL = { x: 0.05, y: 0.05 };
const frontPt = (t: number) => ({
  x: 0.08 + 0.86 * t,
  y: 0.05 + 0.9 * Math.pow(1 - t, 1.75),
});
const GAP0 = 0.44;
const GAP1 = 0.6;

const angleAt = (t: number) => {
  const p = frontPt(t);
  return Math.atan2(p.y - IDEAL.y, p.x - IDEAL.x);
};
const tForAngleDeg = (deg: number) => {
  const target = (deg * Math.PI) / 180;
  let bt = 0;
  let bd = Infinity;
  for (let i = 0; i <= 600; i++) {
    const t = i / 600;
    const d = Math.abs(angleAt(t) - target);
    if (d < bd) {
      bd = d;
      bt = t;
    }
  }
  return bt;
};

// Vectores de referencia con ángulos uniformes (NSGA-III / MOEA/D).
const FIXED_RAYS = (() => {
  const K = 7;
  const dMax = 84;
  const dMin = 8;
  const out: { t: number; wasted: boolean }[] = [];
  for (let k = 0; k < K; k++) {
    const deg = dMax - ((dMax - dMin) * k) / (K - 1);
    const t = tForAngleDeg(deg);
    out.push({ t, wasted: t > GAP0 && t < GAP1 });
  }
  return out;
})();

// Vectores adaptativos: repartidos sobre el frente visible (MOEA-UD).
const ADAPT_TS = [0.05, 0.2, 0.37, 0.63, 0.74, 0.85, 0.95];
// Soluciones extra retenidas en el archivo externo (memoria).
const ARCHIVE_TS = [0.13, 0.29, 0.69, 0.9];

const sample = (a: number, b: number, n = 26) =>
  Array.from({ length: n + 1 }, (_, i) => frontPt(a + ((b - a) * i) / n));
const SEG1 = sample(0, GAP0);
const SEG2 = sample(GAP1, 1);
const toPts = (arr: { x: number; y: number }[]) =>
  arr.map((p) => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");

function Axes() {
  return (
    <>
      <line className="udx-axis" x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(0)} />
      <line className="udx-axis" x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(1)} />
      <text className="udx-axt" x={sx(1)} y={sy(0) + 22} textAnchor="end">
        f₁
      </text>
      <text className="udx-axt" x={sx(0) - 20} y={sy(1) + 4}>
        f₂
      </text>
      
      <circle className="udx-ideal" cx={sx(IDEAL.x)} cy={sy(IDEAL.y)} r={3.4} />
    </>
  );
}

function Front() {
  return (
    <>
      <polyline className="udx-front" points={toPts(SEG1)} />
      <polyline className="udx-front" points={toPts(SEG2)} />
    </>
  );
}

function FixedPanel() {
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="udx-svg" role="img"
      aria-label="Vectores de referencia fijos de NSGA-III y MOEA/D sobre un frente irregular">
      <Axes />
      <Front />
      {FIXED_RAYS.map(({ t, wasted }, i) => {
        const p = frontPt(t);
        const X = sx(p.x);
        const Y = sy(p.y);
        if (wasted) {
          return (
            <g key={i}>
              <line className="udx-ray-wasted" x1={sx(IDEAL.x)} y1={sy(IDEAL.y)} x2={X} y2={Y} />
              <line className="udx-mark-wasted" x1={X - 4} y1={Y - 4} x2={X + 4} y2={Y + 4} />
              <line className="udx-mark-wasted" x1={X - 4} y1={Y + 4} x2={X + 4} y2={Y - 4} />
            </g>
          );
        }
        return (
          <g key={i}>
            <line className="udx-ray-fixed" x1={sx(IDEAL.x)} y1={sy(IDEAL.y)} x2={X} y2={Y} />
            <circle className="udx-dot-fixed" cx={X} cy={Y} r={4.4} />
          </g>
        );
      })}
    </svg>
  );
}

function AdaptivePanel() {
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="udx-svg" role="img"
      aria-label="Vectores adaptativos de MOEA-UD redistribuidos sobre el frente, con archivo externo">
      <Axes />
      <Front />
      {ARCHIVE_TS.map((t, i) => {
        const p = frontPt(t);
        return <circle key={`a${i}`} className="udx-archive" cx={sx(p.x)} cy={sy(p.y)} r={3.2} />;
      })}
      {ADAPT_TS.map((t, i) => {
        const p = frontPt(t);
        const X = sx(p.x);
        const Y = sy(p.y);
        return (
          <g key={i}>
            <line className="udx-ray-adapt" x1={sx(IDEAL.x)} y1={sy(IDEAL.y)} x2={X} y2={Y} />
            <circle className="udx-dot-adapt" cx={X} cy={Y} r={4.6} />
          </g>
        );
      })}
    </svg>
  );
}

export function Moeaud() {
  return (
    <motion.div
      className="ud"
      variants={wrap}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.12 }}
    >
      <motion.div variants={fade} className="ud-head">
        <h2 className="ud-title">MOEA-UD</h2>
        <p>
          <strong>NSGA-III y MOEA/D</strong> usan vectores de referencia{" "}
          <strong>fijos</strong> durante toda la ejecución: sobre un frente
          irregular varios apuntan a zonas vacías y la cobertura queda desigual.{" "}
          <strong>MOEA-UD</strong> redistribuye sus vectores según el frente
          observado y conserva las buenas soluciones en un archivo externo.
        </p>
      </motion.div>

      <motion.div variants={fade} className="udx-compare">
        <div className="udx-panels">
          <div className="udx-panel fixed">
            <div className="udx-panel-head">
              <h4>Vectores de referencia fijos</h4>
              <small>Cobertura desigual · referencias desperdiciadas en el hueco</small>
            </div>
            <FixedPanel />
            <p className="udx-cap">
              Frente irregular: <strong>2 de 7</strong> vectores caen en el hueco
              y el resto se agolpa, resultando en una cobertura desigual y referencias desperdiciadas.
            </p>
          </div>

          <div className="udx-panel adaptive">
            <div className="udx-panel-head">
              <h4>Vectores adaptativos + archivo</h4>
              <small>Redistribuidos hacia el frente observado (señal UD)</small>
            </div>
            <AdaptivePanel />
            <p className="udx-cap">
              La señal UD <strong>reubica los vectores</strong> sobre el frente, resultando en una cobertura uniforme; el archivo retiene las buenas soluciones.
            </p>
          </div>
        </div>

        <div className="udx-legend" aria-label="Leyenda">
          <span className="udx-legend-item">
            <i className="udx-sw fixed" /> vector fijo (NSGA-III · MOEA/D)
          </span>
          <span className="udx-legend-item">
            <i className="udx-sw wasted" /> referencia sin solución (hueco)
          </span>
          <span className="udx-legend-item">
            <i className="udx-sw adapt" /> vector adaptativo (MOEA-UD)
          </span>
          <span className="udx-legend-item">
            <i className="udx-sw archive" /> archivo externo
          </span>
        </div>
      </motion.div>

      <motion.div variants={fade} className="udx-concepts">
        {POINTS.map((item) => (
          <article key={item.no} className="ud-point-card">
            <span className="ud-point-no">{item.no}</span>
            <div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          </article>
        ))}
      </motion.div>

      <motion.ol variants={fade} className="ud-cites">
        {REFERENCES.map((reference, index) => (
          <li key={index}>{reference}</li>
        ))}
      </motion.ol>
    </motion.div>
  );
}
