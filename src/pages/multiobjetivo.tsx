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

export function Multiobjetivo() {
  // peso relativo sobre f1 (5..95 %)
  const [w1p, setW1p] = useState(55);
  const w1 = w1p / 100;
  const w2 = 1 - w1;

  // La suma ponderada toca la curva donde el radio es normal a (w1, w2).
  const a = Math.atan2(w2, w1);
  const px = R * Math.cos(a);
  const py = R * Math.sin(a);

  // Recta de iso-aptitud: tangente a la curva en (px, py).
  const L = 0.55;
  const x1 = sx(px - L * Math.sin(a));
  const y1 = sy(py + L * Math.cos(a));
  const x2 = sx(px + L * Math.sin(a));
  const y2 = sy(py - L * Math.cos(a));

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
          EvoPro base reduce varias métricas de AlphaFold2 a un único número
          mediante una suma de pesos fijos. En el espacio de objetivos, esa
          escalarización equivale a elegir una dirección y quedarse con un solo
          punto del frente; la optimización multiobjetivo, en cambio, busca el
          frente completo.
        </p>
      </motion.div>

      

      <motion.div variants={fade} className="mo-fig">
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          role="img"
          aria-label="Espacio de objetivos: el frente de Pareto y la dirección de los pesos"
        >
          <defs>
            <clipPath id="moClip">
              <rect x={PADL} y={PADT} width={PW} height={PH} />
            </clipPath>
          </defs>

          <line className="mo-axis" x1={PADL} y1={PADT} x2={PADL} y2={PADT + PH} />
          <line
            className="mo-axis"
            x1={PADL}
            y1={PADT + PH}
            x2={PADL + PW}
            y2={PADT + PH}
          />
          <text className="mo-axt" x={PADL + PW} y={PADT + PH + 26} textAnchor="end">
            f₁
          </text>
          <text className="mo-axt" x={PADL - 30} y={PADT + 6}>
            f₂
          </text>
          <text className="mo-hint" x={PADL + 4} y={PADT + PH - 6}>
            mejor
          </text>

          <polyline className="mo-front" points={ARC} />
          <text
            className="mo-frontlbl"
            x={sx(R * Math.cos(Math.PI / 4)) + 6}
            y={sy(R * Math.sin(Math.PI / 4)) - 6}
          >
            frente de Pareto
          </text>

          <g clipPath="url(#moClip)">
            <motion.line
              className="mo-dir"
              initial={false}
              animate={{ x1, y1, x2, y2 }}
              transition={{ type: "spring", stiffness: 220, damping: 26 }}
            />
          </g>

          <motion.circle
            className="mo-pt"
            r={6}
            initial={false}
            animate={{ cx: sx(px), cy: sy(py) }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          />
        </svg>

        <div className="mo-ctrl">
          <label htmlFor="mo-w">
            dirección de los pesos — w₁ {Math.round(w1 * 100)} / w₂{" "}
            {Math.round(w2 * 100)}
          </label>
          <input
            id="mo-w"
            type="range"
            min={5}
            max={95}
            step={1}
            value={w1p}
            onChange={(e) => setW1p(Number(e.target.value))}
          />
        </div>

        
      </motion.div>


      <motion.p variants={fade} className="mo-cite">
        Nanda V, Belure SV, Shir OM. Searching for the Pareto frontier in
        multi-objective protein design. <em>Biophysical Reviews</em>.
        2017;9(4):339–344.
      </motion.p>
    </motion.div>
  );
}
