import { useState } from "react";
import { motion } from "framer-motion";
import { MarkovGraph, STRATEGIES, BLUE, ORANGE, GREEN } from "./viz";
import { markovUpdate, sampleIndex } from "./helpers";

const N = STRATEGIES.length;
const UNIFORM: number[][] = Array.from({ length: N }, () =>
  Array.from({ length: N }, () => 1 / N)
);

// ── Slide 11 — Cadena de Markov 5×5 ────────────────────────────────────────
export function Slide11() {
  const [T, setT] = useState<number[][]>(UNIFORM);
  const [cur, setCur] = useState(0);
  const [hi, setHi] = useState<{ i: number; j: number; kind: "reward" | "penalty" } | null>(null);
  const [iter, setIter] = useState(0);
  const [msg, setMsg] = useState<string>("Estado inicial: matriz uniforme (1/5 por celda).");

  const inject = () => {
    const i = cur;
    const j = sampleIndex(T[i]);
    // Resultado de HV alternado (ejemplo): mejora, estanca, mejora, ...
    const improves = iter % 2 === 0;
    const kind = improves ? "rewardStrong" : "penalty";
    setT((m) => markovUpdate(m, i, j, kind));
    setHi({ i, j, kind: improves ? "reward" : "penalty" });
    setCur(j);
    setIter((k) => k + 1);
    setMsg(
      improves
        ? `HV mejora tras "${STRATEGIES[j].label}": la transición ${i + 1}→${j + 1} se refuerza (+2α).`
        : `HV se estanca tras "${STRATEGIES[j].label}": la transición ${i + 1}→${j + 1} se penaliza (−β).`
    );
  };

  const reset = () => {
    setT(UNIFORM);
    setCur(0);
    setHi(null);
    setIter(0);
    setMsg("Estado inicial: matriz uniforme (1/5 por celda).");
  };

  return (
    <>
      <div className="mec-head">
        <span className="mec-kicker">Parte B · selección de estrategia</span>
        <h2 className="mec-title">Qué estrategia de inyección usar</h2>
        <p className="mec-lead">
          La estrategia de cada inyección la decide una <strong>cadena de Markov
          5×5</strong> (<code>InjectionStrategySelector</code>): la siguiente se
          elige por <strong>ruleta sobre la fila</strong> del estado actual.
        </p>
      </div>

      <div className="mec-stage mec-two">
        <div className="mec-pane">
          <MarkovGraph matrix={T} active={cur} highlight={hi} />
        </div>
        <div className="mec-pane">
          <motion.div key={iter} className="mec-rule" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <span className="mec-rule-step">Iteración {iter}</span>
            <strong>{STRATEGIES[cur].label}</strong>
            <span className="mec-rule-tag">{msg}</span>
          </motion.div>

          <div className="mec-roulette-row">
            <button type="button" className="mec-btn" onClick={inject}>
              Inyectar y evaluar HV
            </button>
            <button type="button" className="mec-btn ghost" onClick={reset}>
              Reiniciar
            </button>
          </div>

          <p className="mec-note">
            Tras cada inyección se mide la tendencia del HV en las siguientes{" "}
            <code>eval_window</code> generaciones: si mejora, la transición usada
            se <strong>refuerza</strong> (<code>+α</code>, o <code>+2α</code> si la
            mejora es fuerte); si estanca o cae, se <strong>penaliza</strong>{" "}
            (<code>−β</code>). Cada fila mantiene un mínimo <code>p_min</code> y se
            renormaliza, de modo que ninguna estrategia se descarta del todo.
          </p>
          <p className="mec-note">
            El grosor de cada arista es proporcional a la probabilidad de
            transición desde el estado activo (ejemplo esquemático).
          </p>
        </div>
      </div>
    </>
  );
}

// ── Slide 12 — Cierre ──────────────────────────────────────────────────────
export function Slide12() {
  return (
    <>
      <div className="mec-head">
        <span className="mec-kicker">Cierre · mecanismos adaptativos</span>
        <h2 className="mec-title">Adaptación continua, no parámetros fijos</h2>
        <p className="mec-lead">
          Ambos mecanismos usan la <strong>tendencia del hipervolumen</strong>{" "}
          como señal (principio MIHPS): refuerzan lo que ayuda y penalizan lo que
          coincide con el estancamiento.
        </p>
      </div>

      <div className="mec-stage mec-two">
        <motion.div className="mec-sum-card" style={{ borderColor: BLUE }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <span className="mec-btag" style={{ background: BLUE }}>A · operadores</span>
          <h3>Mezcla adaptativa continua</h3>
          <p>
            <strong>Distribución de proporciones</strong> sobre 5 operadores,
            actualizada <strong>por ventanas</strong> de HV. Favorece la mezcla de
            operadores asociada a la mejora del indicador.
          </p>
          <code className="mec-tech">mpnn · crossover · mutation · disruptive · localized</code>
        </motion.div>

        <motion.div className="mec-sum-card" style={{ borderColor: ORANGE }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <span className="mec-btag" style={{ background: ORANGE }}>B · inyección</span>
          <h3>Intervención puntual ante estancamiento</h3>
          <p>
            5 estrategias y una <strong>matriz de transición Markov</strong>,
            actualizada <strong>por evento</strong>. La cadena ajusta las
            probabilidades de transición según el efecto observado en el HV.
          </p>
          <code className="mec-tech">refinement · extreme · anti_consensus · gap_targeted · random_walk</code>
        </motion.div>
      </div>

      <motion.p className="mec-sum-link" style={{ color: GREEN }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
        Además, tras una inyección las proporciones se <strong>resetean hacia
        operadores exploratorios</strong> (mpnn, disruptive, localized) para
        aprovechar la diversidad recién introducida.
      </motion.p>
    </>
  );
}
