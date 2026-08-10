import { motion, type Variants } from "framer-motion";

/** 0 ejes · 1 mono · 2 nube + frente */
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

const VB_W = 360;
const VB_H = 280;
const PAD = { l: 40, r: 14, t: 14, b: 36 };
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

/* Mono: trayectoria irregular. */
const CONV: Pt[] = (() => {
  const raw = [
    0.9, 0.78, 0.71, 0.64, 0.58, 0.54, 0.5, 0.47, 0.45, 0.43, 0.42, 0.415,
    0.41, 0.408, 0.405,
  ];
  return raw.map((s, i) => ({
    x: sx(i / (raw.length - 1)),
    y: sy(s),
  }));
})();

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

/** Contorno del cono: rayos desde extremos + escalera (región dominada al NE). */
function dominanceBoundaryUV(front: UV[]): UV[] {
  if (front.length === 0) return [];
  const first = front[0];
  const last = front[front.length - 1];
  return [{ u: first.u, v: 1 }, ...stairUV(front), { u: 1, v: last.v }];
}

const CONE_EDGE = toPath(dominanceBoundaryUV(FRONT_UV).map(map));

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

function Axes({ xLabel, yLabel }: { xLabel: string; yLabel: string }) {
  return (
    <>
      <line className="mo-axis" x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(0)} />
      <line className="mo-axis" x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(1)} />
      <text className="mo-axt" x={sx(1)} y={sy(0) + 24} textAnchor="end">
        {xLabel}
      </text>
      <text
        className="mo-axt"
        x={14}
        y={PAD.t + PH / 2}
        textAnchor="middle"
        transform={`rotate(-90 14 ${PAD.t + PH / 2})`}
      >
        {yLabel}
      </text>
    </>
  );
}

function MonoChart({ active }: { active: boolean }) {
  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="mo-svg"
      role="img"
      aria-label="Convergencia del escalar s respecto a la generación"
    >
      <Axes xLabel="generación" yLabel="s" />
      <motion.path
        className="mo-line"
        d={toPath(CONV)}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={
          active
            ? { pathLength: 1, opacity: 1 }
            : { pathLength: 0, opacity: 0 }
        }
        transition={{ duration: 1.05, ease: EASE }}
      />
      {CONV.map((p, i) => {
        const isEnd = i === CONV.length - 1;
        return (
          <motion.circle
            key={i}
            className={isEnd ? "mo-dot" : "mo-tick"}
            cx={p.x}
            cy={p.y}
            r={isEnd ? 5 : 2.2}
            initial={{ scale: 0, opacity: 0 }}
            animate={
              active
                ? { scale: 1, opacity: isEnd ? 1 : 0.55 }
                : { scale: 0, opacity: 0 }
            }
            transition={{
              duration: 0.22,
              delay: active ? (i / (CONV.length - 1)) * 0.95 : 0,
              ease: EASE,
            }}
          />
        );
      })}
    </svg>
  );
}

function MultiChart({ step }: { step: number }) {
  const show = step >= 2;

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="mo-svg"
      role="img"
      aria-label="Frente Interface-PAE frente a 100 menos pLDDT"
    >
      <Axes xLabel="Interface-PAE" yLabel="100 − pLDDT" />

      {CLOUD.map((p, i) => (
        <motion.circle
          key={`c${i}`}
          className="mo-cloud"
          cx={p.x}
          cy={p.y}
          r={2.8}
          initial={{ scale: 0, opacity: 0 }}
          animate={
            show ? { scale: 1, opacity: 0.7 } : { scale: 0, opacity: 0 }
          }
          transition={{ duration: 0.22, delay: 0.02 * i, ease: EASE }}
        />
      ))}

      <motion.path
        className="mo-front"
        d={CONE_EDGE}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={
          show
            ? { pathLength: 1, opacity: 1 }
            : { pathLength: 0, opacity: 0 }
        }
        transition={{ duration: 0.9, delay: show ? 0.35 : 0, ease: EASE }}
      />
      {FRONT.map((p, i) => (
        <motion.circle
          key={`f${i}`}
          className="mo-dot multi"
          cx={p.x}
          cy={p.y}
          r={3.6}
          initial={{ scale: 0, opacity: 0 }}
          animate={show ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          transition={{
            duration: 0.22,
            delay: show ? 0.45 + 0.025 * i : 0,
            ease: EASE,
          }}
        />
      ))}
    </svg>
  );
}

export function Multiobjetivo({ step = 0 }: { step?: number }) {
  const s = Math.max(0, Math.min(MO_MAX_STEP, step));
  const monoActive = s >= 1;

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

      <motion.div variants={fade} className="mo-compare">
        <div className="mo-panels">
          <div className="mo-panel">
            <div className="mo-panel-head">
              <h4>Monoobjetivo</h4>
              <small>
                min<sub>x</sub> s(x)
              </small>
            </div>
            <MonoChart active={monoActive} />
          </div>

          <div className="mo-divider" aria-hidden />

          <div className="mo-panel">
            <div className="mo-panel-head">
              <h4>Multiobjetivo</h4>
              <small>
                min<sub>x</sub> F(x)
              </small>
            </div>
            <MultiChart step={s} />
          </div>
        </div>
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
