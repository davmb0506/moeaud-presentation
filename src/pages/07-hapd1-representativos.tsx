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

type ArmId = "mutation" | "base" | "temp";

type Run = {
  id: string;
  arm: ArmId;
  score: number;
  plddt: number | null;
  iptm: number | null;
  pae_iface: number | null;
  if_contacts: number | null;
  pdb: string | null;
};

type Arm = {
  id: ArmId;
  label: string;
  color: string;
  runs: Run[];
};

type MetricKey = "score" | "iptm" | "pae_iface" | "if_contacts";

const ARMS = hapd1Data.arms as Arm[];
const ARM_ORDER: ArmId[] = ["mutation", "base", "temp"];

/** Mejor aptitud con contactos de interfaz (>0), para comparar binderes reales. */
function pickRepresentative(arm: Arm): Run {
  const ranked = [...arm.runs]
    .filter((r) => r.pdb)
    .sort((a, b) => a.score - b.score);
  return (
    ranked.find((r) => (r.if_contacts ?? 0) > 0) ??
    ranked[0] ??
    arm.runs[0]
  );
}

const REPS = ARM_ORDER.map((id) => {
  const arm = ARMS.find((a) => a.id === id)!;
  return { arm, run: pickRepresentative(arm) };
});

/** Aptitud y PAE: menor = mejor. ipTM y contactos: mayor = mejor. */
const METRICS: {
  key: MetricKey;
  label: string;
  unit?: string;
  digits: number;
  higherBetter: boolean;
  why: string;
}[] = [
  {
    key: "score",
    label: "Aptitud",
    digits: 1,
    higherBetter: false,
    why: "objetivo optimizado",
  },
  {
    key: "iptm",
    label: "ipTM",
    digits: 3,
    higherBetter: true,
    why: "confianza de interfaz",
  },
  {
    key: "pae_iface",
    label: "PAE iface",
    unit: "Å",
    digits: 1,
    higherBetter: false,
    why: "error de pose",
  },
  {
    key: "if_contacts",
    label: "Contactos",
    digits: 0,
    higherBetter: true,
    why: "empaque en la IF",
  },
];

function metricValue(run: Run, key: MetricKey): number | null {
  const v = run[key];
  return v == null || Number.isNaN(v) ? null : v;
}

function fmt(v: number | null, digits: number, unit?: string) {
  if (v == null) return "—";
  const s = digits === 0 ? String(Math.round(v)) : v.toFixed(digits);
  return unit ? `${s} ${unit}` : s;
}

function bestArmFor(key: MetricKey, higherBetter: boolean): ArmId | null {
  let bestId: ArmId | null = null;
  let bestVal: number | null = null;
  for (const { arm, run } of REPS) {
    const v = metricValue(run, key);
    if (v == null) continue;
    if (
      bestVal == null ||
      (higherBetter ? v > bestVal : v < bestVal)
    ) {
      bestVal = v;
      bestId = arm.id;
    }
  }
  return bestId;
}

const BEST_BY_METRIC = Object.fromEntries(
  METRICS.map((m) => [m.key, bestArmFor(m.key, m.higherBetter)])
) as Record<MetricKey, ArmId | null>;

export function Hapd1Representativos() {
  return (
    <motion.div
      className="hapd1rep"
      variants={fade}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.12 }}
    >
      <h2 className="hapd1rep-title">
        Soluciones representativas por variante (HA-PD1)
      </h2>

      <div className="hapd1rep-grid">
        {REPS.map(({ arm, run }) => (
          <article key={arm.id} className="hapd1rep-card">
            <header className="hapd1rep-head">
              <span className="hapd1rep-tag" style={{ color: arm.color }}>
                {arm.label}
              </span>
            </header>

            <div className="hapd1rep-viewer">
              <ComplexViewer pdbUrl={run.pdb} referenceUrl={run.pdb} />
            </div>

            <dl className="hapd1rep-metrics">
              {METRICS.map((m) => {
                const v = metricValue(run, m.key);
                const isBest = BEST_BY_METRIC[m.key] === arm.id;
                return (
                  <div
                    key={m.key}
                    className={isBest ? "is-best" : undefined}
                    title={m.why}
                  >
                    <dt>{m.label}</dt>
                    <dd style={isBest ? { color: arm.color } : undefined}>
                      {fmt(v, m.digits, m.unit)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </article>
        ))}
      </div>
    </motion.div>
  );
}
