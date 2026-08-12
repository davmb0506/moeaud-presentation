import { motion, type Variants } from "framer-motion";
import { ComplexViewer } from "../components/ComplexViewer";
import {
  CHAR_LABELS,
  fmtChar,
  fmtSignedChar,
  gravyTrait,
  stabilityTrait,
} from "../components/DesignCharacterization";
import hapd1Data from "../data/hapd1Variantes.json";
import shortlistData from "../data/shortlistGoudy.json";

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
  binder?: string | null;
  gravy?: number | null;
  charge?: number | null;
  instability?: number | null;
};

type Arm = {
  id: ArmId;
  label: string;
  color: string;
  runs: Run[];
};

type MetricKey = "score" | "plddt" | "iptm" | "pae_iface" | "if_contacts";

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
    key: "plddt",
    label: "pLDDT",
    digits: 1,
    higherBetter: true,
    why: "confianza del pliegue",
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

function bestCardFor(
  key: MetricKey,
  higherBetter: boolean,
  cards: { id: string; run: Run }[]
): string | null {
  let bestId: string | null = null;
  let bestVal: number | null = null;
  for (const { id, run } of cards) {
    const v = metricValue(run, key);
    if (v == null) continue;
    if (
      bestVal == null ||
      (higherBetter ? v > bestVal : v < bestVal)
    ) {
      bestVal = v;
      bestId = id;
    }
  }
  return bestId;
}

type HaPd1Candidate = {
  id: string;
  binder_seq: string;
  rmsd_A: number | null;
  omega_class: string;
  score_rosetta: number | null;
  overall_score: number | null;
  plddt_a: number | null;
  iptm: number | null;
  pae_iface: number | null;
  n_interface_res: number | null;
  pdb: string | null;
  gravy: number | null;
  charge: number | null;
  instability: number | null;
  mw_kda: number | null;
  pI: number | null;
};

const HAPD1_PANEL = (shortlistData as any).panels?.hapd1_mono60;
const HAPD1_CANDIDATES: HaPd1Candidate[] = HAPD1_PANEL?.candidates ?? [];
const HAPD1_BEST = HAPD1_CANDIDATES.length > 0
  ? HAPD1_CANDIDATES.reduce((a, b) => ((a.rmsd_A ?? 99) < (b.rmsd_A ?? 99) ? a : b))
  : null;

const VALIDATED_RUN: Run | null = HAPD1_BEST
  ? {
      id: HAPD1_BEST.id,
      arm: "temp" as ArmId,
      score: HAPD1_BEST.overall_score ?? 0,
      plddt: HAPD1_BEST.plddt_a,
      iptm: HAPD1_BEST.iptm,
      pae_iface: HAPD1_BEST.pae_iface,
      if_contacts: HAPD1_BEST.n_interface_res,
      pdb: HAPD1_BEST.pdb,
      binder: HAPD1_BEST.binder_seq,
      gravy: HAPD1_BEST.gravy,
      charge: HAPD1_BEST.charge,
      instability: HAPD1_BEST.instability,
    }
  : null;

const COMPARE_CARDS: { id: string; run: Run }[] = [
  ...REPS.map(({ arm, run }) => ({ id: arm.id, run })),
  ...(VALIDATED_RUN ? [{ id: "validated", run: VALIDATED_RUN }] : []),
];

const BEST_BY_METRIC = Object.fromEntries(
  METRICS.map((m) => [m.key, bestCardFor(m.key, m.higherBetter, COMPARE_CARDS)])
) as Record<MetricKey, string | null>;

function MetricsBlock({
  run,
  cardId,
}: {
  run: Run;
  cardId: string;
}) {
  return (
    <dl className="hapd1rep-metrics">
      {METRICS.map((m) => {
        const v = metricValue(run, m.key);
        const isBest = BEST_BY_METRIC[m.key] === cardId;
        return (
          <div key={m.key} className={isBest ? "is-best" : undefined} title={m.why}>
            <dt>{m.label}</dt>
            <dd>{fmt(v, m.digits, m.unit)}</dd>
          </div>
        );
      })}
    </dl>
  );
}

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
        {REPS.map(({ arm, run }) => {
          const gravy = gravyTrait(run.gravy);
          const stability = stabilityTrait(run.instability);
          return (
            <article key={arm.id} className="hapd1rep-card">
              <header className="hapd1rep-head">
                <span className="hapd1rep-tag" style={{ color: arm.color }}>
                  {arm.label}
                </span>
              </header>

              <div className="hapd1rep-viewer">
                <ComplexViewer pdbUrl={run.pdb} referenceUrl={run.pdb} />
              </div>

              <MetricsBlock run={run} cardId={arm.id} />

              <dl className="hapd1rep-char">
                <div>
                  <dt>{CHAR_LABELS.gravy}</dt>
                  <dd>
                    {fmtChar(run.gravy, 2)}
                    <span className={`hapd1rep-trait is-${gravy.tone}`}>
                      {gravy.label}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>{CHAR_LABELS.charge}</dt>
                  <dd>{fmtSignedChar(run.charge, 1)}</dd>
                </div>
                <div>
                  <dt>{CHAR_LABELS.instability}</dt>
                  <dd>
                    {fmtChar(run.instability, 1)}
                    <span className={`hapd1rep-trait is-${stability.tone}`}>
                      {stability.label}
                    </span>
                  </dd>
                </div>
              </dl>

              {run.binder ? (
                <code className="hapd1rep-seq">{run.binder}</code>
              ) : null}
            </article>
          );
        })}

        {VALIDATED_RUN && (() => {
          const run = VALIDATED_RUN;
          const gravy = gravyTrait(run.gravy);
          const stability = stabilityTrait(run.instability);
          const armColor = ARMS.find((a) => a.id === "temp")?.color ?? "#ea580c";
          return (
            <article className="hapd1rep-card hapd1rep-card--validated">
              <header className="hapd1rep-head">
                <span className="hapd1rep-tag" style={{ color: armColor }}>
                  AID validado
                </span>
              </header>

              <div className="hapd1rep-viewer">
                <ComplexViewer pdbUrl={run.pdb} referenceUrl={run.pdb} />
              </div>

              <MetricsBlock run={run} cardId="validated" />

              <dl className="hapd1rep-char">
                <div>
                  <dt>{CHAR_LABELS.gravy}</dt>
                  <dd>
                    {fmtChar(run.gravy, 2)}
                    <span className={`hapd1rep-trait is-${gravy.tone}`}>
                      {gravy.label}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>{CHAR_LABELS.charge}</dt>
                  <dd>{fmtSignedChar(run.charge, 1)}</dd>
                </div>
                <div>
                  <dt>{CHAR_LABELS.instability}</dt>
                  <dd>
                    {fmtChar(run.instability, 1)}
                    <span className={`hapd1rep-trait is-${stability.tone}`}>
                      {stability.label}
                    </span>
                  </dd>
                </div>
              </dl>

              <code className="hapd1rep-seq">{run.binder}</code>
            </article>
          );
        })()}
      </div>
    </motion.div>
  );
}
