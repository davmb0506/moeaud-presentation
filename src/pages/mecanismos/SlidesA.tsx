import { useState } from "react";
import { motion } from "framer-motion";
import { OPERATORS, ProportionBars, BLUE, ORANGE } from "./viz";
import { operatorUpdate, resetAfterInjection, sampleIndex } from "./helpers";

const INIT = [0.3, 0.25, 0.15, 0.15, 0.15];

// ── Slide 1 — Dos mecanismos, una señal: el hipervolumen ───────────────────
export function Slide1() {
  return (
    <>
      <div className="mec-head">
        <span className="mec-kicker">Mecanismos adaptativos de MOEA-UD</span>
        <h2 className="mec-title">Dos mecanismos, una señal: el hipervolumen</h2>
        <p className="mec-lead">
          MOEA-UD mantiene un <strong>archivo externo</strong> de soluciones no
          dominadas y mide su progreso con el <strong>hipervolumen (HV)</strong>.
          Dos mecanismos independientes ajustan la búsqueda <em>en línea</em>{" "}
          según la <strong>tendencia del HV</strong> —no son parámetros fijos.
        </p>
      </div>

      <div className="mec-stage mec-branch">
        <motion.div
          className="mec-node-hv"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Tendencia del <strong>HV del archivo</strong>
          <small>señal común de progreso (principio MIHPS)</small>
        </motion.div>

        <div className="mec-branch-arrows" aria-hidden>
          <span className="mec-arm armA" />
          <span className="mec-arm armB" />
        </div>

        <div className="mec-branch-cards">
          <motion.div
            className="mec-bcard"
            style={{ borderColor: BLUE }}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <span className="mec-btag" style={{ background: BLUE }}>
              A · operadores
            </span>
            <p>
              <strong>Proporciones de 5 operadores</strong> de variación. Cada{" "}
              <em>descendiente</em> muestrea su operador de esa distribución.
            </p>
            <small className="mec-when">continuo · cada generación</small>
          </motion.div>

          <motion.div
            className="mec-bcard"
            style={{ borderColor: ORANGE }}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <span className="mec-btag" style={{ background: ORANGE }}>
              B · inyección
            </span>
            <p>
              <strong>Estrategia de inyección de diversidad</strong> (cadena de
              Markov). Reemplaza parte de la población con secuencias nuevas.
            </p>
            <small className="mec-when">puntual · solo si hay estancamiento</small>
          </motion.div>
        </div>
      </div>
    </>
  );
}

// ── Slide 2 — 5 operadores, una ruleta ─────────────────────────────────────
export function Slide2() {
  const [tally, setTally] = useState<number[]>([0, 0, 0, 0, 0]);
  const [last, setLast] = useState<number | null>(null);
  const total = tally.reduce((a, b) => a + b, 0);

  const draw = () => {
    const idx = sampleIndex(INIT);
    setLast(idx);
    setTally((t) => t.map((v, i) => (i === idx ? v + 1 : v)));
  };

  return (
    <>
      <div className="mec-head">
        <span className="mec-kicker">Parte A · selección de operadores</span>
        <h2 className="mec-title">5 operadores, una ruleta</h2>
        <p className="mec-lead">
          El algoritmo mantiene un vector de <strong>proporciones</strong> sobre
          5 operadores. Cada descendiente muestrea su operador de forma
          independiente según esa distribución (no se usa uno fijo durante toda
          la corrida).
        </p>
      </div>

      <div className="mec-stage">
        <ProportionBars values={INIT} />

        <div className="mec-roulette-row">
          <button type="button" className="mec-btn" onClick={draw}>
            Generar descendiente
          </button>
          {last != null && (
            <motion.span
              key={total}
              className="mec-chip"
              style={{ background: OPERATORS[last].color }}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {OPERATORS[last].label}
              <code>{OPERATORS[last].key}</code>
            </motion.span>
          )}
          {total > 0 && (
            <span className="mec-tally-total">{total} descendientes</span>
          )}
        </div>

        <div className="mec-tally">
          {OPERATORS.map((op, i) => (
            <span key={op.key} className="mec-tally-item">
              <span className="mec-dot" style={{ background: op.color }} />
              {op.label}: <b>{tally[i]}</b>
            </span>
          ))}
        </div>

        <p className="mec-note">
          Proporciones iniciales: mpnn 30% · crossover 25% · mutation 15% ·
          disruptive 15% · localized 15%. Un piso <code>p_min ≈ 5%</code>{" "}
          garantiza que ningún operador quede sin probabilidad.
        </p>
      </div>
    </>
  );
}

// ── Slide 3 — Actualización de proporciones por ventanas de HV ──────────────
type Step = {
  label: string;
  tag: string;
  usage: number[];
  angle: number;
  sigma: number;
  kind: "reward" | "penalty" | "reset";
};

const STEPS: Step[] = [
  {
    label: "Ventana con mejora del HV (θ > 0, σ alta)",
    tag: "refuerzo fuerte · += 2α·uso",
    usage: [0.4, 0.3, 0.1, 0.1, 0.1],
    angle: 12,
    sigma: 0.03,
    kind: "reward",
  },
  {
    label: "Ventana con estancamiento (θ ≤ 0)",
    tag: "penaliza dominante · ×(1−β·uso) + impulsa subutilizados",
    usage: [0.55, 0.2, 0.1, 0.08, 0.07],
    angle: -6,
    sigma: 0.005,
    kind: "penalty",
  },
  {
    label: "Tras una inyección de diversidad (reset)",
    tag: "+5% a mpnn, disruptive y localized · sin evaluar HV",
    usage: [0, 0, 0, 0, 0],
    angle: 0,
    sigma: 0,
    kind: "reset",
  },
];

export function Slide3() {
  const [prop, setProp] = useState<number[]>(INIT);
  const [step, setStep] = useState(0);

  const apply = () => {
    const s = STEPS[step % STEPS.length];
    setProp((p) =>
      s.kind === "reset"
        ? resetAfterInjection(p)
        : operatorUpdate(p, s.usage, s.angle, s.sigma)
    );
    setStep((k) => k + 1);
  };
  const reset = () => {
    setProp(INIT);
    setStep(0);
  };

  const cur = STEPS[step % STEPS.length];

  return (
    <>
      <div className="mec-head">
        <span className="mec-kicker">Parte A · selección de operadores</span>
        <h2 className="mec-title">Actualización de proporciones por ventanas de HV</h2>
        <p className="mec-lead">
          Cada <strong>Tw</strong> generaciones (<code>operator_selection_window</code>)
          se evalúa la <strong>tendencia del HV</strong> en esa ventana (pendiente →
          ángulo θ, desviación σ) y se registra cuánto usó cada operador
          (<em>usage share</em>).
        </p>
      </div>

      <div className="mec-stage">
        <ProportionBars values={prop} />

        <motion.div
          key={step}
          className={"mec-rule " + cur.kind}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="mec-rule-step">Próxima ventana</span>
          <strong>{cur.label}</strong>
          <span className="mec-rule-tag">{cur.tag}</span>
        </motion.div>

        <div className="mec-roulette-row">
          <button type="button" className="mec-btn" onClick={apply}>
            Avanzar ventana
          </button>
          <button type="button" className="mec-btn ghost" onClick={reset}>
            Reiniciar
          </button>
          <span className="mec-note inline">ejemplo esquemático de las reglas</span>
        </div>

        <p className="mec-note">
          Si el HV <strong>mejora</strong>: refuerza los operadores usados
          (<code>+α·uso</code>, o <code>+2α·uso</code> si σ ≥ σ̄). Si{" "}
          <strong>estanca o cae</strong>: penaliza al dominante
          (<code>×(1−β·uso)</code>) e impulsa a los subutilizados
          (<code>+β/n</code>). Se renormaliza y se aplica <code>p_min</code> tras
          cada ventana.
        </p>
      </div>
    </>
  );
}
