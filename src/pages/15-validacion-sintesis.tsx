import { useMemo } from "react";
import { motion, type Variants } from "framer-motion";
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

type FlowNode = {
  id: string;
  title: string;
  blurb?: string;
  subtitle?: string;
  bullets?: readonly string[];
  badge?: string | number;
  kind?: "start" | "step" | "qc" | "end";
};

const raw = shortlistData as {
  default_panel?: PanelId;
  panels?: Record<string, Panel>;
  funnel?: FunnelNode[];
};

export const GOUDY_MAX_STEP = 5;

function flowForPanel(panelId: PanelId, funnel: FunnelNode[]): FlowNode[] {
  const v = (i: number) => funnel[i]?.value ?? "—";
  const isMoea = panelId === "moea_pool1208";

  return [
    { id: "start", title: "Inicio", kind: "start" },
    {
      id: "pool",
      title: isMoea
        ? "Secuencias del frente agregado"
        : "Última generación",
      blurb: isMoea
        ? "Entran las no dominadas de los 6 grupos."
        : "Entra la última generación de cada brazo EvoPro.",
      badge: v(0),
      kind: "step",
    },
    {
      id: "rosetta",
      title: "Energía de Rosetta",
      blurb:
        "Rosetta mueve átomos para bajar la energía del complejo; si esa minimización no termina, la secuencia se descarta.",
      badge: v(1),
      kind: "step",
    },
    {
      id: "top100",
      title: "Rankear top 100",
      blurb: "Se queda con las 100 de menor energía de interfaz (dG/dSASA).",
      badge: v(2),
      kind: "step",
    },
    {
      id: "qc",
      title: "Control de calidad",
      blurb: isMoea
        ? "Entropía de Shannon para sesgos composicionales + ≥20 % cobertura del epítopo VEGFR-2."
        : "Corta sesgos de composición (Ala, Leu, Gln) del protocolo de Goudy.",
      badge: v(3),
      kind: "qc",
    },
    {
      id: "reprod",
      title: "Repredicción OmegaFold",
      blurb: isMoea
        ? "Pide que la forma del péptido coincida en complejo y solo (RMSD < 5 Å)."
        : "Pide que la forma del péptido coincida en complejo y solo (RMSD < 5 Å).",
      subtitle: "RMSD < 5 Å",
      badge: v(4),
      kind: "end",
    },
  ];
}

/** Índices del flowchart que se narran con teclas (sin “Inicio”). */
const NARRATED = [1, 2, 3, 4, 5] as const;

export function ValidacionSintesis({
  step = 0,
}: {
  step?: number;
  onStepChange?: (next: number) => void;
}) {
  const panelId: PanelId = "moea_pool1208";
  const panels = (raw.panels ?? {}) as Record<PanelId, Panel>;
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

  const nodes = useMemo(
    () => flowForPanel(panelId, funnel),
    [panelId, funnel]
  );

  const pending = panel?.status === "pending";
  const explaining = step >= 1;
  const activeFlowIdx = explaining
    ? NARRATED[Math.min(step - 1, NARRATED.length - 1)]
    : -1;

  return (
    <motion.div
      className={`validacion vflow-slide cflow-slide${
        explaining ? " is-explaining" : ""
      }`}
      variants={fade}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.2 }}
    >
      <h2 className="validacion-title">Cribado computacional</h2>

      {pending ? (
        <p className="validacion-sub">{panel?.note ?? "Filtro en curso…"}</p>
      ) : null}

      <ol className="cflow" aria-label="Diagrama de flujo del cribado">
        {nodes.map((node, index) => {
          const isActive = index === activeFlowIdx;
          const dimmed = explaining && !isActive && node.kind !== "start";
          const showArrow = index < nodes.length - 1;

          return (
            <li
              key={`${panelId}-${node.id}`}
              className={[
                "cflow-item",
                node.kind ? `cflow-item--${node.kind}` : "",
                isActive ? "is-active" : "",
                dimmed ? "is-dimmed" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <article className="cflow-node">
                {node.kind === "start" ? (
                  <span className="cflow-start-label">{node.title}</span>
                ) : (
                  <>
                    <div className="cflow-node-top">
                      <h3 className="cflow-node-title">{node.title}</h3>
                      {node.badge != null ? (
                        <span className="cflow-badge">{node.badge}</span>
                      ) : null}
                    </div>
                    {node.blurb ? (
                      <p className="cflow-blurb">{node.blurb}</p>
                    ) : null}
                    {node.bullets ? (
                      <ul className="cflow-bullets">
                        {node.bullets.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    ) : null}
                    {node.subtitle ? (
                      <p className="cflow-criterion">{node.subtitle}</p>
                    ) : null}
                  </>
                )}
              </article>

              {showArrow ? (
                <div className="cflow-arrow" aria-hidden>
                  <span className="cflow-arrow-line" />
                  <span className="cflow-arrow-head" />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </motion.div>
  );
}
