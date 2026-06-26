import { motion } from "framer-motion";
import type { ReactNode } from "react";

// ----------------------------------------------------------------------------
// Paleta y metadatos compartidos.
// Azul = "con mecanismos" / primario · Naranja = acento secundario · Verde = ref.
// ----------------------------------------------------------------------------
export const BLUE = "#2E6B8E";
export const ORANGE = "#F28E2B";
export const GREEN = "#3F9B6B";
export const INK = "#0a0e1a";
export const MUTED = "#5a6275";
export const LINE = "#e6e9f2";

// 5 operadores de variación (Parte A) — paleta sobria diferenciada.
export const OPERATORS: { key: string; label: string; color: string; desc: string }[] = [
  { key: "mpnn", label: "ProteinMPNN", color: "#2E6B8E", desc: "muestrea secuencias condicionadas al esqueleto (estructura-aware)" },
  { key: "crossover", label: "Cruzamiento", color: "#6FA3C0", desc: "cruzamiento uniforme entre dos parentales" },
  { key: "mutation", label: "Mutación", color: "#F28E2B", desc: "mutación aleatoria posición a posición" },
  { key: "disruptive", label: "Disruptiva", color: "#B4533A", desc: "varias posiciones a la vez: salto grande" },
  { key: "localized", label: "Localizada", color: "#5C8A6B", desc: "mutación en posiciones de interfaz" },
];

// 5 estrategias de inyección (Parte B).
export const STRATEGIES: { key: string; label: string; color: string }[] = [
  { key: "refinement", label: "Refinamiento", color: "#2E6B8E" },
  { key: "extreme", label: "Extremos", color: "#F28E2B" },
  { key: "anti_consensus", label: "Anti-consenso", color: "#8E6FB0" },
  { key: "gap_targeted", label: "Huecos", color: "#4F9D8B" },
  { key: "random_walk", label: "Caminata aleatoria", color: "#C2603F" },
];

// ----------------------------------------------------------------------------
// FrontCanvas: ejes de minimización (↙ menor = mejor) con función de escala.
// ----------------------------------------------------------------------------
type ScaleFns = { sx: (f: number) => number; sy: (f: number) => number };

export function FrontCanvas({
  width = 380,
  height = 300,
  children,
  showBest = true,
  ariaLabel = "Frente de Pareto",
}: {
  width?: number;
  height?: number;
  children: (s: ScaleFns) => ReactNode;
  showBest?: boolean;
  ariaLabel?: string;
}) {
  const PADL = 30;
  const PADR = 18;
  const PADT = 18;
  const PADB = 34;
  const PW = width - PADL - PADR;
  const PH = height - PADT - PADB;
  const sx = (f: number) => PADL + f * PW;
  const sy = (f: number) => PADT + (1 - f) * PH;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mec-svg" role="img" aria-label={ariaLabel}>
      <line className="mec-axis" x1={PADL} y1={PADT} x2={PADL} y2={PADT + PH} />
      <line className="mec-axis" x1={PADL} y1={PADT + PH} x2={PADL + PW} y2={PADT + PH} />
      <text className="mec-axt" x={PADL + PW} y={PADT + PH + 24} textAnchor="end">
        f₁
      </text>
      <text className="mec-axt" x={PADL - 22} y={PADT + 4}>
        f₂
      </text>
      {showBest && (
        <text className="mec-best" x={PADL + 6} y={PADT + PH - 6}>
          ↙ menor = mejor
        </text>
      )}
      {children({ sx, sy })}
    </svg>
  );
}

// Frente convexo decreciente (esquemático, unidades genéricas f₁/f₂).
export const FRONT: { x: number; y: number }[] = [
  { x: 0.1, y: 0.9 },
  { x: 0.16, y: 0.72 },
  { x: 0.24, y: 0.58 },
  { x: 0.33, y: 0.46 },
  { x: 0.45, y: 0.36 },
  { x: 0.58, y: 0.28 },
  { x: 0.74, y: 0.22 },
  { x: 0.9, y: 0.18 },
];

export function frontPolyline(s: ScaleFns, pts = FRONT): string {
  return pts.map((p) => `${s.sx(p.x).toFixed(1)},${s.sy(p.y).toFixed(1)}`).join(" ");
}

// ----------------------------------------------------------------------------
// ProportionBars: barra apilada horizontal de proporciones (Parte A).
// ----------------------------------------------------------------------------
export function ProportionBars({
  values,
  height = 38,
  showPct = true,
}: {
  values: number[];
  height?: number;
  showPct?: boolean;
}) {
  const total = values.reduce((a, b) => a + b, 0) || 1;
  let acc = 0;
  return (
    <div className="mec-bars">
      <div className="mec-bar-track" style={{ height }}>
        {values.map((v, i) => {
          const w = (v / total) * 100;
          const left = (acc / total) * 100;
          acc += v;
          return (
            <motion.div
              key={OPERATORS[i].key}
              className="mec-bar-seg"
              style={{ background: OPERATORS[i].color, left: `${left}%` }}
              animate={{ width: `${w}%` }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              title={OPERATORS[i].label}
            >
              {showPct && w > 8 ? `${Math.round((v / total) * 100)}%` : ""}
            </motion.div>
          );
        })}
      </div>
      <div className="mec-bars-legend">
        {OPERATORS.map((op, i) => (
          <span key={op.key} className="mec-bars-leg">
            <span className="mec-dot" style={{ background: op.color }} />
            {op.label}
            <code className="mec-tech">{op.key}</code>
            {showPct && (
              <b style={{ color: op.color }}>{Math.round((values[i] / total) * 100)}%</b>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// HVCurve: curva de hipervolumen con meseta + disparo de inyección opcional.
// ----------------------------------------------------------------------------
export function HVCurve({
  width = 380,
  height = 230,
  progress = 1,
  fireAt,
}: {
  width?: number;
  height?: number;
  progress?: number; // 0..1 cuánta curva se dibuja
  fireAt?: number | null; // x (0..1) donde aparece el disparo
}) {
  const PADL = 34;
  const PADR = 16;
  const PADT = 16;
  const PADB = 30;
  const PW = width - PADL - PADR;
  const PH = height - PADT - PADB;
  // HV creciente que satura (logística-ish), luego meseta plana.
  const N = 60;
  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const t = i / N;
    // sube hasta t=0.55 y luego se aplana.
    const rise = 1 - Math.exp(-4.5 * Math.min(t, 0.55));
    const v = rise / (1 - Math.exp(-4.5 * 0.55));
    return { t, v: 0.08 + 0.84 * v };
  });
  const sx = (t: number) => PADL + t * PW;
  const sy = (v: number) => PADT + (1 - v) * PH;
  const shown = pts.filter((p) => p.t <= progress);
  const path = shown.map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.t).toFixed(1)} ${sy(p.v).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mec-svg" role="img" aria-label="Curva de hipervolumen">
      <line className="mec-axis" x1={PADL} y1={PADT} x2={PADL} y2={PADT + PH} />
      <line className="mec-axis" x1={PADL} y1={PADT + PH} x2={PADL + PW} y2={PADT + PH} />
      <text className="mec-axt" x={PADL + PW} y={PADT + PH + 22} textAnchor="end">
        generación
      </text>
      <text className="mec-axt" x={PADL - 26} y={PADT + 4}>
        HV
      </text>
      <path d={path} className="mec-hv-line" />
      {fireAt != null && (
        <g>
          <line
            x1={sx(fireAt)}
            y1={PADT}
            x2={sx(fireAt)}
            y2={PADT + PH}
            className="mec-hv-fire"
          />
          <motion.text
            x={sx(fireAt)}
            y={PADT - 2}
            textAnchor="middle"
            className="mec-hv-firetx"
            initial={{ opacity: 0, y: PADT + 6 }}
            animate={{ opacity: 1, y: PADT - 2 }}
            transition={{ duration: 0.4 }}
          >
            ⚡ inyección
          </motion.text>
        </g>
      )}
    </svg>
  );
}

// ----------------------------------------------------------------------------
// SequenceLogo: columnas con apilado de letras por frecuencia (Parte B / anti).
// ----------------------------------------------------------------------------
type LogoCol = { letters: { aa: string; p: number }[]; low: boolean };

export function SequenceLogo({
  cols,
  diversified = false,
  width = 380,
  height = 150,
}: {
  cols: LogoCol[];
  diversified?: boolean;
  width?: number;
  height?: number;
}) {
  const n = cols.length;
  const PADB = 16;
  const colW = width / n;
  const usableH = height - PADB;
  const AA_COLOR: Record<string, string> = {
    A: "#6FA3C0", G: "#6FA3C0", V: "#6FA3C0", L: "#6FA3C0", I: "#6FA3C0",
    D: "#C2603F", E: "#C2603F", K: "#2E6B8E", R: "#2E6B8E",
    S: "#5C8A6B", T: "#5C8A6B", F: "#8E6FB0", Y: "#8E6FB0", W: "#8E6FB0",
  };
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mec-svg" role="img" aria-label="Sequence logo por posición">
      {cols.map((col, ci) => {
        let yTop = usableH;
        return (
          <g key={ci}>
            {col.low && (
              <motion.rect
                x={ci * colW + 1}
                y={0}
                width={colW - 2}
                height={usableH}
                className={"mec-logo-mark" + (diversified ? " div" : "")}
                animate={{ opacity: diversified ? 0.18 : 0.32 }}
              />
            )}
            {col.letters.map((l, li) => {
              const h = l.p * usableH;
              yTop -= h;
              return (
                <text
                  key={li}
                  x={ci * colW + colW / 2}
                  y={yTop + h * 0.82}
                  textAnchor="middle"
                  className="mec-logo-aa"
                  style={{
                    fontSize: `${Math.max(8, h * 1.25)}px`,
                    fill: AA_COLOR[l.aa] ?? MUTED,
                  }}
                >
                  {l.aa}
                </text>
              );
            })}
            <text x={ci * colW + colW / 2} y={height - 3} textAnchor="middle" className="mec-logo-idx">
              {ci + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ----------------------------------------------------------------------------
// MarkovGraph: 5 nodos en círculo; aristas con grosor ∝ matriz de transición.
// ----------------------------------------------------------------------------
export function MarkovGraph({
  matrix,
  active = -1,
  highlight,
  width = 380,
  height = 320,
}: {
  matrix: number[][];
  active?: number; // estado actual (nodo resaltado)
  highlight?: { i: number; j: number; kind: "reward" | "penalty" } | null;
  width?: number;
  height?: number;
}) {
  const n = STRATEGIES.length;
  const cx = width / 2;
  const cy = height / 2 + 6;
  const R = Math.min(width, height) * 0.36;
  const node = (i: number) => {
    const a = -Math.PI / 2 + (i / n) * 2 * Math.PI;
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mec-svg" role="img" aria-label="Cadena de Markov de estrategias">
      {/* aristas (i->j) salientes del estado activo, o todas si no hay activo */}
      {matrix.map((row, i) =>
        row.map((p, j) => {
          if (i === j) return null;
          if (active >= 0 && i !== active) return null;
          const a = node(i);
          const b = node(j);
          const isHi = highlight && highlight.i === i && highlight.j === j;
          // curva ligeramente arqueada
          const mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.12;
          const my = (a.y + b.y) / 2 - (b.x - a.x) * 0.12;
          return (
            <motion.path
              key={`${i}-${j}`}
              d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
              fill="none"
              stroke={
                isHi
                  ? highlight!.kind === "reward"
                    ? GREEN
                    : "#C2603F"
                  : STRATEGIES[i].color
              }
              animate={{ strokeWidth: 1 + p * 14, opacity: isHi ? 0.95 : 0.4 }}
              transition={{ duration: 0.5 }}
              strokeLinecap="round"
            />
          );
        })
      )}
      {/* nodos */}
      {STRATEGIES.map((s, i) => {
        const p = node(i);
        const on = i === active;
        return (
          <g key={s.key}>
            <motion.circle
              cx={p.x}
              cy={p.y}
              r={on ? 17 : 13}
              fill={on ? s.color : "#fff"}
              stroke={s.color}
              strokeWidth={2.5}
              animate={{ r: on ? 17 : 13 }}
            />
            <text
              x={p.x}
              y={p.y + 1}
              textAnchor="middle"
              className="mec-node-tx"
              style={{ fill: on ? "#fff" : s.color }}
            >
              {i + 1}
            </text>
            <text x={p.x} y={p.y - 22} textAnchor="middle" className="mec-node-lab">
              {s.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
