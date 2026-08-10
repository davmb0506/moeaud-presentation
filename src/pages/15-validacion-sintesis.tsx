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

type StageMeta = {
  /** Qué hace el filtro (siempre visible en la tarjeta). */
  does: string;
  /** Umbral / regla (visible en la tarjeta y resaltado al avanzar). */
  criterion: string;
};

const raw = shortlistData as {
  default_panel?: PanelId;
  panels?: Record<string, Panel>;
  funnel?: FunnelNode[];
};

export const GOUDY_MAX_STEP = 5;

function stageMeta(panelId: PanelId, index: number): StageMeta {
  const isMoea = panelId === "moea_pool1208";
  const stages: StageMeta[] = [
    {
      does: isMoea
        ? "Frentes no dominados agregados"
        : "Última generación",
      criterion: isMoea
        ? "6 grupos MOEA, sin umbral aún"
        : "Sin umbral de energía ni secuencia",
    },
    {
      does: "Energía Rosetta del complejo",
      criterion: "Relajación correcta del complejo AF2",
    },
    {
      does: "Ranking por energía de interfaz",
      criterion: "dG/dSASA × 100; se conservan los 100 mejores",
    },
    isMoea
      ? {
          does: "Composición de secuencia y contacto con VEGFR-2",
          criterion:
            "Shannon ≥ 2.8 · GRAVY ∈ [−1.5, 1.5] · epítopo ≥ 0.20",
        }
      : {
          does: "Composición de secuencia",
          criterion: "A+L ≤ 0.45 · Ala ≤ 0.40 · A+Q ≤ 0.55",
        },
    isMoea
      ? {
          does: "Acuerdo AF2–OmegaFold y diversidad",
          criterion: "RMSD < 5 Å · < 3 Å · ≤ 3/grupo · id. ≤ 0.70",
        }
      : {
          does: "Acuerdo AF2–OmegaFold",
          criterion: "RMSD < 5 Å · < 3 Å",
        },
  ];
  return stages[index] ?? stages[0];
}

function exitsFromFunnel(funnel: FunnelNode[]) {
  const nums = funnel.map((n) => Number(n.value));
  if (nums.length < 2 || nums.some((n) => Number.isNaN(n))) return [];
  return nums.slice(0, -1).map((n, i) => String(-(n - nums[i + 1])));
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
    return [
      { label: "Conjunto inicial", value: "—", note: "" },
      { label: "Energía Rosetta", value: "…", note: "" },
      { label: "100 mejores", value: "…", note: "" },
      { label: "Control de calidad", value: "…", note: "" },
      { label: "Selección final", value: "…", note: "" },
    ];
  }, [panel]);

  const exits = exitsFromFunnel(
    funnel.filter((n) => !Number.isNaN(Number(n.value)))
  );

  const pending = panel?.status === "pending";
  const explaining = step >= 1;
  const activeIdx = explaining ? Math.min(step - 1, funnel.length - 1) : -1;
  const activeMeta = explaining ? stageMeta(panelId, activeIdx) : null;
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
      <h2 className="validacion-title">Cribado computacional</h2>
      <p className="validacion-sub">
        Cada etapa filtra con un criterio distinto; no se estima afinidad
        experimental.
      </p>

      <div className="dockstory-case-controls" style={{ marginBottom: 10, gap: 8 }}>
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

      <section className="validacion-card vflow-rail-card">
        <div className="vflow-main vflow-main-filled">
          {funnel.map((node, index) => {
            const isActive = index === activeIdx;
            const dimmed = explaining && !isActive;
            const meta = stageMeta(panelId, index);
            const dropped = exits[index];
            return (
              <div
                key={`${panelId}-${node.label}`}
                className="vflow-main-fragment"
              >
                <article
                  className={`vflow-node vflow-node-filled${
                    isActive ? " is-active" : ""
                  }${dimmed ? " is-dimmed" : ""}`}
                >
                  <span className="vflow-node-label">{node.label}</span>
                  <strong className="vflow-node-value">
                    {String(node.value)}
                  </strong>
                  <p className="vflow-node-does">{meta.does}</p>
                  <p className="vflow-node-rule">{meta.criterion}</p>
                  {dropped != null ? (
                    <span className="vflow-node-drop">salen {dropped}</span>
                  ) : null}
                </article>
                {index < funnel.length - 1 ? (
                  <span className="vflow-connector" aria-hidden />
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <AnimatePresence mode="wait">
        {activeMeta ? (
          <motion.div
            key={`${panelId}-${step}`}
            className="vflow-detail-bar validacion-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="vflow-explain-kicker">
              Fase {step} / {GOUDY_MAX_STEP}
            </span>
            <strong className="vflow-detail-title">
              {funnel[activeIdx]?.label}
            </strong>
            <span className="vflow-detail-does">{activeMeta.does}</span>
            <span className="vflow-detail-rule">{activeMeta.criterion}</span>
            {delta ? (
              <span className="vflow-detail-delta">salen {delta}</span>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
