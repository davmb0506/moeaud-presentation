import { useMemo, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { ComplexViewer } from "../components/ComplexViewer";
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

type RunRaw = {
  id: string;
  arm: ArmId;
  replica: number;
  generation_budget: number;
  score: number;
  binder: string;
  plddt: number | null;
  iptm: number | null;
  contact: number | null;
  gravy: number | null;
  charge: number | null;
  pi: number | null;
  aromaticity: number | null;
  instability: number | null;
  mw_kda: number | null;
  pdb: string | null;
};

type ArmRaw = {
  id: ArmId;
  label: string;
  shortLabel: string;
  color: string;
  mean: number;
  std: number;
  values: number[];
  runs: RunRaw[];
};

type BoxStats = {
  min: number;
  max: number;
  q1: number;
  med: number;
  q3: number;
};

type PlotPoint = {
  key: string;
  arm: ArmId;
  x: number;
  y: number;
  run: RunRaw & { viewerPdbUrl: string | null };
};

const ARMS = hapd1Data.arms as ArmRaw[];

function formatSummary(avg: number, sdValue: number) {
  return `${avg.toFixed(1)} ± ${sdValue.toFixed(1)}`;
}

function toPublicPdbUrl(pdb: string | null) {
  if (!pdb) return null;
  const base = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${base}${pdb.replace(/^\/+/, "")}`;
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

function fmt(value: number | null, digits: number) {
  return value === null || Number.isNaN(value) ? "—" : value.toFixed(digits);
}

function displayRunId(run: RunRaw) {
  const group = ARMS.find((arm) => arm.id === run.arm);
  const label = group?.shortLabel ?? run.arm;
  return `${label} · réplica ${String(run.replica).padStart(2, "0")}`;
}

const GROUPS = ARMS.map((arm) => ({
  id: arm.id,
  label: arm.label,
  color: arm.color,
  values: arm.values,
  summaryLabel: formatSummary(arm.mean, arm.std),
  runs: arm.runs.map((run) => ({
    ...run,
    viewerPdbUrl: toPublicPdbUrl(run.pdb),
  })),
}));

const BOXES = GROUPS.map((group) => ({
  ...group,
  stats: boxStats(group.values),
}));

const W = 560;
const H = 398;
const PAD = { left: 60, right: 18, top: 36, bottom: 78 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;
const BOX_W = 56;
const XS = [PAD.left + PW * 0.18, PAD.left + PW * 0.5, PAD.left + PW * 0.82];

const ALL_VALUES = GROUPS.flatMap((group) => group.values);
const Y_MIN = Math.min(...ALL_VALUES);
const Y_MAX = Math.max(...ALL_VALUES);
const Y_MARGIN = (Y_MAX - Y_MIN) * 0.12;
const SCALE_MIN = Y_MIN - Y_MARGIN;
const SCALE_MAX = Y_MAX + Y_MARGIN;
const TICKS = niceTicks(SCALE_MIN, SCALE_MAX);

const sy = (value: number) =>
  PAD.top + ((SCALE_MAX - value) / (SCALE_MAX - SCALE_MIN)) * PH;

const PLOT_POINTS: PlotPoint[] = GROUPS.flatMap((group, groupIndex) =>
  group.runs.map((run, index) => ({
    key: run.id,
    arm: group.id,
    x: XS[groupIndex] + jitter(index) * (BOX_W / 2 - 8),
    y: sy(run.score),
    run,
  }))
);

const INITIAL_RUN =
  PLOT_POINTS.filter((point) => point.run.viewerPdbUrl).reduce(
    (best, point) => (point.run.score < best.run.score ? point : best),
    PLOT_POINTS.find((point) => point.run.viewerPdbUrl) ?? PLOT_POINTS[0]
  ).run;

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
  const [pinnedId, setPinnedId] = useState(INITIAL_RUN.id);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const activeKey = hoverId ?? pinnedId;
  const activePoint = useMemo(
    () => PLOT_POINTS.find((point) => point.key === activeKey) ?? null,
    [activeKey]
  );
  const run = activePoint?.run ?? INITIAL_RUN;
  const armLabel =
    GROUPS.find((group) => group.id === run.arm)?.label ?? run.arm;

  const legendGroups = GROUPS.map((group) => ({
    ...group,
    swatchStyle:
      group.id === "temp"
        ? {
            background: "rgba(29, 138, 122, 0.14)",
            border: `1px dashed ${group.color}`,
          }
        : { background: group.color },
  }));

  return (
    <motion.div
      className="ablacion variant-slide hapd1var-slide"
      variants={fade}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.15 }}
    >
      <h2 className="ablacion-title">Comparación de variantes en HA-PD1</h2>
      <p className="ablacion-sub">
        Mejor puntaje de diseño alcanzado por réplica (60 generaciones, 10
        réplicas por variante): solo mutación, mutación y cruce, y mutación y
        cruce con temperatura variable en el muestreo de secuencias. Incluye
        propiedades ProtParam del binder.
      </p>

      <div className="ablacion-grid hapd1var-grid">
        <section className="ablacion-plot hapd1var-plot">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="ablacion-svg variant-svg hapd1var-svg"
            role="img"
            aria-label="Diagramas de caja comparando mutación sola, mutación con cruce, y mutación con cruce y temperatura variable en HA-PD1"
            onMouseLeave={() => setHoverId(null)}
          >
            <text
              x={PAD.left + PW / 2}
              y={20}
              className="op-sig"
              textAnchor="middle"
            >
              Distribución del mejor puntaje por variante (HA-PD1)
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
              Mejor puntaje de diseño (↓ mejor)
            </text>
            <text x={PAD.left + 5} y={PAD.top + PH - 7} className="abl-best">
              ↓ mejor
            </text>

            {BOXES.map((group, index) => (
              <Box
                key={group.id}
                data={group.values}
                cx={XS[index]}
                color={group.color}
              />
            ))}

            {PLOT_POINTS.map((point) => {
              const isPinned = point.key === pinnedId;
              const isHover = point.key === hoverId;
              const highlighted = isPinned || isHover;
              const hasPdb = Boolean(point.run.viewerPdbUrl);
              return (
                <g key={point.key}>
                  {highlighted && (
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={9}
                      className={`abl-ring ${isPinned ? "pinned" : "hover"}`}
                      style={{ stroke: COLOR_BY_ARM[point.arm] }}
                    />
                  )}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={highlighted ? 5.5 : 4}
                    className="abl-dot"
                    style={{
                      fill: COLOR_BY_ARM[point.arm],
                      cursor: hasPdb ? "pointer" : "default",
                      opacity: hasPdb ? 1 : 0.45,
                    }}
                    onMouseEnter={
                      hasPdb ? () => setHoverId(point.key) : undefined
                    }
                    onClick={
                      hasPdb ? () => setPinnedId(point.key) : undefined
                    }
                  />
                  <title>
                    {`${displayRunId(point.run)} · ${point.run.score.toFixed(
                      2
                    )}${hasPdb ? "" : " · sin estructura"}`}
                  </title>
                </g>
              );
            })}

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
            {legendGroups.map((group) => (
              <span key={group.id} className="ablacion-legend-item">
                <span className="ablacion-swatch" style={group.swatchStyle} />
                {group.label} · {group.summaryLabel}
              </span>
            ))}
          </div>
        </section>

        <section className="ablacion-viewer hapd1var-viewer">
          <ComplexViewer
            key={run.id}
            pdbUrl={run.viewerPdbUrl}
            referenceUrl={run.viewerPdbUrl}
          />

          <div className="ablacion-info">
            <div className="ablacion-info-head">
              <span
                className="ablacion-info-tag"
                style={{ background: COLOR_BY_ARM[run.arm] }}
              >
                {armLabel}
              </span>
              <span className="ablacion-info-id">
                Réplica {String(run.replica).padStart(2, "0")}
              </span>
            </div>
            <div className="op-metrics">
              <div className="op-metric">
                <span className="op-metric-k">Puntaje general</span>
                <span className="op-metric-v">{run.score.toFixed(2)}</span>
              </div>
              <div className="op-metric">
                <span className="op-metric-k">pLDDT binder</span>
                <span className="op-metric-v">{fmt(run.plddt, 1)}</span>
              </div>
              <div className="op-metric">
                <span className="op-metric-k">ipTM</span>
                <span className="op-metric-v">{fmt(run.iptm, 2)}</span>
              </div>
              <div className="op-metric">
                <span className="op-metric-k">Score de contacto</span>
                <span className="op-metric-v">{fmt(run.contact, 1)}</span>
              </div>
              <div className="op-metric">
                <span className="op-metric-k">GRAVY</span>
                <span className="op-metric-v">{fmt(run.gravy, 3)}</span>
              </div>
              <div className="op-metric">
                <span className="op-metric-k">Carga pH 7</span>
                <span className="op-metric-v">{fmt(run.charge, 1)}</span>
              </div>
              <div className="op-metric">
                <span className="op-metric-k">pI</span>
                <span className="op-metric-v">{fmt(run.pi, 2)}</span>
              </div>
              <div className="op-metric">
                <span className="op-metric-k">II</span>
                <span className="op-metric-v">{fmt(run.instability, 1)}</span>
              </div>
              <div className="op-metric">
                <span className="op-metric-k">Aromaticidad</span>
                <span className="op-metric-v">{fmt(run.aromaticity, 3)}</span>
              </div>
              <div className="op-metric">
                <span className="op-metric-k">MW</span>
                <span className="op-metric-v">{fmt(run.mw_kda, 2)} kDa</span>
              </div>
            </div>
            <code className="ablacion-info-seq">{run.binder}</code>
            <p className="ablacion-info-note">
              <span className="ablacion-chip target" /> objetivo (PD-1) ·{" "}
              <span className="ablacion-chip binder" /> binder diseñado
            </p>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
