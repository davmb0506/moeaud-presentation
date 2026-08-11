import { motion, type Variants } from "framer-motion";

const wrap: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const fade: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

const STROKE = "#1e293b";
const FILL = "#ffffff";
const MUTED = "#64748b";

function Box({
  x,
  y,
  w,
  h,
  r = 8,
  strokeWidth = 1.5,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  strokeWidth?: number;
}) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={r}
      ry={r}
      fill={FILL}
      stroke={STROKE}
      strokeWidth={strokeWidth}
    />
  );
}

function Label({
  x,
  y,
  text,
  size = 13,
  weight = 600,
  fill = STROKE,
}: {
  x: number;
  y: number;
  text: string;
  size?: number;
  weight?: number;
  fill?: string;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fill={fill}
      fontSize={size}
      fontWeight={weight}
      fontFamily="inherit"
    >
      {text}
    </text>
  );
}

const PAIRS = [
  { name: "Interface-PAE / pLDDT", cx: 150 },
  { name: "Compuesto / TM-score", cx: 450 },
  { name: "ipSAE / SC", cx: 750 },
] as const;

export function FormulacionesMecanismos() {
  const pairY = 248;
  const pairW = 220;
  const pairH = 40;
  const leafY = 360;
  const leafW = 88;
  const leafH = 32;
  const moea = { x: 300, y: 118, w: 300, h: 58 };
  const moeaCx = moea.x + moea.w / 2;
  const moeaBottom = moea.y + moea.h;
  const forkY = 210;

  return (
    <motion.div
      className="formech"
      variants={wrap}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.15 }}
    >
      <motion.div variants={fade} className="formech-head">
        <h2 className="formech-title">Diseño experimental</h2>
      </motion.div>

      <motion.div variants={fade} className="fexp-wrap">
        <svg
          className="fexp-svg"
          viewBox="0 0 900 470"
          role="img"
          aria-label="Flujo del experimento multiobjetivo: entradas, MOEA-UD, tres pares de objetivos con y sin mecanismos adaptativos, y seis frentes no dominados"
        >
          <defs>
            <marker
              id="fexp-arrow"
              viewBox="0 0 12 12"
              refX="10"
              refY="6"
              markerWidth="8"
              markerHeight="8"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path d="M2 2 L10 6 L2 10 Z" fill={STROKE} />
            </marker>
          </defs>

          {/* Inputs → MOEA (ortogonal: baja, une, baja) */}
          <path
            d={`M 200 86 V 102 H ${moeaCx} V ${moea.y}`}
            fill="none"
            stroke={STROKE}
            strokeWidth={1.4}
            markerEnd="url(#fexp-arrow)"
          />
          <path
            d={`M 700 86 V 102 H ${moeaCx}`}
            fill="none"
            stroke={STROKE}
            strokeWidth={1.4}
          />

          {/* MOEA → fork bar → pairs */}
          <line
            x1={moeaCx}
            y1={moeaBottom}
            x2={moeaCx}
            y2={forkY}
            stroke={STROKE}
            strokeWidth={1.4}
          />
          <line
            x1={PAIRS[0].cx}
            y1={forkY}
            x2={PAIRS[2].cx}
            y2={forkY}
            stroke={STROKE}
            strokeWidth={1.4}
          />
          {PAIRS.map((p) => (
            <line
              key={`down-${p.name}`}
              x1={p.cx}
              y1={forkY}
              x2={p.cx}
              y2={pairY}
              stroke={STROKE}
              strokeWidth={1.4}
              markerEnd="url(#fexp-arrow)"
            />
          ))}

          {/* Pair → leaves */}
          {PAIRS.map((p) => {
            const leftCx = p.cx - 52;
            const rightCx = p.cx + 52;
            const pairBottom = pairY + pairH;
            const splitY = pairBottom + 18;
            return (
              <g key={`pair-lines-${p.name}`}>
                <line
                  x1={p.cx}
                  y1={pairBottom}
                  x2={p.cx}
                  y2={splitY}
                  stroke={STROKE}
                  strokeWidth={1.3}
                />
                <line
                  x1={leftCx}
                  y1={splitY}
                  x2={rightCx}
                  y2={splitY}
                  stroke={STROKE}
                  strokeWidth={1.3}
                />
                <line
                  x1={leftCx}
                  y1={splitY}
                  x2={leftCx}
                  y2={leafY}
                  stroke={STROKE}
                  strokeWidth={1.3}
                  markerEnd="url(#fexp-arrow)"
                />
                <line
                  x1={rightCx}
                  y1={splitY}
                  x2={rightCx}
                  y2={leafY}
                  stroke={STROKE}
                  strokeWidth={1.3}
                  markerEnd="url(#fexp-arrow)"
                />
              </g>
            );
          })}

          {/* Input section header */}
          <Label x={450} y={12} text="Entradas del algoritmo" size={13} weight={700} fill={MUTED} />

          {/* Input boxes */}
          <Box x={70} y={30} w={260} h={56} />
          <Label x={200} y={48} text="Péptido semilla (21 aa)" size={13} weight={700} />
          <Label x={200} y={68} text="Población inicial por mutación" size={10.5} fill={MUTED} weight={500} />

          <Box x={570} y={30} w={260} h={56} />
          <Label x={700} y={48} text="VEGF-A (proteína blanco)" size={13} weight={700} />
          <Label x={700} y={68} text="Estructura 3D para evaluación" size={10.5} fill={MUTED} weight={500} />

          {/* MOEA-UD */}
          <Box x={moea.x} y={moea.y} w={moea.w} h={moea.h} r={10} strokeWidth={2} />
          <Label x={moeaCx} y={moea.y + 22} text="MOEA-UD" size={16} weight={800} />
          <Label
            x={moeaCx}
            y={moea.y + 42}
            text="pop. 50 · 200 gen · 10 réplicas"
            size={11}
            weight={500}
            fill={MUTED}
          />

          {/* Pair boxes + leaves */}
          {PAIRS.map((p) => {
            const leftCx = p.cx - 52;
            const rightCx = p.cx + 52;
            return (
              <g key={p.name}>
                <Box x={p.cx - pairW / 2} y={pairY} w={pairW} h={pairH} />
                <Label x={p.cx} y={pairY + pairH / 2} text={p.name} size={12.5} />

                <Box x={leftCx - leafW / 2} y={leafY} w={leafW} h={leafH} r={6} />
                <Label x={leftCx} y={leafY + leafH / 2} text="con MA" size={12} />

                <Box x={rightCx - leafW / 2} y={leafY} w={leafW} h={leafH} r={6} />
                <Label x={rightCx} y={leafY + leafH / 2} text="sin MA" size={12} />
              </g>
            );
          })}

          <Label
            x={450}
            y={440}
            text="6 frentes no dominados"
            size={13}
            weight={700}
            fill={MUTED}
          />

        </svg>
      </motion.div>
    </motion.div>
  );
}
