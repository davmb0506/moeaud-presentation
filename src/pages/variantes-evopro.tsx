import { useMemo, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { ComplexViewer } from "../components/ComplexViewer";
import opData from "../data/operadoresData.json";
import tempVariableBoxplotMapping from "../data/tempVariableBoxplotMapping.json";
import variantData from "../data/variantComparison.json";

const fade: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

type CurvePoint = {
  gen: number;
  mean: number;
};

type VariantDatum = {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  budget: string;
  values: number[];
  curve: CurvePoint[];
};

type VariantId = "base" | "both" | "temp";

type VariantGroup = {
  id: VariantId;
  label: string;
  color: string;
  values: number[];
  summaryLabel: string;
};

type BoxStats = {
  min: number;
  max: number;
  q1: number;
  med: number;
  q3: number;
};

type ViewerSol = {
  id: string;
  group: "base" | "both";
  score: number;
  plddt: number;
  iptm: number;
  contact: number;
  binder: string;
  pdb: string;
};

type ViewerPoint = {
  key: string;
  group: "base" | "both";
  x: number;
  y: number;
  sol: ViewerSol;
};

type TempPlotPoint = {
  key: string;
  x: number;
  y: number;
  run: TempVariableRun;
};

type TempVariableRunRaw = {
  id: string;
  generation_budget: number;
  score: number;
  binder: string;
  iptm: number | null;
  plddt: number | null;
  contact: number | null;
  interface_pae: number | null;
  pdb: string | null;
};

type ViewerMode = "ops" | "temp";

type TempVariableRun = TempVariableRunRaw & {
  viewerPdbUrl: string | null;
};

type TempVariableMapping = {
  temp_variable_runs: TempVariableRunRaw[];
};

const RAW_VARIANTS = variantData.variants as VariantDatum[];

function getVariant(id: VariantId) {
  const variant = RAW_VARIANTS.find((item) => item.id === id);
  if (!variant) {
    throw new Error(`No se encontró la variante ${id} en variantComparison.json`);
  }
  return variant;
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function std(values: number[]) {
  const avg = mean(values);
  return Math.sqrt(
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) /
      (values.length - 1)
  );
}

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

const BASE_SOURCE = getVariant("base");
const BOTH_SOURCE = getVariant("both");
const TEMP_SOURCE = getVariant("temp");
const TEMP_MAPPING = tempVariableBoxplotMapping as TempVariableMapping;
const TEMP_RUNS: TempVariableRun[] = TEMP_MAPPING.temp_variable_runs.map((run) => ({
  ...run,
  viewerPdbUrl: toPublicPdbUrl(run.pdb),
}));
const TEMP_PLOT_VALUES = TEMP_RUNS.map((run) => run.score);
const TEMP_FINAL = {
  mean: mean(TEMP_PLOT_VALUES),
  sd: std(TEMP_PLOT_VALUES),
};

const GROUPS: VariantGroup[] = [
  {
    id: "base",
    label: "EvoPro base",
    color: BASE_SOURCE.color,
    values: BASE_SOURCE.values,
    summaryLabel: formatSummary(mean(BASE_SOURCE.values), std(BASE_SOURCE.values)),
  },
  {
    id: "both",
    label: "EvoPro both",
    color: BOTH_SOURCE.color,
    values: BOTH_SOURCE.values,
    summaryLabel: formatSummary(mean(BOTH_SOURCE.values), std(BOTH_SOURCE.values)),
  },
  {
    id: "temp",
    label: "Temp. variable",
    color: TEMP_SOURCE.color,
    values: TEMP_PLOT_VALUES,
    summaryLabel: formatSummary(TEMP_FINAL.mean, TEMP_FINAL.sd),
  },
];

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

const ALL_VALUES = [
  ...GROUPS.flatMap((group) => group.values),
  TEMP_FINAL.mean - TEMP_FINAL.sd,
  TEMP_FINAL.mean + TEMP_FINAL.sd,
];
const Y_MIN = Math.min(...ALL_VALUES);
const Y_MAX = Math.max(...ALL_VALUES);
const Y_MARGIN = (Y_MAX - Y_MIN) * 0.12;
const SCALE_MIN = Y_MIN - Y_MARGIN;
const SCALE_MAX = Y_MAX + Y_MARGIN;
const TICKS = niceTicks(SCALE_MIN, SCALE_MAX);

const sy = (value: number) =>
  PAD.top + ((SCALE_MAX - value) / (SCALE_MAX - SCALE_MIN)) * PH;

const BASE_SOLS = opData.base as ViewerSol[];
const BOTH_SOLS = opData.both as ViewerSol[];

const REF_SOL = BASE_SOLS.reduce(
  (best, sol) => (sol.score < best.score ? sol : best),
  BASE_SOLS[0]
);
const INITIAL_TEMP =
  TEMP_RUNS.filter((run) => run.viewerPdbUrl).reduce<TempVariableRun | null>(
    (best, run) => {
      if (!best) return run;
      return run.score < best.score ? run : best;
    },
    null
  ) ?? TEMP_RUNS[0];
const TEMP_REFERENCE_PDB = INITIAL_TEMP?.viewerPdbUrl ?? null;
const INITIAL_SOL = [...BASE_SOLS, ...BOTH_SOLS].reduce(
  (best, sol) => (sol.score < best.score ? sol : best),
  REF_SOL
);
const INITIAL_VIEWER_MODE: ViewerMode =
  INITIAL_TEMP && INITIAL_TEMP.score < INITIAL_SOL.score ? "temp" : "ops";

function buildViewerPoints(
  sols: ViewerSol[],
  cx: number,
  group: "base" | "both"
): ViewerPoint[] {
  return sols.map((sol, index) => ({
    key: sol.id,
    group,
    x: cx + jitter(index) * (BOX_W / 2 - 8),
    y: sy(sol.score),
    sol,
  }));
}

const VIEWER_POINTS: ViewerPoint[] = [
  ...buildViewerPoints(BASE_SOLS, XS[0], "base"),
  ...buildViewerPoints(BOTH_SOLS, XS[1], "both"),
];
const TEMP_VIEWER_POINTS: TempPlotPoint[] =
  TEMP_RUNS.length > 0
    ? TEMP_RUNS.map((run, index) => ({
        key: run.id,
        x: XS[2] + jitter(index) * (BOX_W / 2 - 8),
        y: sy(run.score),
        run,
      }))
    : [];
const TEMP_BOX_STATS = BOXES[2].stats;

const COND_COLOR: Record<ViewerPoint["group"], string> = {
  base: BASE_SOURCE.color,
  both: BOTH_SOURCE.color,
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

function finalMarkerPath(cx: number, cy: number) {
  return `M ${cx} ${cy - 7} L ${cx + 7} ${cy} L ${cx} ${cy + 7} L ${cx - 7} ${cy} Z`;
}

export function VariantesEvoPro() {
  const [pinnedId, setPinnedId] = useState<string>(() => {
    const point = VIEWER_POINTS.find((item) => item.sol.id === INITIAL_SOL.id);
    return point ? point.key : "";
  });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [tempPinnedKey, setTempPinnedKey] = useState<string>(INITIAL_TEMP?.id ?? "");
  const [tempHoverKey, setTempHoverKey] = useState<string | null>(null);
  const [viewerMode, setViewerMode] = useState<ViewerMode>(INITIAL_VIEWER_MODE);

  const activeKey = hoverId ?? pinnedId;
  const activePoint = useMemo(
    () => VIEWER_POINTS.find((point) => point.key === activeKey) ?? null,
    [activeKey]
  );
  const activeTempKey = tempHoverKey ?? tempPinnedKey;
  const sol = activePoint ? activePoint.sol : INITIAL_SOL;
  const tempPoint = useMemo(
    () => TEMP_VIEWER_POINTS.find((point) => point.key === activeTempKey) ?? null,
    [activeTempKey]
  );
  const tempRun = tempPoint?.run ?? INITIAL_TEMP ?? null;
  const viewerPdb =
    viewerMode === "ops" ? sol.pdb : (tempRun?.viewerPdbUrl ?? null);
  const viewerReference =
    viewerMode === "ops" ? REF_SOL.pdb : TEMP_REFERENCE_PDB;
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
      className="ablacion variant-slide"
      variants={fade}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.15 }}
    >
      <h2 className="ablacion-title">
        Comparación de variantes: EvoPro base, both y temperatura variable
      </h2>
      <p className="ablacion-sub">
        Comparación visual del mejor <strong>overall_score</strong> por
        variante.
      </p>

      <div className="ablacion-grid">
        <section className="ablacion-plot">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="ablacion-svg variant-svg"
            role="img"
            aria-label="Boxplots comparativos de EvoPro base, EvoPro both y temperatura variable"
            onMouseLeave={() => {
              setHoverId(null);
              setTempHoverKey(null);
            }}
          >
            <defs>
              <filter id="variant-temp-glow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <text x={PAD.left + PW / 2} y={20} className="op-sig" textAnchor="middle">
              Distribución del mejor overall_score por variante representativa
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
              Mejor overall_score (↓ mejor)
            </text>
            <text x={PAD.left + 5} y={PAD.top + PH - 7} className="abl-best">
              ↓ mejor
            </text>

            {BOXES.map((group, index) => (
              <Box key={group.id} data={group.values} cx={XS[index]} color={group.color} />
            ))}

            {VIEWER_POINTS.map((point) => {
              const isPinned = point.key === pinnedId;
              const isHover = point.key === hoverId;
              const highlighted = isPinned || isHover;
              return (
                <g key={point.key}>
                  {highlighted && (
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={9}
                      className={`abl-ring ${isPinned ? "pinned" : "hover"}`}
                      style={{ stroke: COND_COLOR[point.group] }}
                    />
                  )}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={highlighted ? 5.5 : 4}
                    className="abl-dot"
                    style={{ fill: COND_COLOR[point.group] }}
                    onMouseEnter={() => {
                      setViewerMode("ops");
                      setHoverId(point.key);
                    }}
                    onClick={() => {
                      setViewerMode("ops");
                      setPinnedId(point.key);
                    }}
                  />
                </g>
              );
            })}

            {TEMP_VIEWER_POINTS.map((point) => {
              const isPinned = point.key === tempPinnedKey;
              const isHover = point.key === tempHoverKey;
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
                      style={{ stroke: TEMP_SOURCE.color }}
                    />
                  )}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={highlighted ? 5.3 : 3.7}
                    className={`variant-static-dot${hasPdb ? "" : " no-pdb"}`}
                    style={{
                      stroke: TEMP_SOURCE.color,
                      cursor: hasPdb ? "pointer" : "default",
                    }}
                    onMouseEnter={
                      hasPdb
                        ? () => {
                            setViewerMode("temp");
                            setTempHoverKey(point.key);
                          }
                        : undefined
                    }
                    onClick={
                      hasPdb
                        ? () => {
                            setViewerMode("temp");
                            setTempPinnedKey(point.key);
                          }
                        : undefined
                    }
                  />
                  <title>
                    {`${point.run.id} · ${point.run.score.toFixed(3)}${
                      hasPdb ? "" : " · sin estructura disponible"
                    }`}
                  </title>
                </g>
              );
            })}

            <g>
              <circle
                cx={XS[2]}
                cy={sy(TEMP_FINAL.mean)}
                r={14}
                className="variant-final-halo"
                style={{ fill: TEMP_SOURCE.color }}
              />
              <line
                x1={XS[2]}
                y1={sy(TEMP_BOX_STATS.q1) + 4}
                x2={XS[2]}
                y2={sy(TEMP_FINAL.mean) - 12}
                className="variant-final-connector"
                style={{ stroke: TEMP_SOURCE.color }}
              />
              <line
                x1={XS[2]}
                y1={sy(TEMP_FINAL.mean + TEMP_FINAL.sd)}
                x2={XS[2]}
                y2={sy(TEMP_FINAL.mean - TEMP_FINAL.sd)}
                className="variant-final-whisker"
                style={{ stroke: TEMP_SOURCE.color }}
              />
              <line
                x1={XS[2] - 10}
                y1={sy(TEMP_FINAL.mean + TEMP_FINAL.sd)}
                x2={XS[2] + 10}
                y2={sy(TEMP_FINAL.mean + TEMP_FINAL.sd)}
                className="variant-final-whisker"
                style={{ stroke: TEMP_SOURCE.color }}
              />
              <line
                x1={XS[2] - 10}
                y1={sy(TEMP_FINAL.mean - TEMP_FINAL.sd)}
                x2={XS[2] + 10}
                y2={sy(TEMP_FINAL.mean - TEMP_FINAL.sd)}
                className="variant-final-whisker"
                style={{ stroke: TEMP_SOURCE.color }}
              />
              <path
                d={finalMarkerPath(XS[2], sy(TEMP_FINAL.mean))}
                className="variant-final-marker"
                style={{ fill: TEMP_SOURCE.color }}
                filter="url(#variant-temp-glow)"
              />
              
            </g>

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

        <section className="ablacion-viewer">
            <ComplexViewer pdbUrl={viewerPdb} referenceUrl={viewerReference} />

            <div className="ablacion-info">
              {viewerMode === "ops" ? (
                <>
                  <div className="ablacion-info-head">
                    <span
                      className="ablacion-info-tag"
                      style={{ background: COND_COLOR[sol.group] }}
                    >
                      {sol.group === "base" ? "EvoPro base" : "EvoPro both"}
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
                </>
              ) : (
                tempRun && (
                  <>
                    <div className="ablacion-info-head">
                      <span
                        className="ablacion-info-tag"
                        style={{ background: TEMP_SOURCE.color }}
                      >
                        Temp. variable
                      </span>
                    </div>
                    <div className="op-metrics">
                      <div className="op-metric">
                        <span className="op-metric-k">overall_score</span>
                        <span className="op-metric-v">{tempRun.score.toFixed(2)}</span>
                      </div>
                      <div className="op-metric">
                        <span className="op-metric-k">Gen. budget</span>
                        <span className="op-metric-v">
                          {tempRun.generation_budget}
                        </span>
                      </div>
                      <div className="op-metric">
                        <span className="op-metric-k">ipTM</span>
                        <span className="op-metric-v">
                          {tempRun.iptm === null ? "null" : tempRun.iptm.toFixed(2)}
                        </span>
                      </div>
                      <div className="op-metric">
                        <span className="op-metric-k">ContactScore</span>
                        <span className="op-metric-v">
                          {tempRun.contact === null ? "null" : tempRun.contact.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <code className="ablacion-info-seq">{tempRun.binder}</code>
                  </>
                )
              )}
              <p className="ablacion-info-note">
                <span className="ablacion-chip target" /> objetivo (VEGF-A) ·{" "}
                <span className="ablacion-chip binder" /> binder diseñado
              </p>
            </div>
        </section>
      </div>
    </motion.div>
  );
}
