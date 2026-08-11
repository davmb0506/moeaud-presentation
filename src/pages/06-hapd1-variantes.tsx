import { motion, type Variants } from "framer-motion";
import hapd1Data from "../data/hapd1Variantes.json";

const fade: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

type ArmId = "base" | "temp" | "mutation";

type ArmRaw = {
  id: ArmId;
  label: string;
  color: string;
  mean: number;
  std: number;
  values: number[];
};

type BoxStats = {
  min: number;
  max: number;
  q1: number;
  med: number;
  q3: number;
};

const ARMS = hapd1Data.arms as ArmRaw[];

function formatSummary(avg: number, sdValue: number) {
  return `${avg.toFixed(1)} ± ${sdValue.toFixed(1)}`;
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base];
}

function boxStats(values: number[]): BoxStats {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    q1: quantile(sorted, 0.25),
    med: quantile(sorted, 0.5),
    q3: quantile(sorted, 0.75),
  };
}

function niceTicks(min: number, max: number, count = 6): number[] {
  const span = max - min || 1;
  const step0 = span / (count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm = step0 / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const start = Math.ceil(min / step) * step;
  const out: number[] = [];
  for (let value = start; value <= max + 1e-9; value += step) {
    out.push(Math.round(value * 100) / 100);
  }
  return out;
}

function jitter(index: number) {
  return (((index * 2654435761) % 1000) / 1000) * 2 - 1;
}

const GROUPS = ARMS.map((arm) => ({
  id: arm.id,
  label: arm.label,
  color: arm.color,
  values: arm.values,
  summaryLabel: formatSummary(arm.mean, arm.std),
}));

const BOXES = GROUPS.map((group) => ({
  ...group,
  stats: boxStats(group.values),
}));

const W = 720;
const H = 380;
const PAD = { left: 56, right: 20, top: 32, bottom: 72 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;
const BOX_W = 64;
const XS = [PAD.left + PW * 0.18, PAD.left + PW * 0.5, PAD.left + PW * 0.82];

/** Mann–Whitney vs solo mutación (menor = mejor). Unilateral = H1: el brazo es mejor. */
const STATS_ROWS = [
  {
    contrast: "Mut+cruza vs solo mutación",
    test: "MW unilateral",
    p: 0.0156,
    sig: "*",
  },
  {
    contrast: "Temp. variable vs solo mutación",
    test: "MW unilateral",
    p: 0.0445,
    sig: "*",
  },
  {
    contrast: "Temp. variable vs mut+cruza",
    test: "MW unilateral",
    p: 0.5451,
    sig: "n.s.",
  },
] as const;

const ALL_VALUES = GROUPS.flatMap((group) => group.values);
const Y_MIN = Math.min(...ALL_VALUES);
const Y_MAX = Math.max(...ALL_VALUES);
const Y_MARGIN = (Y_MAX - Y_MIN) * 0.12;
const SCALE_MIN = Y_MIN - Y_MARGIN;
const SCALE_MAX = Y_MAX + Y_MARGIN;
const TICKS = niceTicks(SCALE_MIN, SCALE_MAX);

const sy = (value: number) =>
  PAD.top + ((SCALE_MAX - value) / (SCALE_MAX - SCALE_MIN)) * PH;

const PLOT_POINTS = GROUPS.flatMap((group, groupIndex) =>
  group.values.map((score, index) => ({
    key: `${group.id}-${index}`,
    arm: group.id as ArmId,
    x: XS[groupIndex] + jitter(index) * (BOX_W / 2 - 8),
    y: sy(score),
    score,
  }))
);

const COLOR_BY_ARM: Record<ArmId, string> = {
  base: GROUPS.find((g) => g.id === "base")!.color,
  temp: GROUPS.find((g) => g.id === "temp")!.color,
  mutation: GROUPS.find((g) => g.id === "mutation")!.color,
};

function Box({
  data,
  cx,
  color,
}: {
  data: number[];
  cx: number;
  color: string;
}) {
  const stats = boxStats(data);
  return (
    <g>
      <line
        x1={cx}
        y1={sy(stats.min)}
        x2={cx}
        y2={sy(stats.max)}
        className="op-whisker"
        style={{ stroke: color }}
      />
      <line
        x1={cx - 10}
        y1={sy(stats.max)}
        x2={cx + 10}
        y2={sy(stats.max)}
        className="op-whisker"
        style={{ stroke: color }}
      />
      <line
        x1={cx - 10}
        y1={sy(stats.min)}
        x2={cx + 10}
        y2={sy(stats.min)}
        className="op-whisker"
        style={{ stroke: color }}
      />
      <rect
        x={cx - BOX_W / 2}
        y={sy(stats.q3)}
        width={BOX_W}
        height={Math.max(1, sy(stats.q1) - sy(stats.q3))}
        className="op-box"
        style={{ stroke: color, fill: color }}
      />
      <line
        x1={cx - BOX_W / 2}
        y1={sy(stats.med)}
        x2={cx + BOX_W / 2}
        y2={sy(stats.med)}
        className="op-median"
        style={{ stroke: color }}
      />
    </g>
  );
}

export function Hapd1Variantes() {
  return (
    <motion.div
      className="ablacion variant-slide hapd1var-slide"
      variants={fade}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.15 }}
    >
      <h2 className="ablacion-title">Comparación de variantes de formulación monoobjetivo</h2>
      <p className="ablacion-sub">
        Se ejecutaron{" "}
        <strong>10 réplicas independientes de 60 generaciones</strong> para cada
        una de tres variantes de operadores en el diseño monoobjetivo sobre
        HA-PD1: solo mutación; mutación y cruce; y mutación y cruce con
        temperatura variable en el muestreo de secuencias.
      </p>

      <div className="hapd1var-solo">
        <section className="ablacion-plot hapd1var-plot">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="ablacion-svg variant-svg hapd1var-svg"
            role="img"
            aria-label="Diagramas de caja comparando mutación sola, mutación con cruce, y mutación con cruce y temperatura variable en HA-PD1"
          >
            <text
              x={PAD.left + PW / 2}
              y={20}
              className="op-sig"
              textAnchor="middle"
            >
              Distribución de la aptitud por variante (HA-PD1)
            </text>

            {TICKS.map((tick) => (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  y1={sy(tick)}
                  x2={PAD.left + PW}
                  y2={sy(tick)}
                  className="abl-grid"
                />
                <text
                  x={PAD.left - 8}
                  y={sy(tick) + 3}
                  className="abl-tick"
                  textAnchor="end"
                >
                  {tick}
                </text>
              </g>
            ))}

            <line
              x1={PAD.left}
              y1={PAD.top}
              x2={PAD.left}
              y2={PAD.top + PH}
              className="abl-axis"
            />
            <line
              x1={PAD.left}
              y1={PAD.top + PH}
              x2={PAD.left + PW}
              y2={PAD.top + PH}
              className="abl-axis"
            />
            <text
              x={18}
              y={PAD.top + PH / 2}
              className="abl-axis-label"
              textAnchor="middle"
              transform={`rotate(-90 18 ${PAD.top + PH / 2})`}
            >
              Aptitud
            </text>

            {BOXES.map((group, index) => (
              <Box
                key={group.id}
                data={group.values}
                cx={XS[index]}
                color={group.color}
              />
            ))}

            {PLOT_POINTS.map((point) => (
              <circle
                key={point.key}
                cx={point.x}
                cy={point.y}
                r={4}
                className="abl-dot"
                style={{ fill: COLOR_BY_ARM[point.arm] }}
              >
                <title>{`${point.score.toFixed(2)}`}</title>
              </circle>
            ))}

            {GROUPS.map((group, index) => (
              <g key={`${group.id}-label`}>
                <text
                  x={XS[index]}
                  y={PAD.top + PH + 24}
                  className="op-xlabel"
                  textAnchor="middle"
                  style={{ fill: group.color }}
                >
                  {group.label}
                </text>
                <text
                  x={XS[index]}
                  y={PAD.top + PH + 42}
                  className="variant-summary"
                  textAnchor="middle"
                >
                  {group.summaryLabel}
                </text>
              </g>
            ))}
          </svg>

          <div className="ablacion-legend">
            {GROUPS.map((group) => (
              <span key={group.id} className="ablacion-legend-item">
                <span
                  className="ablacion-swatch"
                  style={
                    group.id === "temp"
                      ? {
                          background: "rgba(29, 138, 122, 0.14)",
                          border: `1px dashed ${group.color}`,
                        }
                      : { background: group.color }
                  }
                />
                {group.label} · {group.summaryLabel}
              </span>
            ))}
          </div>
        </section>

        <div className="hapd1var-stats">
          <table className="hapd1var-stats-table">
            <thead>
              <tr>
                <th>Contraste</th>
                <th>Prueba</th>
                <th>p</th>
                <th>Sig.</th>
              </tr>
            </thead>
            <tbody>
              {STATS_ROWS.map((row) => (
                <tr key={row.contrast}>
                  <td>{row.contrast}</td>
                  <td>{row.test}</td>
                  <td className="hapd1var-stats-num">{row.p.toFixed(3)}</td>
                  <td
                    className={`hapd1var-stats-sig${
                      row.sig === "n.s." ? " is-ns" : ""
                    }`}
                  >
                    {row.sig}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hapd1var-stats-key">
            * p &lt; 0.05 · n.s. = no significativo
          </p>
        </div>
      </div>
    </motion.div>
  );
}
