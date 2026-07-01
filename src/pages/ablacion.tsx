import { useMemo, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { ComplexViewer } from "../components/ComplexViewer";
import frontData from "../data/ablationFront.json";

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
  pae: number; // Interface-PAE medio (Å), menor = mejor
  plddt: number; // pLDDT medio
  p100: number; // 100 - pLDDT, menor = mejor
  binder: string;
  pdb: string;
};

const POINTS = frontData.points as Point[];
const STATS = frontData.stats as Record<string, { mean: number; sd: number }>;

const COND_COLOR: Record<string, string> = {
  con: "#2b6ef2",
  sin: "#d6455a",
};
const COND_LABEL: Record<string, string> = {
  con: "Con mecanismos",
  sin: "Sin mecanismos",
};

// Geometría del scatter (ejes en unidades reales).
const W = 470;
const H = 380;
const PAD = { left: 52, right: 16, top: 18, bottom: 48 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;

// Dominios reales con un pequeño margen.
const PAES = POINTS.map((p) => p.pae);
const P100S = POINTS.map((p) => p.p100);
const padDom = (lo: number, hi: number): [number, number] => {
  const m = (hi - lo) * 0.05 || 1;
  return [lo - m, hi + m];
};
const [X_LO, X_HI] = padDom(Math.min(...PAES), Math.max(...PAES));
const [Y_LO, Y_HI] = padDom(Math.min(...P100S), Math.max(...P100S));
const sx = (pae: number) => PAD.left + ((pae - X_LO) / (X_HI - X_LO)) * PW;
const sy = (p100: number) => PAD.top + (1 - (p100 - Y_LO) / (Y_HI - Y_LO)) * PH;

// Ticks "bonitos" dentro de un rango.
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

// Línea del frente (puntos ordenados por Interface-PAE) para cada condición.
function frontPath(cond: string): string {
  const pts = POINTS.filter((p) => p.cond === cond).sort((a, b) => a.pae - b.pae);
  if (pts.length < 2) return "";
  return pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.pae).toFixed(1)} ${sy(p.p100).toFixed(1)}`)
    .join(" ");
}

// Referencia de orientación: el diseño con mejor pLDDT (VEGF-A mejor resuelto),
// para que la superposición sea determinista e independiente del hover.
const REF_POINT = POINTS.reduce(
  (best, p) => (p.plddt > best.plddt ? p : best),
  POINTS[0]
);

// Punto inicial mostrado: un diseño balanceado y de interfaz limpia —la mejor
// interfaz (menor Interface-PAE) entre los de pLDDT decente— para no abrir en el
// extremo de peor interfaz (donde AF predice poses con colisiones).
const INITIAL_POINT =
  POINTS.filter((p) => p.plddt >= 55).sort((a, b) => a.pae - b.pae)[0] ??
  POINTS.slice().sort((a, b) => a.pae - b.pae)[0];

export function Ablacion() {
  // pinnedId: selección fijada por click (persiste hasta clicar otro).
  // hoverId: previsualización temporal al pasar el cursor.
  const [pinnedId, setPinnedId] = useState<string>(INITIAL_POINT?.id ?? "");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const activeId = hoverId ?? pinnedId;
  const active = useMemo(
    () => POINTS.find((p) => p.id === activeId) ?? null,
    [activeId]
  );
  const conPath = useMemo(() => frontPath("con"), []);
  const sinPath = useMemo(() => frontPath("sin"), []);
  const xTicks = useMemo(() => niceTicks(Math.min(...PAES), Math.max(...PAES)), []);
  const yTicks = useMemo(() => niceTicks(Math.min(...P100S), Math.max(...P100S)), []);

  return (
    <motion.div
      className="ablacion"
      variants={fade}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.15 }}
    >
      <h2 className="ablacion-title">Ablación de mecanismos adaptativos</h2>
      <p className="ablacion-sub">
        Frente de Pareto <strong>Interface-PAE / pLDDT</strong> de soluciones no
        dominadas. 
      </p>

      <div className="ablacion-grid">
        {/* Scatter del frente */}
        <div className="ablacion-plot">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="ablacion-svg"
            role="img"
            aria-label="Frente de Pareto Interface-PAE contra pLDDT"
            onMouseLeave={() => setHoverId(null)}
          >
            {/* rejilla + ejes */}
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

            {/* ejes */}
            <line x1={PAD.left} y1={PAD.top + PH} x2={PAD.left + PW} y2={PAD.top + PH} className="abl-axis" />
            <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + PH} className="abl-axis" />
            <text x={PAD.left + PW / 2} y={H - 6} className="abl-axis-label" textAnchor="middle">
              f₁: Interface-PAE (Å)
            </text>
            <text
              x={14}
              y={PAD.top + PH / 2}
              className="abl-axis-label"
              textAnchor="middle"
              transform={`rotate(-90 14 ${PAD.top + PH / 2})`}
            >
              f₂: 100 − pLDDT
            </text>
            <text x={PAD.left + 5} y={PAD.top + PH - 7} className="abl-best">
              ↙ menor = mejor
            </text>

            {/* líneas del frente */}
            <path d={sinPath} className="abl-front" style={{ stroke: COND_COLOR.sin }} />
            <path d={conPath} className="abl-front" style={{ stroke: COND_COLOR.con }} />

            {/* puntos */}
            {POINTS.map((p) => {
              const isPinned = p.id === pinnedId;
              const isHover = p.id === hoverId;
              const shown = isPinned || isHover;
              return (
                <g key={p.id}>
                  {isPinned && (
                    <circle cx={sx(p.pae)} cy={sy(p.p100)} r={9} className="abl-ring pinned" style={{ stroke: COND_COLOR[p.cond] }} />
                  )}
                  {isHover && !isPinned && (
                    <circle cx={sx(p.pae)} cy={sy(p.p100)} r={9} className="abl-ring hover" style={{ stroke: COND_COLOR[p.cond] }} />
                  )}
                  <circle
                    cx={sx(p.pae)}
                    cy={sy(p.p100)}
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
                {COND_LABEL[c]} · {STATS[c].mean} ± {STATS[c].sd} no dom./réplica
              </span>
            ))}
          </div>
        </div>

        {/* Visor del complejo del punto activo */}
        <div className="ablacion-viewer">
          <ComplexViewer pdbUrl={active?.pdb ?? null} referenceUrl={REF_POINT?.pdb ?? null} />
          {active && (
            <div className="ablacion-info">
              <div className="ablacion-info-head">
                <span
                  className="ablacion-info-tag"
                  style={{ background: COND_COLOR[active.cond] }}
                >
                  {COND_LABEL[active.cond]}
                </span>
                <span className="ablacion-info-metrics">
                  Interface-PAE <strong>{active.pae.toFixed(1)} Å</strong> · pLDDT{" "}
                  <strong>{active.plddt}</strong>
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
