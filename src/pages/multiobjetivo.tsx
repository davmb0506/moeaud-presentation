import { useState } from "react";
import { motion, type Variants } from "framer-motion";

const wrap: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const fade: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

// Lienzo
const VW = 360;
const VH = 300;
const PADL = 44;
const PADR = 20;
const PADT = 22;
const PADB = 40;
const PW = VW - PADL - PADR;
const PH = VH - PADT - PADB;
const R = 0.9; // radio del frente esquemático (en unidades de datos)

const sx = (f: number) => PADL + f * PW;
const sy = (f: number) => PADT + (1 - f) * PH;

// Frente esquemático: cuarto de curva convexa entre (R,0) y (0,R).
const ARC = Array.from({ length: 61 }, (_, i) => {
  const a = (i / 60) * (Math.PI / 2);
  return `${sx(R * Math.cos(a))},${sy(R * Math.sin(a))}`;
}).join(" ");

// Puntos no dominados repartidos a lo largo del frente (modo multiobjetivo).
const MO_PTS = Array.from({ length: 11 }, (_, i) => {
  const a = (Math.PI / 2) * (0.06 + (0.88 * i) / 10);
  return { x: sx(R * Math.cos(a)), y: sy(R * Math.sin(a)) };
});

type Mode = "weighted" | "mo";

export function Multiobjetivo() {
  const [mode, setMode] = useState<Mode>("weighted");
  // Punto representativo (rodilla del frente) para la suma ponderada.
  const kx = sx(R * Math.cos(Math.PI / 4));
  const ky = sy(R * Math.sin(Math.PI / 4));

  return (
    <motion.div
      className="mo"
      variants={wrap}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.15 }}
    >
      <motion.div variants={fade} className="mo-head">
        <h2 className="mo-title">Transición a optimización multiobjetivo</h2>
        <p className="mo-sub">
          EvoPro base combina varias métricas de AlphaFold en un único número con
          pesos fijos: eso entrega una sola solución. La optimización
          multiobjetivo busca el frente completo de compromisos.
        </p>
      </motion.div>

      <motion.div variants={fade} className="mo-seg" role="tablist">
        <button
          type="button"
          className={"op-seg-btn" + (mode === "weighted" ? " active" : "")}
          style={mode === "weighted" ? { background: "#2b6ef2" } : undefined}
          onClick={() => setMode("weighted")}
        >
          Suma ponderada
        </button>
        <button
          type="button"
          className={"op-seg-btn" + (mode === "mo" ? " active" : "")}
          style={mode === "mo" ? { background: "#00b894" } : undefined}
          onClick={() => setMode("mo")}
        >
          Multiobjetivo
        </button>
      </motion.div>

      <motion.div
        className="mo-fig"
        variants={fade}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.1, once: true }}
      >
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          role="img"
          aria-label="Espacio de objetivos y frente de Pareto"
        >
          <line className="mo-axis" x1={PADL} y1={PADT} x2={PADL} y2={PADT + PH} />
          <line className="mo-axis" x1={PADL} y1={PADT + PH} x2={PADL + PW} y2={PADT + PH} />
          <text className="mo-axt" x={PADL + PW} y={PADT + PH + 26} textAnchor="end">
            f₁
          </text>
          <text className="mo-axt" x={PADL - 30} y={PADT + 6}>
            f₂
          </text>

          <polyline className="mo-front" points={ARC} />

          {/* Suma ponderada: una sola solución */}
          {mode === "weighted" && <circle className="mo-pt" cx={kx} cy={ky} r={6} />}

          {/* Multiobjetivo: el frente completo */}
          {mode === "mo" &&
            MO_PTS.map((p, i) => (
              <motion.circle
                key={i}
                className="mo-pt mo-mo"
                cx={p.x}
                cy={p.y}
                initial={{ r: 0, opacity: 0 }}
                animate={{ r: 5, opacity: 1 }}
                transition={{ duration: 0.3, delay: i * 0.05, ease: "easeOut" }}
              />
            ))}
        </svg>

        <p className="mo-cap">
          {mode === "weighted"
            ? "Suma ponderada: una sola solución del frente."
            : "Multiobjetivo: el frente completo en una sola ejecución."}
        </p>
      </motion.div>

      <motion.p variants={fade} className="mo-cite">
        Nanda V, Belure SV, Shir OM. Searching for the Pareto frontier in
        multi-objective protein design. <em>Biophysical Reviews</em>.
        2017;9(4):339–344.
      </motion.p>
    </motion.div>
  );
}
