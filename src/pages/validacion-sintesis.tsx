import { useMemo, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import shortlistData from "../data/shortlistGoudy.json";

const fade: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

type PanelId = "moea_pool1208" | "hapd1_mono60";

type FunnelNode = { label: string; value: number | string; note: string };

type Panel = {
  id: string;
  label: string;
  target: string;
  status: string;
  funnel: FunnelNode[] | null;
  total: number;
  groups_total: number;
  diversity_label: string;
  protocol?: string;
  protocol_label?: string;
  note?: string | null;
};

type PhaseExplain = {
  title: string;
  bullets: string[];
};

const raw = shortlistData as {
  default_panel?: PanelId;
  panels?: Record<string, Panel>;
  funnel?: FunnelNode[];
};

export const GOUDY_MAX_STEP = 5;

const FALLBACK_MOEA: FunnelNode[] = [
  {
    label: "Pool inicial",
    value: "1208",
    note: "Diseños no dominados de los 6 grupos; aún sin filtro",
  },
  {
    label: "Energía Rosetta",
    value: "1049",
    note: "Completan la relajación Rosetta; sin corte por energía",
  },
  {
    label: "Top 100",
    value: "100",
    note: "Conserva los 100 de mejor energía de interfaz",
  },
  {
    label: "Control de calidad",
    value: "90",
    note: "Filtra composición extrema y baja cobertura del epítopo",
  },
  {
    label: "Selección final",
    value: "10",
    note: "OmegaFold confirma el pliegue; a lo sumo 3 por grupo",
  },
];

function exitsFromFunnel(funnel: FunnelNode[]) {
  const nums = funnel.map((n) => Number(n.value));
  if (nums.length < 2 || nums.some((n) => Number.isNaN(n))) return [];
  const out: { label: string; note: string }[] = [];
  for (let i = 0; i < nums.length - 1; i++) {
    const dropped = nums[i] - nums[i + 1];
    out.push({
      label: String(-dropped),
      note: `no pasan a «${funnel[i + 1].label}»`,
    });
  }
  return out;
}

function phaseCopy(panelId: PanelId, phase: number): PhaseExplain | null {
  if (phase < 1 || phase > GOUDY_MAX_STEP) return null;
  const isMoea = panelId === "moea_pool1208";
  const phases: PhaseExplain[] = [
    {
      title: "Pool inicial",
      bullets: [
        isMoea
          ? "Partida: frentes de Pareto de los 6 grupos MOEA. Sin umbral numérico."
          : "Partida: diseños de la última iteración (3 brazos × 10 runs). Sin umbral numérico.",
        "Solo define el conjunto de entrada al cribado ortogonal.",
      ],
    },
    {
      title: "Energía Rosetta",
      bullets: [
        "1× FastRelax + InterfaceAnalyzer (modelo distinto a AlphaFold).",
        "Umbral: status = OK (completa la relajación). No hay corte sobre dG/dSASA aquí.",
      ],
    },
    {
      title: "Top 100",
      bullets: [
        "Se ordenan por dG_separated / dSASA × 100 (energía de interfaz normalizada).",
        "Se conservan solo los 100 mejores.",
      ],
    },
    isMoea
      ? {
          title: "Control de calidad (QC)",
          bullets: [
            "QC = filtros sobre la secuencia y el sitio de unión, aplicados al top 100.",
            "Shannon ≥ 2.8, GRAVY ∈ [−1.5, 1.5], A+L ≤ 0.50, Ala ≤ 0.45, epítopo VEGFR-2 ≥ 0.20.",
          ],
        }
      : {
          title: "Control de calidad (QC)",
          bullets: [
            "QC = filtros que descartan secuencias degeneradas (protocolo paper).",
            "A+L ≤ 0.45, Ala ≤ 0.40, A+Q ≤ 0.55.",
          ],
        },
    isMoea
      ? {
          title: "Selección final",
          bullets: [
            "OmegaFold (otro plegador): RMSD del binder vs AF2 — pass < 3 Å; soft < 5 Å.",
            "Diversidad: ≤ 3 por grupo e identidad de secuencia ≤ 0.70.",
          ],
        }
      : {
          title: "Selección final",
          bullets: [
            "OmegaFold (otro plegador): RMSD del binder vs AF2 — pass < 3 Å; soft < 5 Å.",
            "Entran todos los que pasan soft ∩ QC.",
          ],
        },
  ];
  return phases[phase - 1];
}

export function ValidacionSintesis({
  step = 0,
  onStepChange,
}: {
  step?: number;
  onStepChange?: (next: number) => void;
}) {
  const panels = (raw.panels ?? {}) as Record<PanelId, Panel>;
  const ids = (Object.keys(panels) as PanelId[]).length
    ? (Object.keys(panels) as PanelId[])
    : (["moea_pool1208"] as PanelId[]);
  const [panelId, setPanelId] = useState<PanelId>(
    raw.default_panel ?? "moea_pool1208"
  );
  const panel = panels[panelId];

  const funnel: FunnelNode[] = useMemo(() => {
    if (panel?.funnel?.length) return panel.funnel;
    if (panelId === "moea_pool1208") return FALLBACK_MOEA;
    return [
      {
        label: "Pool inicial",
        value: "—",
        note: "Última generación de los 3 brazos; aún sin filtro",
      },
      {
        label: "Energía Rosetta",
        value: "…",
        note: "Completan la relajación Rosetta; sin corte por energía",
      },
      {
        label: "Top 100",
        value: "…",
        note: "Conserva los 100 de mejor energía de interfaz",
      },
      {
        label: "Control de calidad",
        value: "…",
        note: "Descarta secuencias degeneradas en Ala, Leu y Gln",
      },
      {
        label: "Selección final",
        value: "…",
        note: "OmegaFold confirma el pliegue a <5 Å del modelo AF2",
      },
    ];
  }, [panel, panelId]);

  const exits = exitsFromFunnel(
    funnel.filter((n) => !Number.isNaN(Number(n.value)))
  );

  const pending = panel?.status === "pending";
  const explaining = step >= 1;
  const activeIdx = explaining ? Math.min(step - 1, funnel.length - 1) : -1;
  const explain = phaseCopy(panelId, step);
  const delta =
    explaining && step >= 2 && exits[step - 2] ? exits[step - 2] : null;

  const selectPanel = (id: PanelId) => {
    setPanelId(id);
    onStepChange?.(0);
  };

  return (
    <motion.div
      className={`validacion vflow-slide vflow-slide-compact${
        explaining ? " vflow-explaining" : ""
      }`}
      variants={fade}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.2 }}
    >
      <h2 className="validacion-title">Filtro: cribado ortogonal in silico</h2>
      <p className="validacion-sub">
        Cinco pasos con umbrales explícitos. QC = control de calidad de la
        secuencia (y del epítopo en VEGF-A). Rosetta y OmegaFold son
        independientes de AlphaFold; no se estima afinidad experimental.
      </p>

      <div className="dockstory-case-controls" style={{ marginBottom: 14, gap: 8 }}>
        {ids.map((id) => (
          <button
            key={id}
            type="button"
            className="dockstory-case-nav-btn"
            onClick={() => selectPanel(id)}
            style={{
              opacity: id === panelId ? 1 : 0.55,
              fontWeight: id === panelId ? 700 : 400,
            }}
          >
            {panels[id]?.label ?? id}
            {panels[id]?.status === "pending" ? " (…)" : ""}
          </button>
        ))}
      </div>

      {pending ? (
        <p className="validacion-sub">{panel?.note ?? "Filtro en curso…"}</p>
      ) : null}

      <div className={`vflow-explain-layout${explaining ? " is-split" : ""}`}>
        <motion.div
          className="vflow-explain-flow"
          layout
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <section className="validacion-card vflow-rail-card">
            <div className={`vflow-main${explaining ? " vflow-main-compact" : ""}`}>
              {funnel.map((node, index) => {
                const isActive = index === activeIdx;
                const dimmed = explaining && !isActive;
                return (
                  <div
                    key={`${panelId}-${node.label}`}
                    className="vflow-main-fragment"
                  >
                    <article
                      className={`vflow-node${isActive ? " is-active" : ""}${
                        dimmed ? " is-dimmed" : ""
                      }`}
                    >
                      <span className="vflow-node-label">{node.label}</span>
                      <strong className="vflow-node-value">
                        {String(node.value)}
                      </strong>
                      <p className="vflow-node-note">{node.note}</p>
                    </article>
                    {index < funnel.length - 1 ? (
                      <span className="vflow-connector" />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          {exits.length > 0 ? (
            <div className={`vdeck-strip${explaining ? " vdeck-strip-compact" : ""}`}>
              {exits.map((item, index) => {
                const highlight = explaining && step >= 2 && index === step - 2;
                return (
                  <article
                    key={item.label + item.note}
                    className={`validacion-card vdeck-stat${
                      highlight ? " is-active" : ""
                    }${explaining && !highlight ? " is-dimmed" : ""}`}
                  >
                    <span className="vdeck-stat-label">salen</span>
                    <strong className="vdeck-stat-value">{item.label}</strong>
                    <p className="vdeck-stat-note">{item.note}</p>
                  </article>
                );
              })}
            </div>
          ) : null}
        </motion.div>

        <AnimatePresence mode="wait">
          {explain ? (
            <motion.aside
              key={`${panelId}-${step}`}
              className="vflow-explain-panel validacion-card"
              initial={{ opacity: 0, x: 36 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="vflow-explain-kicker">
                Fase {step} / {GOUDY_MAX_STEP}
              </span>
              <h3 className="vflow-explain-title">{explain.title}</h3>
              <ul className="vflow-explain-list">
                {explain.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              {delta ? (
                <p className="vflow-explain-delta">
                  <span>salen</span> {delta.label}{" "}
                  <em>{delta.note}</em>
                </p>
              ) : null}
              <p className="vflow-explain-hint">
                → avanza la fase · ← regresa
              </p>
            </motion.aside>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
