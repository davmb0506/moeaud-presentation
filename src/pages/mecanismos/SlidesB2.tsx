import { useState } from "react";
import { motion } from "framer-motion";
import {
  FrontCanvas,
  frontPolyline,
  FRONT,
  SequenceLogo,
  ORANGE,
} from "./viz";

const AC_PURPLE = "#8E6FB0";
const GAP_TEAL = "#4F9D8B";
const RW_TERRA = "#C2603F";

// Columnas del sequence logo: algunas conservadas (baja entropía) y otras diversas.
const COLS_CONS = [
  { letters: [{ aa: "L", p: 0.5 }, { aa: "V", p: 0.3 }, { aa: "I", p: 0.2 }], low: false },
  { letters: [{ aa: "K", p: 0.94 }, { aa: "R", p: 0.06 }], low: true },
  { letters: [{ aa: "D", p: 0.45 }, { aa: "E", p: 0.4 }, { aa: "S", p: 0.15 }], low: false },
  { letters: [{ aa: "A", p: 0.97 }], low: true },
  { letters: [{ aa: "F", p: 0.4 }, { aa: "Y", p: 0.35 }, { aa: "W", p: 0.25 }], low: false },
  { letters: [{ aa: "G", p: 0.95 }, { aa: "A", p: 0.05 }], low: true },
  { letters: [{ aa: "S", p: 0.4 }, { aa: "T", p: 0.35 }, { aa: "N", p: 0.25 }], low: false },
  { letters: [{ aa: "P", p: 0.92 }, { aa: "A", p: 0.08 }], low: true },
];

const COLS_DIV = COLS_CONS.map((c) =>
  c.low
    ? {
        letters: [
          { aa: c.letters[0].aa, p: 0.4 },
          { aa: "T", p: 0.22 },
          { aa: "M", p: 0.2 },
          { aa: "Q", p: 0.18 },
        ],
        low: true,
      }
    : c
);

// ── Slide 8 — Anti-consenso (entropía) ─────────────────────────────────────
export function Slide8() {
  const [div, setDiv] = useState(false);

  return (
    <>
      <div className="mec-head">
        <span className="mec-kicker">Parte B · anti-consenso</span>
        <h2 className="mec-title">Anti-consenso: re-diversificación guiada por entropía</h2>
        <p className="mec-lead">
          Calcula la <strong>entropía de Shannon</strong> por posición en la
          población y muta preferentemente las posiciones de <strong>baja
          entropía</strong> (las que se homogenizaron), con peso{" "}
          <code>∝ 1/(H + 0.01)</code>.
        </p>
      </div>

      <div className="mec-stage">
        <SequenceLogo cols={div ? COLS_DIV : COLS_CONS} diversified={div} />

        <div className="mec-roulette-row">
          <button type="button" className="mec-btn"
            style={{ background: AC_PURPLE }}
            onClick={() => setDiv((d) => !d)}>
            {div ? "Reiniciar" : "Re-diversificar columnas conservadas"}
          </button>
          <span className="mec-note inline">
            las columnas marcadas son posiciones conservadas (H baja)
          </span>
          <code className="mec-tech right">anti_consensus</code>
        </div>

        <p className="mec-note">
          Se inyecta <strong>directamente</strong> en la descendencia, sin
          ProteinMPNN ni AlphaFold: ProteinMPNN tendería a revertir la perturbación
          introducida. Así se reintroduce variabilidad en las posiciones donde la
          población la perdió.
        </p>
      </div>
    </>
  );
}

// ── Slide 9 — Búsqueda dirigida a huecos ───────────────────────────────────
export function Slide9() {
  const [step, setStep] = useState(0); // 0 · 1 mide · 2 inyecta
  // Frente con un hueco grande entre dos no dominadas contiguas.
  const GAPPED = [
    { x: 0.1, y: 0.9 },
    { x: 0.18, y: 0.7 },
    { x: 0.27, y: 0.56 },
    { x: 0.36, y: 0.46 },
    // hueco grande aquí
    { x: 0.74, y: 0.22 },
    { x: 0.9, y: 0.18 },
  ];
  const A = GAPPED[3];
  const B = GAPPED[4];
  const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 + 0.02 };

  return (
    <>
      <div className="mec-head">
        <span className="mec-kicker">Parte B · huecos</span>
        <h2 className="mec-title">Búsqueda dirigida a huecos</h2>
        <p className="mec-lead">
          Identifica el <strong>mayor hueco</strong> entre soluciones no
          dominadas contiguas en el espacio de objetivos y usa una de las
          soluciones que lo flanquean como plantilla de ProteinMPNN. Mejora la{" "}
          <strong>uniformidad</strong> del frente.
        </p>
      </div>

      <div className="mec-stage">
        <FrontCanvas ariaLabel="Búsqueda dirigida al mayor hueco">
          {({ sx, sy }) => (
            <>
              <polyline points={frontPolyline({ sx, sy }, GAPPED)} className="mec-front" />
              {GAPPED.map((p, i) => (
                <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={4.5} fill="#9fb3c8" />
              ))}
              {step >= 1 && (
                <motion.line x1={sx(A.x)} y1={sy(A.y)} x2={sx(B.x)} y2={sy(B.y)}
                  className="mec-gap" style={{ stroke: GAP_TEAL }}
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />
              )}
              {step >= 1 && (
                <text x={(sx(A.x) + sx(B.x)) / 2} y={(sy(A.y) + sy(B.y)) / 2 - 10}
                  textAnchor="middle" className="mec-tag-tx" style={{ fill: GAP_TEAL }}>
                  mayor hueco
                </text>
              )}
              {step >= 2 && (
                <motion.circle cx={sx(mid.x)} cy={sy(mid.y)} r={6} fill={GAP_TEAL}
                  initial={{ scale: 0 }} animate={{ scale: 1 }} />
              )}
            </>
          )}
        </FrontCanvas>

        <div className="mec-roulette-row">
          <button type="button" className="mec-btn" style={{ background: GAP_TEAL }}
            onClick={() => setStep((s) => (s + 1) % 3)}>
            {step === 0 ? "Medir mayor hueco" : step === 1 ? "Inyectar en el hueco" : "Reiniciar"}
          </button>
          <span className="mec-note inline">
            {step === 0 ? "frente con una región poco poblada" : step === 1 ? "separación máxima entre contiguas" : "nueva solución en el hueco"}
          </span>
          <code className="mec-tech right">gap_targeted</code>
        </div>
      </div>
    </>
  );
}

// ── Slide 10 — Caminata aleatoria ──────────────────────────────────────────
export function Slide10() {
  const [jumped, setJumped] = useState(false);
  const FAR = [
    { x: 0.78, y: 0.78 },
    { x: 0.88, y: 0.62 },
    { x: 0.7, y: 0.88 },
  ];
  const start = { x: 0.36, y: 0.46 };

  return (
    <>
      <div className="mec-head">
        <span className="mec-kicker">Parte B · caminata aleatoria</span>
        <h2 className="mec-title">Caminata aleatoria</h2>
        <p className="mec-lead">
          Elige un miembro <strong>aleatorio</strong> del archivo y muestrea con
          ProteinMPNN a <strong>temperatura alta</strong>. Exploración amplia del
          espacio de secuencias para escapar de óptimos locales.
        </p>
      </div>

      <div className="mec-stage">
        <FrontCanvas ariaLabel="Caminata aleatoria en el espacio de secuencias">
          {({ sx, sy }) => (
            <>
              <polyline points={frontPolyline({ sx, sy })} className="mec-front" />
              {FRONT.map((p, i) => (
                <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={4} fill="#9fb3c8" />
              ))}
              <circle cx={sx(start.x)} cy={sy(start.y)} r={6} fill={ORANGE} />
              <text x={sx(start.x)} y={sy(start.y) - 12} textAnchor="middle" className="mec-tag-tx">
                miembro del archivo
              </text>
              {jumped &&
                FAR.map((p, i) => (
                  <g key={i}>
                    <motion.line x1={sx(start.x)} y1={sy(start.y)} x2={sx(p.x)} y2={sy(p.y)}
                      className="mec-jump" style={{ stroke: RW_TERRA }}
                      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: i * 0.12 }} />
                    <motion.circle cx={sx(p.x)} cy={sy(p.y)} r={5} fill={RW_TERRA}
                      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + i * 0.12 }} />
                  </g>
                ))}
            </>
          )}
        </FrontCanvas>

        <div className="mec-roulette-row">
          <button type="button" className="mec-btn" style={{ background: RW_TERRA }}
            onClick={() => setJumped((j) => !j)}>
            {jumped ? "Reiniciar" : "Muestrear a temperatura alta"}
          </button>
          <span className="mec-note inline">
            saltos a regiones lejanas del espacio de secuencias
          </span>
          <code className="mec-tech right">random_walk</code>
        </div>
      </div>
    </>
  );
}
