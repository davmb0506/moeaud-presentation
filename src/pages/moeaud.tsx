import { type ReactNode } from "react";
import { motion, type Variants } from "framer-motion";

export const UD_MAX_STEP = 2;

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
// ---------------------------------------------------------------------------
const VB_W = 340;
const VB_H = 296;
const PAD = { l: 30, r: 16, t: 16, b: 34 };
const PW = VB_W - PAD.l - PAD.r;
const PH = VB_H - PAD.t - PAD.b;
const sx = (u: number) => PAD.l + u * PW;
const sy = (v: number) => PAD.t + (1 - v) * PH;

const IDEAL = { x: 0.05, y: 0.05 };
const IX = sx(IDEAL.x);
const IY = sy(IDEAL.y);

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

const ADAPT_TS = [0.05, 0.2, 0.37, 0.63, 0.74, 0.85, 0.95];
const ARCHIVE_TS = [0.13, 0.29, 0.69, 0.9];

const sample = (a: number, b: number, n = 26) =>
  Array.from({ length: n + 1 }, (_, i) => frontPt(a + ((b - a) * i) / n));
const SEG1 = sample(0, GAP0);
const SEG2 = sample(GAP1, 1);
const toPath = (arr: { x: number; y: number }[]) =>
  arr
    .map((p, i) => {
      const x = sx(p.x).toFixed(1);
      const y = sy(p.y).toFixed(1);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

const EASE = [0.22, 1, 0.36, 1] as const;

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
      <circle className="udx-ideal" cx={IX} cy={IY} r={3.4} />
    </>
  );
}

function Front({ showGap, gapGradId }: { showGap: boolean; gapGradId: string }) {
  const mid = frontPt((GAP0 + GAP1) / 2);
  const gapLabel = {
    x: sx(mid.x),
    y: sy(mid.y) - 8,
  };

  return (
    <>
      <motion.path
        className="udx-front"
        d={toPath(SEG1)}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: EASE }}
      />
      <motion.path
        className="udx-front"
        d={toPath(SEG2)}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
      />
      {showGap && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.35 }}
        >
          <defs>
            <radialGradient id={gapGradId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F28E2B" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#F28E2B" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse
            cx={gapLabel.x}
            cy={gapLabel.y + 10}
            rx={28}
            ry={22}
            fill={`url(#${gapGradId})`}
          />
          <text
            className="udx-gap-lbl"
            x={gapLabel.x}
            y={gapLabel.y}
            textAnchor="middle"
          >
            hueco
          </text>
        </motion.g>
      )}
    </>
  );
}

function FixedPanel({ active }: { active: boolean }) {
  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="udx-svg"
      role="img"
      aria-label="Vectores de referencia fijos de NSGA-III y MOEA/D sobre un frente irregular"
    >
      <Axes />
      <Front showGap gapGradId="udx-gap-grad" />
      {FIXED_RAYS.map(({ t, wasted }, i) => {
        const p = frontPt(t);
        const X = sx(p.x);
        const Y = sy(p.y);
        const delay = 0.2 + i * 0.09;

        if (wasted) {
          return (
            <g key={i}>
              <motion.line
                className="udx-ray-wasted"
                x1={IX}
                y1={IY}
                x2={X}
                y2={Y}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={
                  active
                    ? { pathLength: 1, opacity: 0.95 }
                    : { pathLength: 0, opacity: 0 }
                }
                transition={{ duration: 0.45, delay, ease: EASE }}
              />
              <motion.g
                initial={{ opacity: 0, scale: 0.4 }}
                animate={
                  active
                    ? { opacity: 1, scale: 1 }
                    : { opacity: 0, scale: 0.4 }
                }
                transition={{ duration: 0.3, delay: delay + 0.35, ease: EASE }}
                style={{ transformOrigin: `${X}px ${Y}px` }}
              >
                <line
                  className="udx-mark-wasted"
                  x1={X - 5}
                  y1={Y - 5}
                  x2={X + 5}
                  y2={Y + 5}
                />
                <line
                  className="udx-mark-wasted"
                  x1={X - 5}
                  y1={Y + 5}
                  x2={X + 5}
                  y2={Y - 5}
                />
              </motion.g>
            </g>
          );
        }

        return (
          <g key={i}>
            <motion.line
              className="udx-ray-fixed"
              x1={IX}
              y1={IY}
              x2={X}
              y2={Y}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={
                active
                  ? { pathLength: 1, opacity: 1 }
                  : { pathLength: 0, opacity: 0 }
              }
              transition={{ duration: 0.45, delay, ease: EASE }}
            />
            <motion.circle
              className="udx-dot-fixed"
              cx={X}
              cy={Y}
              r={4.4}
              initial={{ scale: 0, opacity: 0 }}
              animate={
                active
                  ? { scale: 1, opacity: 1 }
                  : { scale: 0, opacity: 0 }
              }
              transition={{ duration: 0.28, delay: delay + 0.2, ease: EASE }}
            />
          </g>
        );
      })}
    </svg>
  );
}

function AdaptivePanel({ active }: { active: boolean }) {
  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="udx-svg"
      role="img"
      aria-label="Vectores adaptativos de MOEA-UD redistribuidos sobre el frente, con archivo externo"
    >
      <Axes />
      <Front showGap={false} gapGradId="udx-gap-grad-adapt" />
      {ADAPT_TS.map((t, i) => {
        const from = frontPt(FIXED_RAYS[i].t);
        const to = frontPt(t);
        const xFrom = sx(from.x);
        const yFrom = sy(from.y);
        const xTo = sx(to.x);
        const yTo = sy(to.y);
        const delay = 0.15 + i * 0.07;

        return (
          <g key={i}>
            <motion.line
              className="udx-ray-adapt"
              x1={IX}
              y1={IY}
              x2={xFrom}
              y2={yFrom}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={
                active
                  ? { pathLength: 1, opacity: 0.9, x2: xTo, y2: yTo }
                  : { pathLength: 0, opacity: 0, x2: xFrom, y2: yFrom }
              }
              transition={{
                pathLength: { duration: 0.4, delay, ease: EASE },
                opacity: { duration: 0.25, delay },
                x2: { duration: 0.85, delay: delay + 0.35, ease: EASE },
                y2: { duration: 0.85, delay: delay + 0.35, ease: EASE },
              }}
            />
            <motion.circle
              className="udx-dot-adapt"
              cx={xFrom}
              cy={yFrom}
              r={4.6}
              initial={{ scale: 0, opacity: 0 }}
              animate={
                active
                  ? { cx: xTo, cy: yTo, scale: 1, opacity: 1 }
                  : { cx: xFrom, cy: yFrom, scale: 0, opacity: 0 }
              }
              transition={{
                scale: { duration: 0.25, delay: delay + 0.25, ease: EASE },
                opacity: { duration: 0.25, delay: delay + 0.25 },
                cx: { duration: 0.85, delay: delay + 0.35, ease: EASE },
                cy: { duration: 0.85, delay: delay + 0.35, ease: EASE },
              }}
            />
          </g>
        );
      })}
      {ARCHIVE_TS.map((t, i) => {
        const p = frontPt(t);
        return (
          <motion.circle
            key={`a${i}`}
            className="udx-archive"
            cx={sx(p.x)}
            cy={sy(p.y)}
            r={3.2}
            initial={{ scale: 0, opacity: 0 }}
            animate={
              active
                ? { scale: 1, opacity: 0.55 }
                : { scale: 0, opacity: 0 }
            }
            transition={{
              duration: 0.35,
              delay: 1.15 + i * 0.08,
              ease: EASE,
            }}
          />
        );
      })}
    </svg>
  );
}

export function Moeaud({ step = 0 }: { step?: number }) {
  const s = Math.max(0, Math.min(UD_MAX_STEP, step));
  const showFixed = s >= 1;
  const showAdapt = s >= 2;

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
          <strong>fijos</strong>: sobre un frente irregular varios apuntan a
          zonas vacías. <strong>MOEA-UD</strong> los redistribuye según el
          frente observado y conserva soluciones en un archivo externo.
        </p>
      </motion.div>

      <motion.div variants={fade} className="udx-compare">
        <div className="udx-panels">
          <div className="udx-panel fixed">
            <div className="udx-panel-head">
              <h4>NSGA-III · MOEA/D</h4>
            </div>
            <FixedPanel active={showFixed} />
          </div>

          <div className="udx-panel adaptive">
            <div className="udx-panel-head">
              <h4>MOEA-UD</h4>
            </div>
            <AdaptivePanel active={showAdapt} />
          </div>
        </div>

        <div className="udx-legend" aria-label="Leyenda">
          <span className="udx-legend-item">
            <i className="udx-sw fixed" /> vector fijo
          </span>
          <span className="udx-legend-item">
            <i className="udx-sw wasted" /> referencia en el hueco
          </span>
          <span className="udx-legend-item">
            <i className="udx-sw adapt" /> vector adaptativo
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
