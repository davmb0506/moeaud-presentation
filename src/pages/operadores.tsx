import { useMemo, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { ComplexViewer } from "../components/ComplexViewer";
import opData from "../data/operadoresData.json";

const fade: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const COLOR_BASE = "#3b6fb0";
const COLOR_BOTH = "#d1622b";
const COND_COLOR: Record<string, string> = { base: COLOR_BASE, both: COLOR_BOTH };

type Sol = {
  id: string;
  group: string;
  score: number;
  plddt: number;
  iptm: number;
  contact: number;
  binder: string;
  pdb: string;
};

// Distribución completa del experimento (todas las réplicas) para boxplot/stats.
const BASE = [
  -183.98, -196.6, -189.15, -181.34, -187.93, -183.92, -185.61, -182.83,
  -184.2, -189.58, -197.98, -187.58, -187.97, -200.13, -184.07, -192.46,
  -194.78, -185.61, -184.71, -196.04, -190.78, -188.15, -191.05, -181.92,
  -186.5, -188.76, -181.82, -185.9, -184.99,
];
const BOTH = [
  -192.77, -200.46, -190.66, -201.68, -192.03, -190.83, -188.62, -193.05,
  -190.17, -190.71, -196.72, -193.27, -189.31, -193.33, -193.63, -189.46,
  -189.98, -190.01, -189.19, -194.77, -190.35, -191.44, -192.1, -188.73,
  -192.99, -192.95, -190.97, -191.03,
];

// Solo soluciones con estructura (PDB) guardada -> puntos clickeables.
const BASE_SOLS = opData.base as Sol[];
const BOTH_SOLS = opData.both as Sol[];

// Referencia de orientación: la mejor solución base.
const REF_SOL = BASE_SOLS.reduce((b, s) => (s.score < b.score ? s : b), BASE_SOLS[0]);
// Solución inicial: la mejor global (más negativa).
const INITIAL_SOL = [...BASE_SOLS, ...BOTH_SOLS].reduce(
  (b, s) => (s.score < b.score ? s : b),
  REF_SOL
);

// ---- Geometría del boxplot ----
const W = 470;
const H = 380;
const PAD = { left: 58, right: 18, top: 46, bottom: 38 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;

const ALL = [...BASE, ...BOTH];
const MARGIN = (Math.max(...ALL) - Math.min(...ALL)) * 0.08;
const Y_LO = Math.min(...ALL) - MARGIN;
const Y_HI = Math.max(...ALL) + MARGIN;
const sy = (v: number) => PAD.top + ((Y_HI - v) / (Y_HI - Y_LO)) * PH;
const X_BASE = PAD.left + PW * 0.3;
const X_BOTH = PAD.left + PW * 0.7;
const BOX_W = 56;

function quantile(s: number[], q: number): number {
  const pos = (s.length - 1) * q;
  const b = Math.floor(pos);
  const r = pos - b;
  return s[b + 1] !== undefined ? s[b] + r * (s[b + 1] - s[b]) : s[b];
}
function boxStats(arr: number[]) {
  const s = [...arr].sort((a, b) => a - b);
  return {
    min: s[0],
    max: s[s.length - 1],
    q1: quantile(s, 0.25),
    med: quantile(s, 0.5),
    q3: quantile(s, 0.75),
  };
}
function niceTicks(min: number, max: number, count = 5): number[] {
  const span = max - min || 1;
  const step0 = span / (count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm = step0 / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const start = Math.ceil(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max + 1e-9; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}
const jitter = (i: number) => (((i * 2654435761) % 1000) / 1000) * 2 - 1;

type Pt = { key: string; group: string; x: number; y: number; sol: Sol };

function buildPoints(sols: Sol[], cx: number): Pt[] {
  return sols.map((s, i) => ({
    key: s.id,
    group: s.group,
    x: cx + jitter(i) * (BOX_W / 2 - 8),
    y: sy(s.score),
    sol: s,
  }));
}

const POINTS: Pt[] = [
  ...buildPoints(BASE_SOLS, X_BASE),
  ...buildPoints(BOTH_SOLS, X_BOTH),
];

function Box({ data, cx, color }: { data: number[]; cx: number; color: string }) {
  const b = boxStats(data);
  const half = BOX_W / 2;
  return (
    <g>
      <line x1={cx} y1={sy(b.min)} x2={cx} y2={sy(b.max)} className="op-whisker" />
      <line x1={cx - 10} y1={sy(b.max)} x2={cx + 10} y2={sy(b.max)} className="op-whisker" />
      <line x1={cx - 10} y1={sy(b.min)} x2={cx + 10} y2={sy(b.min)} className="op-whisker" />
      <rect
        x={cx - half}
        y={sy(b.q3)}
        width={BOX_W}
        height={Math.max(1, sy(b.q1) - sy(b.q3))}
        className="op-box"
        style={{ stroke: color, fill: color }}
      />
      <line x1={cx - half} y1={sy(b.med)} x2={cx + half} y2={sy(b.med)} className="op-median" style={{ stroke: color }} />
    </g>
  );
}

export function Operadores() {
  const [pinnedId, setPinnedId] = useState<string>(() => {
    const p = POINTS.find((pt) => pt.sol?.id === INITIAL_SOL.id);
    return p ? p.key : "";
  });
  const [hoverId, setHoverId] = useState<string | null>(null);

  const activeKey = hoverId ?? pinnedId;
  const active = useMemo(() => POINTS.find((p) => p.key === activeKey) ?? null, [activeKey]);
  const sol = active ? active.sol : INITIAL_SOL;
  const yTicks = useMemo(() => niceTicks(Math.min(...ALL), Math.max(...ALL)), []);
  const meanOf = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const stdOf = (a: number[]) => {
    const m = meanOf(a);
    return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
  };

  return (
    <motion.div
      className="ablacion"
      variants={fade}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.15 }}
    >
      <h2 className="ablacion-title">
        Operadores evolutivos: EvoPro Base vs EvoPro Modificado
      </h2>
      <p className="ablacion-sub">
        Comparación de las mejores soluciones sobre el{" "}
        <strong>objetivo por defecto de EvoPro</strong>. Haz clic en una solución
        para ver su complejo.
      </p>

      <div className="ablacion-grid">
        {/* Boxplot + puntos clickeables */}
        <div className="ablacion-plot">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="ablacion-svg"
            role="img"
            aria-label="Boxplot del mejor overall_score: base vs mutación + crossover"
            onMouseLeave={() => setHoverId(null)}
          >
            <text x={PAD.left + PW / 2} y={20} className="op-sig" textAnchor="middle">
              Mann-Whitney p = 0.0002 · Cliff's δ = −0.58 (grande)
            </text>

            {yTicks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} y1={sy(t)} x2={PAD.left + PW} y2={sy(t)} className="abl-grid" />
                <text x={PAD.left - 8} y={sy(t) + 3} className="abl-tick" textAnchor="end">
                  {t}
                </text>
              </g>
            ))}

            <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + PH} className="abl-axis" />
            <line x1={PAD.left} y1={PAD.top + PH} x2={PAD.left + PW} y2={PAD.top + PH} className="abl-axis" />
            <text
              x={16}
              y={PAD.top + PH / 2}
              className="abl-axis-label"
              textAnchor="middle"
              transform={`rotate(-90 16 ${PAD.top + PH / 2})`}
            >
              Mejor overall_score (↓ mejor)
            </text>
            <text x={PAD.left + 5} y={PAD.top + PH - 7} className="abl-best">
              ↓ mejor
            </text>

            <Box data={BASE} cx={X_BASE} color={COLOR_BASE} />
            <Box data={BOTH} cx={X_BOTH} color={COLOR_BOTH} />

            {/* puntos (cada uno tiene estructura) */}
            {POINTS.map((p) => {
              const isPinned = p.key === pinnedId;
              const isHover = p.key === hoverId;
              const shown = isPinned || isHover;
              return (
                <g key={p.key}>
                  {shown && (
                    <circle cx={p.x} cy={p.y} r={9} className={"abl-ring " + (isPinned ? "pinned" : "hover")} style={{ stroke: COND_COLOR[p.group] }} />
                  )}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={shown ? 5.5 : 4}
                    className="abl-dot"
                    style={{ fill: COND_COLOR[p.group] }}
                    onMouseEnter={() => setHoverId(p.key)}
                    onClick={() => setPinnedId(p.key)}
                  />
                </g>
              );
            })}

            <text x={X_BASE} y={PAD.top + PH + 22} className="op-xlabel" textAnchor="middle" style={{ fill: COLOR_BASE }}>
              base (mutación)
            </text>
            <text x={X_BOTH} y={PAD.top + PH + 22} className="op-xlabel" textAnchor="middle" style={{ fill: COLOR_BOTH }}>
              + crossover
            </text>
          </svg>

          <div className="ablacion-legend">
            <span className="ablacion-legend-item">
              <span className="ablacion-swatch" style={{ background: COLOR_BASE }} />
              EvoPro base (mutación) · {meanOf(BASE).toFixed(1)} ± {stdOf(BASE).toFixed(1)}
            </span>
            <span className="ablacion-legend-item">
              <span className="ablacion-swatch" style={{ background: COLOR_BOTH }} />
              Mutación + Crossover · {meanOf(BOTH).toFixed(1)} ± {stdOf(BOTH).toFixed(1)}
            </span>
          </div>
        </div>

        {/* Visor del complejo de la solución seleccionada */}
        <div className="ablacion-viewer">
          <ComplexViewer pdbUrl={sol.pdb} referenceUrl={REF_SOL.pdb} />
          <div className="ablacion-info">
            <div className="ablacion-info-head">
              <span className="ablacion-info-tag" style={{ background: COND_COLOR[sol.group] }}>
                {sol.group === "base" ? "EvoPro base (mutación)" : "Mutación + Crossover"}
              </span>
            </div>
            <div className="op-metrics">
              <div className="op-metric">
                <span className="op-metric-k">overall_score</span>
                <span className="op-metric-v">{sol.score.toFixed(2)}</span>
              </div>
              <div className="op-metric">
                <span className="op-metric-k">pLDDT</span>
                <span className="op-metric-v">{sol.plddt.toFixed(1)}</span>
              </div>
              <div className="op-metric">
                <span className="op-metric-k">ipTM</span>
                <span className="op-metric-v">{sol.iptm.toFixed(2)}</span>
              </div>
              <div className="op-metric">
                <span className="op-metric-k">ContactScore</span>
                <span className="op-metric-v">{sol.contact.toFixed(1)}</span>
              </div>
            </div>
            <code className="ablacion-info-seq">{sol.binder}</code>
            <p className="ablacion-info-note">
              <span className="ablacion-chip target" /> objetivo (EvoPro por defecto) ·{" "}
              <span className="ablacion-chip binder" /> binder diseñado
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
