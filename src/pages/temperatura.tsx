import { useMemo, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";

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

// Logits de ejemplo emitidos por la red para una posición (caso de la figura).
type Logit = { aa: string; name: string; z: number; color: string };

const LOGITS: Logit[] = [
  { aa: "A", name: "Alanina", z: 4.5, color: "#2b6ef2" },
  { aa: "R", name: "Arginina", z: 3.8, color: "#6a5cff" },
  { aa: "C", name: "Cisteína", z: 2.1, color: "#00a8c2" },
  { aa: "G", name: "Glicina", z: 0.5, color: "#00b894" },
  { aa: "K", name: "Lisina", z: -1.2, color: "#9aa3b8" },
];

const T_MIN = 0.1;
const T_MAX = 2;

// ---- Geometría de la curva de distribución (SVG) ----
const SVG_W = 340;
const SVG_H = 172;
const PAD = { left: 30, right: 14, top: 16, bottom: 26 };
const PLOT_W = SVG_W - PAD.left - PAD.right;
const PLOT_H = SVG_H - PAD.top - PAD.bottom;
const BASE_Y = PAD.top + PLOT_H; // y de p = 0
const xAt = (i: number): number =>
  PAD.left + (LOGITS.length <= 1 ? 0 : (i / (LOGITS.length - 1)) * PLOT_W);
const yAt = (p: number): number => PAD.top + (1 - p) * PLOT_H;

type Pt = { x: number; y: number };

// Curva suave (Catmull-Rom -> Bézier) con control clamping para no salir del área.
function smoothPath(pts: Pt[]): string {
  if (pts.length < 2) return "";
  const d: string[] = [`M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const clamp = (v: number) => Math.min(BASE_Y, Math.max(PAD.top, v));
    const c1y = clamp(p1.y + (p2.y - p0.y) / 6);
    const c2y = clamp(p2.y - (p3.y - p1.y) / 6);
    d.push(
      `C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(
        2
      )} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
    );
  }
  return d.join(" ");
}

// softmax con temperatura: p_i = exp(z_i / T) / Σ_j exp(z_j / T)
function softmaxT(logits: number[], T: number): number[] {
  const scaled = logits.map((z) => z / T);
  const m = Math.max(...scaled);
  const exps = scaled.map((s) => Math.exp(s - m));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

const fmtPct = (p: number): string => {
  const pct = p * 100;
  if (pct >= 99.95) return "≈100%";
  if (pct < 0.05) return "≈0%";
  // Cerca de los extremos no redondeamos al entero para evitar leer 100% / 0.1%.
  if (pct >= 99 || pct < 1) return pct.toFixed(1) + "%";
  return Math.round(pct) + "%";
};

// ---- Mecanismo: T como ESCALÓN que solo cambia cada N generaciones ----
// La temperatura no varía en cada generación: cada N generaciones se evalúa la
// tendencia de una métrica de calidad y se decide enfriar (hay progreso) o
// recalentar (se estancó). El escalón de T se DERIVA de esa lógica.
const GEN_MAX = 60;
const N_UPDATE = 10; // T se actualiza cada N generaciones
const CHECKPTS = Array.from({ length: GEN_MAX / N_UPDATE + 1 }, (_, i) => i * N_UPDATE);
const METRIC_CP = [0.1, 0.4, 0.62, 0.64, 0.66, 0.82, 0.95];

const TS_MIN = 0.05; // piso de T
const TS_MAX = 0.5; // T inicial / techo
const COOL = 0.9;
const HEAT = 1.15;
const SLOPE_THR = 0.005; // |pendiente| para distinguir progreso de estancamiento

// Esquema de T simulado: una decisión por checkpoint (cada N gen).
function simulateTemp() {
  const temps = [TS_MAX];
  const events: ("cool" | "reheat")[] = [];
  let t = TS_MAX;
  for (let i = 1; i <= GEN_MAX / N_UPDATE - 1; i++) {
    const slope = (METRIC_CP[i] - METRIC_CP[i - 1]) / N_UPDATE;
    if (slope > SLOPE_THR) {
      t = Math.max(TS_MIN, t * COOL);
      events.push("cool");
    } else {
      t = Math.min(TS_MAX, t * HEAT);
      events.push("reheat");
    }
    temps.push(Math.round(t * 1000) / 1000);
  }
  return { temps, events };
}
const { temps: TEMPS, events: EVENTS } = simulateTemp();

const MW = 380;
const MH = 232;
const MPAD = { left: 42, right: 16, top: 28, bottom: 36 };
const MPLOT_W = MW - MPAD.left - MPAD.right;
const MPLOT_H = MH - MPAD.top - MPAD.bottom;
const MBASE_Y = MPAD.top + MPLOT_H;
const mX = (gen: number): number => MPAD.left + (gen / GEN_MAX) * MPLOT_W;
const mYT = (t: number): number =>
  MPAD.top + (1 - (t - TS_MIN) / (TS_MAX - TS_MIN)) * MPLOT_H;
const mYM = (m: number): number => MPAD.top + (1 - m) * MPLOT_H;

function mSmooth(pts: Pt[]): string {
  if (pts.length < 2) return "";
  const clamp = (v: number) => Math.min(MBASE_Y, Math.max(MPAD.top, v));
  const d: string[] = [`M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = clamp(p1.y + (p2.y - p0.y) / 6);
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = clamp(p2.y - (p3.y - p1.y) / 6);
    d.push(
      `C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(
        2
      )} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
    );
  }
  return d.join(" ");
}

// Trazo escalonado de T: constante dentro de cada intervalo de N generaciones,
// con un salto solo en los checkpoints (cada N gen).
function stepPath(): string {
  const d = [`M ${mX(0).toFixed(1)} ${mYT(TEMPS[0]).toFixed(1)}`];
  for (let i = 1; i < TEMPS.length; i++) {
    const xc = mX(CHECKPTS[i]);
    d.push(`L ${xc.toFixed(1)} ${mYT(TEMPS[i - 1]).toFixed(1)}`); // tramo plano
    d.push(`L ${xc.toFixed(1)} ${mYT(TEMPS[i]).toFixed(1)}`); // salto
  }
  d.push(`L ${mX(GEN_MAX).toFixed(1)} ${mYT(TEMPS[TEMPS.length - 1]).toFixed(1)}`);
  return d.join(" ");
}

function MechanismChart({ step }: { step: number }) {
  const metricPath = mSmooth(CHECKPTS.map((g, i) => ({ x: mX(g), y: mYM(METRIC_CP[i]) })));
  const tPath = stepPath();
  const g = CHECKPTS[step];
  const gx = mX(g);
  const my = mYM(METRIC_CP[step]);

  return (
    <svg
      className="mech-chart"
      viewBox={`0 0 ${MW} ${MH}`}
      role="img"
      aria-label="Temperatura en escalón: solo cambia cada N generaciones según la tendencia de la métrica"
    >
      {/* rejilla vertical: cada marca es un checkpoint (cada N generaciones) */}
      {CHECKPTS.map((cg) => (
        <line key={cg} x1={mX(cg)} y1={MPAD.top} x2={mX(cg)} y2={MBASE_Y} className="mech-grid" />
      ))}

      {/* guía del checkpoint activo */}
      <line x1={gx} y1={MPAD.top} x2={gx} y2={MBASE_Y} className="mech-guide" />

      {/* eje X + ticks de generación */}
      <line x1={MPAD.left} y1={MBASE_Y} x2={MW - MPAD.right} y2={MBASE_Y} className="mech-axis" />
      {[0, 20, 40, 60].map((t) => (
        <text key={t} x={mX(t)} y={MBASE_Y + 14} className="mech-tick" textAnchor="middle">
          {t}
        </text>
      ))}
      <text x={MW - MPAD.right} y={MBASE_Y + 26} className="mech-axis-label" textAnchor="end">
        generación →
      </text>
      <text x={MPAD.left - 6} y={MPAD.top + 2} className="mech-axis-label" textAnchor="end">
        T
      </text>
      <text x={MPAD.left + MPLOT_W / 2} y={MPAD.top - 11} className="mech-note" textAnchor="middle">
        T se actualiza solo en cada marca (cada N gen)
      </text>

      {/* métrica de calidad (referencia) */}
      <path d={metricPath} className="mech-metric" />
      {/* temperatura en escalón */}
      <path d={tPath} className="mech-temp" />

      {/* marcador de cada decisión (atenuado salvo el activo) */}
      {EVENTS.map((ev, j) => {
        const cg = CHECKPTS[j + 1];
        const isActive = step === j + 1;
        return (
          <circle
            key={cg}
            cx={mX(cg)}
            cy={mYT(TEMPS[j + 1])}
            r={isActive ? 5.5 : 4}
            className={"mech-step " + ev + (isActive ? " active" : "")}
          />
        );
      })}

      {/* punto y valor de la métrica en el checkpoint activo */}
      <circle cx={gx} cy={my} r={4.5} className="mech-mcur" />
      <text x={gx} y={my - 9} className="mech-mval" textAnchor="middle">
        {METRIC_CP[step].toFixed(2)}
      </text>
    </svg>
  );
}

export function Temperatura({ revealed = false }: { revealed?: boolean }) {
  const [T, setT] = useState(1);
  const [mechStep, setMechStep] = useState(0); // checkpoint activo (0..CHECKPTS-1)

  const probs = useMemo(() => softmaxT(LOGITS.map((l) => l.z), T), [T]);

  const points = useMemo<Pt[]>(
    () => LOGITS.map((_, i) => ({ x: xAt(i), y: yAt(probs[i]) })),
    [probs]
  );
  const linePath = useMemo(() => smoothPath(points), [points]);
  const areaPath = useMemo(
    () =>
      `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${BASE_Y} L ${points[0].x.toFixed(
        2
      )} ${BASE_Y} Z`,
    [linePath, points]
  );

  return (
    <motion.div
      className="temp"
      variants={wrap}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.2 }}
    >
      <div className="temp-grid">
        <motion.div variants={fade} className="temp-copy">
          <h2 className="temp-title">Temperatura variable para ProteinMPNN</h2>
          <p className="temp-text">
            La <strong>temperatura</strong> <span className="temp-T">T</span> del{" "}
            <em>softmax</em> controla la <strong>dispersión</strong> de la
            distribución de probabilidad sobre los aminoácidos a partir de los{" "}
            <em>logits</em> <span className="temp-T">z</span> de la red.
          </p>

          <div className="temp-formula" aria-label="softmax con temperatura">
            <span className="temp-formula-lhs">
              p<sub>i</sub>
            </span>
            <span className="temp-eq">=</span>
            <span className="temp-frac">
              <span className="temp-num">
                e
                <sup className="temp-exp">
                  z<sub>i</sub>/T
                </sup>
              </span>
              <span className="temp-den">
                <span className="temp-sum">Σ</span>
                <sub className="temp-sum-sub">j</sub>
                <span className="temp-sum-term">
                  e
                  <sup className="temp-exp">
                    z<sub>j</sub>/T
                  </sup>
                </span>
              </span>
            </span>
          </div>

          <dl className="temp-legend">
            <div>
              <dt>
                p<sub>i</sub>
              </dt>
              <dd>probabilidad de elegir el aminoácido <em>i</em></dd>
            </div>
            <div>
              <dt>
                z<sub>i</sub>
              </dt>
              <dd>logit: preferencia de la red por el aminoácido <em>i</em></dd>
            </div>
            <div>
              <dt>T</dt>
              <dd>temperatura</dd>
            </div>
            <div>
              <dt>
                Σ<sub>j</sub>
              </dt>
              <dd>suma sobre los 20 aminoácidos (normaliza a 1)</dd>
            </div>
          </dl>

          <ul className="temp-list">
            <li>
              <strong>T → 0:</strong> la masa se concentra en el <em>logit</em>{" "}
              mayor (<span className="temp-tag explota">explotación</span>).
            </li>
            <li>
              <strong>T alta:</strong> la distribución se aplana hacia la
              uniforme (<span className="temp-tag explora">exploración</span>).
            </li>
          </ul>

          <p className="temp-note">
            <strong>Temperatura variable:</strong> esquema de recocido —{" "}
            <span className="temp-T">T</span> alta al inicio para explorar y
            decreciente por generación para refinar, como en el{" "}
            <em>recocido simulado</em>.
          </p>

          <div className="temp-cite">
            <p>Dauparas et al. ProteinMPNN. <em>Science</em>. 2022.</p>
            <p>Kirkpatrick et al. Simulated Annealing. <em>Science</em>. 1983.</p>
            <p>Hinton et al. Distilling the Knowledge. <em>arXiv</em>. 2015.
            </p>
          </div>
        </motion.div>

        <motion.div variants={fade} className="temp-demo">
          <AnimatePresence mode="wait" initial={false}>
          {!revealed ? (
          <motion.div
            key="demo"
            className="temp-demo-inner"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
          {/* 1. Logits = preferencia de ProteinMPNN por cada aminoácido */}
          <div className="temp-chart">
            <div className="temp-chart-head">
              <span className="temp-chart-title">Preferencia de ProteinMPNN</span>
            </div>
            <table className="temp-table">
              <thead>
                <tr>
                  {LOGITS.map((l) => (
                    <th key={l.aa} style={{ color: l.color }} title={l.name}>
                      {l.aa}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {LOGITS.map((l) => (
                    <td key={l.aa} className={l.z < 0 ? "neg" : ""}>
                      {l.z.toFixed(1)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* 2. Transformación softmax controlada por T */}
          

          <div className="temp-slider">
            <div className="temp-slider-top">
              <span>
                Temperatura <span className="temp-T">T</span> ={" "}
                <strong>{T.toFixed(2)}</strong>
              </span>
              
            </div>
            <input
              type="range"
              min={T_MIN}
              max={T_MAX}
              step={0.05}
              value={T}
              onChange={(e) => setT(parseFloat(e.target.value))}
            />
           
          </div>

          {/* 3. Distribución de probabilidad resultante (curva) */}
          <div className="temp-chart">
            <div className="temp-chart-head">
              <span className="temp-chart-title">Distribución de probabilidad</span>
              <span className="temp-chart-sub">
                p(aa) = softmax(z / T) · cada aminoácido es una solución candidata
              </span>
            </div>
            <svg
              className="temp-curve"
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              role="img"
              aria-label="curva de la distribución de probabilidad"
            >
              <defs>
                <linearGradient id="temp-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2b6ef2" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#2b6ef2" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              

              {/* área + curva */}
              <motion.path
                d={areaPath}
                fill="url(#temp-area)"
                stroke="none"
                animate={{ d: areaPath }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.path
                className="temp-curve-line"
                d={linePath}
                animate={{ d: linePath }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />

              {/* puntos (soluciones) + etiquetas */}
              {LOGITS.map((l, i) => (
                <g key={l.aa}>
                  <motion.circle
                    cx={xAt(i)}
                    r={4}
                    fill={l.color}
                    stroke="#fff"
                    strokeWidth={1.5}
                    animate={{ cy: yAt(probs[i]) }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  />
                  <motion.text
                    x={xAt(i)}
                    className="temp-curve-pval"
                    textAnchor="middle"
                    animate={{ y: yAt(probs[i]) - 9 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {fmtPct(probs[i])}
                  </motion.text>
                  <text
                    x={xAt(i)}
                    y={BASE_Y + 17}
                    className="temp-curve-xaa"
                    textAnchor="middle"
                    fill={l.color}
                  >
                    {l.aa}
                  </text>
                </g>
              ))}
            </svg>
          </div>
          </motion.div>
          ) : (
          <motion.div
            key="mech"
            className="tempvar"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="tempvar-head">
              <h3 className="tempvar-title">¿Cómo se comporta el mecanismo?</h3>
              <p className="tempvar-sub">
                <span className="temp-T">T</span> se actualiza <strong>cada N generaciones</strong>. Si la
                métrica mejora, <strong>enfría</strong> (explota); si se estanca,{" "}
                <strong>recalienta</strong> (explora).
              </p>
            </div>

            <MechanismChart step={mechStep} />

            <div className="mech-slider">
              <input
                type="range"
                min={0}
                max={TEMPS.length - 1}
                step={1}
                value={mechStep}
                onChange={(e) => setMechStep(Number(e.target.value))}
                aria-label="Generación / checkpoint"
              />
            </div>

            {(() => {
              const i = mechStep;
              const gen = CHECKPTS[i];
              if (i === 0) {
                return (
                  <div className="mech-rd">
                    <span className="mech-rd-gen">gen {gen}</span>
                    <p className="mech-rd-txt">
                      Inicio del esquema: <span className="temp-T">T</span> alta
                      para explorar. Todavía no hay decisión.
                    </p>
                  </div>
                );
              }
              const ev = EVENTS[i - 1];
              return (
                <div className="mech-rd">
                  <div className="mech-rd-row">
                    <span className="mech-rd-gen">gen {gen}</span>
                    <span className={"mech-rd-chip " + ev}>
                      {ev === "cool" ? "enfría" : "recalienta"}
                    </span>
                  </div>
                  <p className="mech-rd-txt">
                    {ev === "cool" ? (
                      <>
                        La métrica <strong>mejoró</strong>: conviene{" "}
                        <strong>explotar</strong>, así que baja la{" "}
                        <span className="temp-T">T</span>.
                      </>
                    ) : (
                      <>
                        La métrica <strong>se estancó</strong>: conviene{" "}
                        <strong>explorar</strong>, así que sube la{" "}
                        <span className="temp-T">T</span>.
                      </>
                    )}
                  </p>
                </div>
              );
            })()}

            <div className="mech-legend">
              <span className="mech-legend-item">
                <span className="mech-swatch temp" /> Temperatura{" "}
                <span className="temp-T">T</span> (escalón cada N gen)
              </span>
              <span className="mech-legend-item">
                <span className="mech-swatch metric" /> Métrica de calidad
              </span>
              <span className="mech-legend-item">
                <span className="mech-step-dot cool" /> enfría /{" "}
                <span className="mech-step-dot reheat" /> recalienta
              </span>
            </div>
          </motion.div>
          )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}
