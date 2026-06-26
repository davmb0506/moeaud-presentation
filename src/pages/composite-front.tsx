import { useMemo, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { ComplexViewer } from "../components/ComplexViewer";
import frontData from "../data/compositeFront.json";

const fade: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

type Point = {
  id: string;
  cond: "con" | "sin";
  f1: number; // 1 - Composite (↓ mejor)
  f2: number; // 1 - TM-score (↓ mejor)
  binder: string;
  pdb: string;
};

const POINTS = frontData.points as Point[];
const COUNTS = frontData.counts as Record<string, number>;

const COND_COLOR: Record<string, string> = { con: "#3b6fb0", sin: "#e8943a" };
const COND_LABEL: Record<string, string> = {
  con: "Con mecanismos",
  sin: "Sin mecanismos",
};

// Geometría del scatter.
const W = 470;
const H = 380;
const PAD = { left: 52, right: 16, top: 18, bottom: 48 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;

const F1S = POINTS.map((p) => p.f1);
const F2S = POINTS.map((p) => p.f2);
const padDom = (lo: number, hi: number): [number, number] => {
  const m = (hi - lo) * 0.05 || 1;
  return [Math.max(0, lo - m), hi + m];
};
const [X_LO, X_HI] = padDom(Math.min(...F1S), Math.max(...F1S));
const [Y_LO, Y_HI] = padDom(Math.min(...F2S), Math.max(...F2S));
const sx = (f1: number) => PAD.left + ((f1 - X_LO) / (X_HI - X_LO)) * PW;
const sy = (f2: number) => PAD.top + (1 - (f2 - Y_LO) / (Y_HI - Y_LO)) * PH;

function niceTicks(min: number, max: number, count = 5): number[] {
  const span = max - min || 1;
  const step0 = span / (count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm = step0 / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const start = Math.ceil(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}

function frontPath(cond: string): string {
  const pts = POINTS.filter((p) => p.cond === cond).sort((a, b) => a.f1 - b.f1);
  if (pts.length < 2) return "";
  return pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.f1).toFixed(1)} ${sy(p.f2).toFixed(1)}`)
    .join(" ");
}

// Referencia de orientación (VEGF-A fijo): mejor interfaz con mecanismos.
const REF_POINT = POINTS.filter((p) => p.cond === "con").reduce(
  (b, p) => (p.f1 < b.f1 ? p : b),
  POINTS.find((p) => p.cond === "con") ?? POINTS[0]
);
// Punto inicial: el más cercano al ideal (esquina inferior-izquierda).
const INITIAL_POINT = POINTS.reduce(
  (b, p) => (p.f1 + p.f2 < b.f1 + b.f2 ? p : b),
  POINTS[0]
);

export function CompositeFront() {
  const [pinnedId, setPinnedId] = useState<string>(INITIAL_POINT?.id ?? "");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const activeId = hoverId ?? pinnedId;
  const active = useMemo(() => POINTS.find((p) => p.id === activeId) ?? null, [activeId]);
  const conPath = useMemo(() => frontPath("con"), []);
  const sinPath = useMemo(() => frontPath("sin"), []);
  const xTicks = useMemo(() => niceTicks(Math.min(...F1S), Math.max(...F1S)), []);
  const yTicks = useMemo(() => niceTicks(Math.min(...F2S), Math.max(...F2S)), []);

  return (
    <motion.div
      className="ablacion"
      variants={fade}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.15 }}
    >
      <h2 className="ablacion-title">
        Ablación de mecanismos — Composite / TM-score
      </h2>
      <p className="ablacion-sub">
        Frente no dominado <strong>agregado</strong> (10 réplicas por condición).
        Haz clic en una solución para ver el <strong>complejo predicho</strong>{" "}
        binder–VEGF-A.
      </p>

      <div className="ablacion-grid">
        <div className="ablacion-plot">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="ablacion-svg"
            role="img"
            aria-label="Frente de Pareto 1 - Composite contra 1 - TM-score"
            onMouseLeave={() => setHoverId(null)}
          >
            {xTicks.map((t) => (
              <g key={`gx-${t}`}>
                <line x1={sx(t)} y1={PAD.top} x2={sx(t)} y2={PAD.top + PH} className="abl-grid" />
                <text x={sx(t)} y={PAD.top + PH + 16} className="abl-tick" textAnchor="middle">
                  {t}
                </text>
              </g>
            ))}
            {yTicks.map((t) => (
              <g key={`gy-${t}`}>
                <line x1={PAD.left} y1={sy(t)} x2={PAD.left + PW} y2={sy(t)} className="abl-grid" />
                <text x={PAD.left - 8} y={sy(t) + 3} className="abl-tick" textAnchor="end">
                  {t}
                </text>
              </g>
            ))}

            <line x1={PAD.left} y1={PAD.top + PH} x2={PAD.left + PW} y2={PAD.top + PH} className="abl-axis" />
            <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + PH} className="abl-axis" />
            <text x={PAD.left + PW / 2} y={H - 6} className="abl-axis-label" textAnchor="middle">
              f₁: 1 − Composite
            </text>
            <text
              x={14}
              y={PAD.top + PH / 2}
              className="abl-axis-label"
              textAnchor="middle"
              transform={`rotate(-90 14 ${PAD.top + PH / 2})`}
            >
              f₂: 1 − TM-score
            </text>
            <text x={PAD.left + 5} y={PAD.top + PH - 7} className="abl-best">
              ↙ menor = mejor
            </text>

            <path d={sinPath} className="abl-front" style={{ stroke: COND_COLOR.sin }} />
            <path d={conPath} className="abl-front" style={{ stroke: COND_COLOR.con }} />

            {POINTS.map((p) => {
              const isPinned = p.id === pinnedId;
              const isHover = p.id === hoverId;
              const shown = isPinned || isHover;
              return (
                <g key={p.id}>
                  {isPinned && (
                    <circle cx={sx(p.f1)} cy={sy(p.f2)} r={9} className="abl-ring pinned" style={{ stroke: COND_COLOR[p.cond] }} />
                  )}
                  {isHover && !isPinned && (
                    <circle cx={sx(p.f1)} cy={sy(p.f2)} r={9} className="abl-ring hover" style={{ stroke: COND_COLOR[p.cond] }} />
                  )}
                  <circle
                    cx={sx(p.f1)}
                    cy={sy(p.f2)}
                    r={shown ? 5.5 : 4}
                    className="abl-dot"
                    style={{ fill: COND_COLOR[p.cond] }}
                    onMouseEnter={() => setHoverId(p.id)}
                    onClick={() => setPinnedId(p.id)}
                  />
                </g>
              );
            })}
          </svg>

          <div className="ablacion-legend">
            {(["con", "sin"] as const).map((c) => (
              <span key={c} className="ablacion-legend-item">
                <span className="ablacion-swatch" style={{ background: COND_COLOR[c] }} />
                {COND_LABEL[c]} · {COUNTS[c]} no dominadas
              </span>
            ))}
          </div>
        </div>

        <div className="ablacion-viewer">
          <ComplexViewer pdbUrl={active?.pdb ?? null} referenceUrl={REF_POINT?.pdb ?? null} />
          {active && (
            <div className="ablacion-info">
              <div className="ablacion-info-head">
                <span className="ablacion-info-tag" style={{ background: COND_COLOR[active.cond] }}>
                  {COND_LABEL[active.cond]}
                </span>
                <span className="ablacion-info-metrics">
                  1−Composite <strong>{active.f1.toFixed(3)}</strong> · 1−TM-score{" "}
                  <strong>{active.f2.toFixed(3)}</strong>
                </span>
              </div>
              <code className="ablacion-info-seq">{active.binder}</code>
              <p className="ablacion-info-note">
                <span className="ablacion-chip target" /> VEGF-A (objetivo) ·{" "}
                <span className="ablacion-chip binder" /> binder diseñado
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
