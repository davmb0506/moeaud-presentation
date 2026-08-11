import { motion, type Variants } from "framer-motion";

/** 0 intro · 1–2 mantienen compatibilidad con teclas del deck */
export const MO_MAX_STEP = 2;

const wrap: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const fade: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

const EASE = [0.22, 1, 0.36, 1] as const;

type Pt = { x: number; y: number };
type UV = { u: number; v: number };

const VB_W = 520;
const VB_H = 360;
const PAD = { l: 56, r: 28, t: 22, b: 48 };
const PW = VB_W - PAD.l - PAD.r;
const PH = VB_H - PAD.t - PAD.b;
const sx = (u: number) => PAD.l + u * PW;
const sy = (v: number) => PAD.t + (1 - v) * PH;
const map = (p: UV): Pt => ({ x: sx(p.u), y: sy(p.v) });

function toPath(pts: Pt[]) {
  return pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
}

function dominatesUV(a: UV, b: UV) {
  return a.u <= b.u && a.v <= b.v && (a.u < b.u || a.v < b.v);
}

/**
 * Frente no dominado del archivo Interface-PAE / (100−pLDDT).
 * Incluye extremos y rodilla; la nube se filtra contra este conjunto.
 */
const FRONT_UV: UV[] = [
  { u: 0.041, v: 0.952 },
  { u: 0.068, v: 0.817 },
  { u: 0.077, v: 0.776 },
  { u: 0.116, v: 0.723 },
  { u: 0.161, v: 0.695 },
  { u: 0.176, v: 0.617 },
  { u: 0.208, v: 0.613 },
  { u: 0.217, v: 0.605 },
  { u: 0.247, v: 0.563 },
  { u: 0.252, v: 0.517 },
  { u: 0.258, v: 0.481 },
  { u: 0.317, v: 0.409 },
  { u: 0.361, v: 0.348 },
  { u: 0.43, v: 0.3 },
  { u: 0.464, v: 0.259 },
  { u: 0.51, v: 0.188 },
  { u: 0.555, v: 0.142 },
  { u: 0.619, v: 0.111 },
  { u: 0.726, v: 0.087 },
  { u: 0.8, v: 0.048 },
];
const FRONT = FRONT_UV.map(map);

/** Escalera del frente (min–min): horizontal luego vertical entre no dominadas. */
function stairUV(front: UV[]): UV[] {
  if (front.length === 0) return [];
  const out: UV[] = [front[0]];
  for (let i = 0; i < front.length - 1; i++) {
    out.push({ u: front[i + 1].u, v: front[i].v });
    out.push(front[i + 1]);
  }
  return out;
}

const FRONT_STAIR = toPath(stairUV(FRONT_UV).map(map));

const CLOUD_UV_RAW: UV[] = [
  { u: 0.758, v: 0.15 },
  { u: 0.562, v: 0.333 },
  { u: 0.434, v: 0.522 },
  { u: 0.622, v: 0.291 },
  { u: 0.959, v: 0.122 },
  { u: 0.501, v: 0.442 },
  { u: 0.492, v: 0.471 },
  { u: 0.812, v: 0.128 },
  { u: 0.631, v: 0.188 },
  { u: 0.355, v: 0.639 },
  { u: 0.516, v: 0.427 },
  { u: 0.346, v: 0.641 },
  { u: 0.372, v: 0.552 },
  { u: 0.217, v: 0.825 },
  { u: 0.485, v: 0.474 },
  { u: 0.296, v: 0.726 },
  { u: 0.479, v: 0.483 },
  { u: 0.452, v: 0.486 },
  { u: 0.69, v: 0.187 },
  { u: 0.538, v: 0.392 },
];

/** Solo puntos estrictamente dominados por algún miembro del frente dibujado. */
const CLOUD = CLOUD_UV_RAW.filter((p) =>
  FRONT_UV.some((f) => dominatesUV(f, p))
).map(map);

function Axes() {
  const xMid = sx(0.5);
  const yMid = PAD.t + PH / 2;
  return (
    <>
      <line className="mo-axis" x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(0)} />
      <line className="mo-axis" x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(1)} />

      <text className="mo-axt" x={xMid} y={VB_H - 10} textAnchor="middle">
        Interface-PAE → peor
      </text>
      <text
        className="mo-axt"
        x={16}
        y={yMid}
        textAnchor="middle"
        transform={`rotate(-90 16 ${yMid})`}
      >
        100 − pLDDT → peor
      </text>
    </>
  );
}

function MultiChart() {
  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="mo-svg"
      role="img"
      aria-label="Frente de Pareto Interface-PAE frente a 100 menos pLDDT"
    >
      <Axes />

      {CLOUD.map((p, i) => (
        <motion.circle
          key={`c${i}`}
          className="mo-cloud"
          cx={p.x}
          cy={p.y}
          r={4}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.75 }}
          transition={{ duration: 0.22, delay: 0.02 * i, ease: EASE }}
        />
      ))}

      <motion.path
        className="mo-front"
        d={FRONT_STAIR}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.25, ease: EASE }}
      />
      {FRONT.map((p, i) => (
        <motion.circle
          key={`f${i}`}
          className="mo-dot multi"
          cx={p.x}
          cy={p.y}
          r={4.4}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: 0.22,
            delay: 0.35 + 0.02 * i,
            ease: EASE,
          }}
        />
      ))}
    </svg>
  );
}

export function Multiobjetivo({ step = 0 }: { step?: number }) {
  void step;

  return (
    <motion.div
      className="mo"
      variants={wrap}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.12 }}
    >
      <motion.div variants={fade} className="mo-head">
        <h2 className="mo-title">De monoobjetivo a multiobjetivo</h2>
        <p className="mo-sub">
          En diseño de proteínas conviven varios objetivos en conflicto
          (p. ej. confianza de interfaz, confianza estructural,
          complementaridad): mejorar uno suele degradar otro. La suma{" "}
          <strong>
            s = Σ w<sub>i</sub> m<sub>i</sub>
          </strong>{" "}
          fija los pesos <em>antes</em> de buscar y colapsa el problema a un
          único óptimo de s. Con{" "}
          <strong>
            F = (f<sub>1</sub>, …, f<sub>m</sub>)
          </strong>{" "}
          se conserva el conjunto no dominado —el frente de compromisos
          reales— en lugar de una sola secuencia.
        </p>
      </motion.div>

      <motion.div variants={fade} className="mo-chart-block">
        <MultiChart />

        <ul className="mo-legend" aria-label="Leyenda">
          <li>
            <span className="mo-leg-swatch mo-leg-front" aria-hidden />
            Frente no dominado
          </li>
          <li>
            <span className="mo-leg-swatch mo-leg-cloud" aria-hidden />
            Soluciones dominadas
          </li>
        </ul>
      </motion.div>

      <motion.p variants={fade} className="mo-cite">
        Nanda V, Belure SV, Shir OM. Searching for the Pareto frontier in
        multi-objective protein design. <em>Biophysical Reviews</em>.
        2017;9(4):339–344. Frente del archivo Interface-PAE / pLDDT de este
        trabajo.
      </motion.p>
    </motion.div>
  );
}
