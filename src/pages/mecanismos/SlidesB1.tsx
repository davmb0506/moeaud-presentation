import { useState } from "react";
import { motion } from "framer-motion";
import {
  FrontCanvas,
  frontPolyline,
  FRONT,
  HVCurve,
  STRATEGIES,
  BLUE,
  ORANGE,
  GREEN,
} from "./viz";

const WINDOW = 5; // stagnation_window por defecto

// ── Slide 4 — ¿Por qué inyectar diversidad? ────────────────────────────────
export function Slide4() {
  const [stag, setStag] = useState(0);
  const fired = stag >= WINDOW;

  return (
    <>
      <div className="mec-head">
        <span className="mec-kicker">Parte B · inyección de diversidad</span>
        <h2 className="mec-title">¿Por qué inyectar diversidad?</h2>
        <p className="mec-lead">
          Incluso con operadores adaptativos, la búsqueda puede{" "}
          <strong>estancarse</strong>: la población converge y el frente deja de
          crecer. El HV se aplana.
        </p>
      </div>

      <div className="mec-stage mec-two">
        <div className="mec-pane">
          <HVCurve progress={1} fireAt={fired ? 0.8 : null} />
          <div className="mec-roulette-row">
            <button
              type="button"
              className="mec-btn"
              onClick={() => setStag((s) => Math.min(WINDOW, s + 1))}
              disabled={fired}
            >
              Avanzar en la meseta
            </button>
            <button type="button" className="mec-btn ghost" onClick={() => setStag(0)}>
              Reiniciar
            </button>
            <span
              className="mec-chip"
              style={{ background: fired ? ORANGE : BLUE }}
            >
              estancamiento {stag}/{WINDOW}
            </span>
          </div>
        </div>

        <div className="mec-pane">
          <FrontCanvas ariaLabel="Frente que deja de extenderse">
            {({ sx, sy }) => (
              <>
                <polyline points={frontPolyline({ sx, sy })} className="mec-front" />
                {FRONT.map((p, i) => (
                  <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={4.5} fill={BLUE} />
                ))}
                {fired &&
                  [
                    { x: 0.05, y: 0.96 },
                    { x: 0.98, y: 0.12 },
                  ].map((p, i) => (
                    <motion.circle
                      key={`e${i}`}
                      cx={sx(p.x)}
                      cy={sy(p.y)}
                      r={5}
                      fill={ORANGE}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + i * 0.15 }}
                    />
                  ))}
              </>
            )}
          </FrontCanvas>
          <p className="mec-cap">
            {fired
              ? "Disparo: se reemplaza injection_fraction·N de la población por secuencias nuevas."
              : "El frente no se extiende; el archivo no gana hipervolumen."}
          </p>
        </div>
      </div>

      <p className="mec-note">
        La inyección se dispara cuando el HV no mejora durante{" "}
        <code>stagnation_window</code> generaciones <em>o</em> el archivo colapsa
        por debajo de un umbral de tamaño. Reemplaza parte de la población con
        secuencias orientadas a la <strong>causa</strong> específica del
        estancamiento.
      </p>
    </>
  );
}

// ── Slide 5 — 5 movimientos sobre el frente (índice) ───────────────────────
const MOVES: Record<string, { cap: string; tech: string }> = {
  refinement: {
    cap: "Intensifica la región del espacio de objetivos ya ocupada por la población.",
    tech: "consenso → ProteinMPNN a baja temperatura",
  },
  extreme: {
    cap: "Extiende el frente hacia sus extremos (un objetivo a la vez).",
    tech: "mejor solución del archivo en un objetivo → MPNN",
  },
  anti_consensus: {
    cap: "Reintroduce variabilidad en posiciones homogéneas (baja entropía).",
    tech: "entropía de Shannon · inyección directa (sin MPNN/AF2)",
  },
  gap_targeted: {
    cap: "Cubre regiones poco pobladas del frente (uniformidad).",
    tech: "mayor hueco entre no dominadas contiguas → MPNN",
  },
  random_walk: {
    cap: "Exploración amplia del espacio de secuencias.",
    tech: "miembro aleatorio del archivo → MPNN a temperatura alta",
  },
};

export function Slide5() {
  const [sel, setSel] = useState("refinement");
  const color = STRATEGIES.find((s) => s.key === sel)!.color;

  return (
    <>
      <div className="mec-head">
        <span className="mec-kicker">Parte B · inyección de diversidad</span>
        <h2 className="mec-title">5 movimientos sobre el frente</h2>
        <p className="mec-lead">
          Cada estrategia aborda una causa distinta de estancamiento. Haz clic
          para ver la región del frente que modifica.
        </p>
      </div>

      <div className="mec-stage mec-two">
        <div className="mec-pane">
          <FrontCanvas ariaLabel="Mapa de estrategias sobre el frente">
            {({ sx, sy }) => (
              <>
                <polyline points={frontPolyline({ sx, sy })} className="mec-front" />
                {FRONT.map((p, i) => (
                  <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={4} fill="#9fb3c8" />
                ))}

                {/* refinement: cluster mid-front */}
                {sel === "refinement" && (
                  <g>
                    <circle cx={sx(0.45)} cy={sy(0.36)} r={26} className="mec-halo" style={{ stroke: color }} />
                    {[
                      [0.42, 0.39],
                      [0.48, 0.34],
                      [0.45, 0.36],
                      [0.5, 0.38],
                    ].map(([x, y], i) => (
                      <motion.circle key={i} cx={sx(x)} cy={sy(y)} r={4} fill={color}
                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.06 }} />
                    ))}
                  </g>
                )}

                {/* extreme: tips */}
                {sel === "extreme" &&
                  [
                    [0.05, 0.96],
                    [0.98, 0.12],
                  ].map(([x, y], i) => (
                    <motion.circle key={i} cx={sx(x)} cy={sy(y)} r={7} fill={color}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.2 }} />
                  ))}

                {/* gap_targeted: bracket + new point */}
                {sel === "gap_targeted" && (
                  <g>
                    <line x1={sx(0.45)} y1={sy(0.36)} x2={sx(0.58)} y2={sy(0.28)}
                      className="mec-gap" style={{ stroke: color }} />
                    <motion.circle cx={sx(0.515)} cy={sy(0.32)} r={6} fill={color}
                      initial={{ scale: 0 }} animate={{ scale: 1 }} />
                  </g>
                )}

                {/* random_walk: jump to far region */}
                {sel === "random_walk" && (
                  <g>
                    <line x1={sx(0.58)} y1={sy(0.28)} x2={sx(0.86)} y2={sy(0.82)}
                      className="mec-jump" style={{ stroke: color }} />
                    <motion.circle cx={sx(0.86)} cy={sy(0.82)} r={6} fill={color}
                      initial={{ scale: 0 }} animate={{ scale: 1 }} />
                  </g>
                )}

                {/* anti_consensus: sequence-space badge */}
                {sel === "anti_consensus" && (
                  <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <rect x={sx(0.5)} y={sy(0.92)} width={120} height={34} rx={8}
                      fill="#fff" stroke={color} strokeWidth={1.5} />
                    <text x={sx(0.5) + 60} y={sy(0.92) + 21} textAnchor="middle"
                      className="mec-badge-tx" style={{ fill: color }}>
                      espacio de secuencias
                    </text>
                  </motion.g>
                )}
              </>
            )}
          </FrontCanvas>
        </div>

        <div className="mec-pane">
          <ul className="mec-movelist">
            {STRATEGIES.map((s) => (
              <li key={s.key}>
                <button
                  type="button"
                  className={"mec-move" + (sel === s.key ? " active" : "")}
                  style={sel === s.key ? { borderColor: s.color } : undefined}
                  onClick={() => setSel(s.key)}
                >
                  <span className="mec-move-dot" style={{ background: s.color }} />
                  <span className="mec-move-name">{s.label}</span>
                  <code className="mec-tech">{s.key}</code>
                </button>
              </li>
            ))}
          </ul>
          <motion.div key={sel} className="mec-move-detail" style={{ borderColor: color }}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <p>{MOVES[sel].cap}</p>
            <small className="mec-tech">{MOVES[sel].tech}</small>
          </motion.div>
        </div>
      </div>
    </>
  );
}

// ── Slide 6 — Refinamiento (intensificación) ───────────────────────────────
export function Slide6() {
  const [phase, setPhase] = useState(0); // 0 nube · 1 consenso · 2 variantes
  const CLOUD = [
    [0.32, 0.62], [0.4, 0.7], [0.46, 0.58], [0.38, 0.5], [0.52, 0.66],
    [0.44, 0.46], [0.5, 0.54], [0.36, 0.66], [0.48, 0.48], [0.42, 0.6],
  ];
  const CONS = [0.43, 0.57];
  const VARIANTS = [
    [0.4, 0.59], [0.46, 0.55], [0.44, 0.61], [0.41, 0.54], [0.47, 0.58],
  ];

  return (
    <>
      <div className="mec-head">
        <span className="mec-kicker">Parte B · refinamiento</span>
        <h2 className="mec-title">Refinamiento: intensificación local</h2>
        <p className="mec-lead">
          Construye la <strong>secuencia de consenso</strong> de la población y
          la usa como ancla para una búsqueda local con ProteinMPNN a{" "}
          <strong>baja temperatura</strong>. Intensifica la región ya ocupada.
        </p>
      </div>

      <div className="mec-stage">
        <FrontCanvas ariaLabel="Refinamiento alrededor del consenso">
          {({ sx, sy }) => (
            <>
              {/* nube de secuencias */}
              {phase === 0 &&
                CLOUD.map(([x, y], i) => (
                  <motion.circle key={i} cx={sx(x)} cy={sy(y)} r={4} fill="#9fb3c8"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} />
                ))}
              {/* colapso al consenso */}
              {phase === 1 &&
                CLOUD.map(([x, y], i) => (
                  <motion.circle key={i} fill={BLUE} r={4}
                    initial={{ cx: sx(x), cy: sy(y) }}
                    animate={{ cx: sx(CONS[0]), cy: sy(CONS[1]) }}
                    transition={{ duration: 0.7, ease: "easeInOut" }} />
                ))}
              {phase === 1 && (
                <text x={sx(CONS[0])} y={sy(CONS[1]) - 14} textAnchor="middle" className="mec-tag-tx">
                  consenso
                </text>
              )}
              {/* variantes locales */}
              {phase === 2 && (
                <>
                  <circle cx={sx(CONS[0])} cy={sy(CONS[1])} r={22} className="mec-halo" style={{ stroke: BLUE }} />
                  <circle cx={sx(CONS[0])} cy={sy(CONS[1])} r={5} fill={BLUE} />
                  {VARIANTS.map(([x, y], i) => (
                    <motion.circle key={i} cx={sx(x)} cy={sy(y)} r={3.5} fill={GREEN}
                      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.08 }} />
                  ))}
                </>
              )}
            </>
          )}
        </FrontCanvas>

        <div className="mec-roulette-row">
          <button type="button" className="mec-btn"
            onClick={() => setPhase((p) => (p + 1) % 3)}>
            {phase === 0 ? "Calcular consenso" : phase === 1 ? "Generar variantes" : "Reiniciar"}
          </button>
          <span className="mec-note inline">
            {phase === 0 ? "nube de secuencias de la población" : phase === 1 ? "secuencia de consenso" : "variantes locales (baja T)"}
          </span>
          <code className="mec-tech right">refinement</code>
        </div>
      </div>
    </>
  );
}

// ── Slide 7 — Exploración de extremos ──────────────────────────────────────
export function Slide7() {
  const [obj, setObj] = useState(0); // 0: f₁ · 1: f₂  (obj_dim = iter % m)

  return (
    <>
      <div className="mec-head">
        <span className="mec-kicker">Parte B · extremos</span>
        <h2 className="mec-title">Exploración de extremos</h2>
        <p className="mec-lead">
          Toma del archivo la solución con el <strong>mejor valor en un
          objetivo</strong> (alternando el objetivo entre eventos de inyección) y
          la usa como plantilla de ProteinMPNN para extender el frente hacia sus
          extremos.
        </p>
      </div>

      <div className="mec-stage">
        <FrontCanvas ariaLabel="Exploración de extremos del frente">
          {({ sx, sy }) => {
            const tip = obj === 0 ? { x: 0.1, y: 0.9 } : { x: 0.9, y: 0.18 };
            const ext = obj === 0 ? { x: 0.04, y: 0.97 } : { x: 0.98, y: 0.1 };
            return (
              <>
                <polyline points={frontPolyline({ sx, sy })} className="mec-front" />
                {FRONT.map((p, i) => (
                  <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={4} fill="#9fb3c8" />
                ))}
                <motion.circle cx={sx(tip.x)} cy={sy(tip.y)} r={20} className="mec-halo"
                  style={{ stroke: ORANGE }} animate={{ cx: sx(tip.x), cy: sy(tip.y) }} />
                <motion.circle r={6} fill={ORANGE}
                  animate={{ cx: sx(tip.x), cy: sy(tip.y) }} transition={{ duration: 0.5 }} />
                <motion.circle key={obj} cx={sx(ext.x)} cy={sy(ext.y)} r={5} fill={GREEN}
                  initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.25 }} />
                <text x={sx(tip.x)} y={sy(tip.y) + (obj === 0 ? -16 : 24)} textAnchor="middle" className="mec-tag-tx">
                  best_{obj === 0 ? "f₁" : "f₂"}
                </text>
              </>
            );
          }}
        </FrontCanvas>

        <div className="mec-roulette-row">
          <button type="button" className="mec-btn" onClick={() => setObj((o) => 1 - o)}>
            Alternar objetivo
          </button>
          <span className="mec-note inline">
            objetivo activo: <b>{obj === 0 ? "f₁" : "f₂"}</b> · <code>obj_dim = iter mod m</code>
          </span>
          <code className="mec-tech right">extreme</code>
        </div>
      </div>
    </>
  );
}
