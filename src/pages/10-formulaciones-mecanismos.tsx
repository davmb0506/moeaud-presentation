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

/** Semilla → flecha → pool de secuencias mutadas. */
function PeptideIcon({ x, y }: { x: number; y: number }) {
  const n = 8;
  const spacing = 8;
  const seedColors = [
    "#e6194b",
    "#3cb44b",
    "#4363d8",
    "#f58231",
    "#911eb4",
    "#42d4f4",
    "#f032e6",
    "#469990",
  ];

  function Seq({
    oy,
    mutateAt,
    scale = 1,
  }: {
    oy: number;
    mutateAt?: number[];
    scale?: number;
  }) {
    const r = 3.2 * scale;
    const sp = spacing * scale;
    return (
      <g>
        <path
          d={`M 4 ${oy} ${Array.from({ length: n - 1 }, (_, i) => {
            const x1 = 4 + i * sp;
            const x2 = 4 + (i + 1) * sp;
            const bump = i % 2 === 0 ? -4 * scale : 4 * scale;
            return `Q ${(x1 + x2) / 2} ${oy + bump} ${x2} ${oy}`;
          }).join(" ")}`}
          fill="none"
          stroke="#94a3b8"
          strokeWidth={1.2}
        />
        {Array.from({ length: n }, (_, i) => {
          const mutated = mutateAt?.includes(i);
          return (
            <circle
              key={i}
              cx={4 + i * sp}
              cy={oy}
              r={r}
              fill={mutated ? "#1e293b" : seedColors[i]}
              stroke="#fff"
              strokeWidth={0.6}
            />
          );
        })}
      </g>
    );
  }

  return (
    <g transform={`translate(${x}, ${y})`}>
      <Seq oy={10} />
      {/* Flecha hacia el pool */}
      <line
        x1={36}
        y1={18}
        x2={36}
        y2={32}
        stroke="#1e293b"
        strokeWidth={1.4}
        markerEnd="url(#fexp-arrow)"
      />
      {/* Pool de secuencias */}
      <Seq oy={42} mutateAt={[2, 5]} scale={0.92} />
      <Seq oy={56} mutateAt={[1, 6]} scale={0.92} />
      <Seq oy={70} mutateAt={[3, 4, 7]} scale={0.92} />
    </g>
  );
}

const PAIRS = [
  { name: "Interface-PAE / pLDDT", cx: 150 },
  { name: "Compuesto / TM-score", cx: 450 },
  { name: "ipSAE / SC", cx: 750 },
] as const;

export function FormulacionesMecanismos() {
  const pairY = 20;
  const pairW = 210;
  const pairH = 38;
  const leafY = 95;
  const leafW = 84;
  const leafH = 30;
  const mergeY = 152;
  const moea = { x: 310, y: 250, w: 280, h: 56 };
  const moeaCx = moea.x + moea.w / 2;
  const moeaCy = moea.y + moea.h / 2;
  const frontY = 355;

  const seedBox = { x: 100, y: 250, w: 190, h: 56 };
  const vegfBox = { x: 610, y: 250, w: 190, h: 56 };

  return (
    <motion.div
      className="formech"
      variants={wrap}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.15 }}
    >
      <motion.div variants={fade} className="formech-head">
        <h2 className="formech-title">Diseño experimental — Fase de búsqueda</h2>
      </motion.div>

      <motion.div variants={fade} className="fexp-wrap">
        <div className="fexp-stage">
          {/* Imagen estática de VEGF-A superficie */}
          <div className="fexp-pdb-slot" aria-hidden>
            <img src="/img/vegfa_surface.png" alt="VEGF-A superficie" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>

          <svg
            className="fexp-svg"
            viewBox="0 0 900 420"
            role="img"
            aria-label="Flujo del experimento: tres pares de objetivos, entradas laterales, MOEA-UD y seis frentes no dominados"
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

            {/* === Objective pairs at top === */}
            {PAIRS.map((p) => {
              const leftCx = p.cx - 50;
              const rightCx = p.cx + 50;
              const pairBottom = pairY + pairH;
              const splitY = pairBottom + 14;
              return (
                <g key={p.name}>
                  <Box x={p.cx - pairW / 2} y={pairY} w={pairW} h={pairH} />
                  <Label x={p.cx} y={pairY + pairH / 2} text={p.name} size={12} />

                  <line x1={p.cx} y1={pairBottom} x2={p.cx} y2={splitY} stroke={STROKE} strokeWidth={1.3} />
                  <line x1={leftCx} y1={splitY} x2={rightCx} y2={splitY} stroke={STROKE} strokeWidth={1.3} />
                  <line x1={leftCx} y1={splitY} x2={leftCx} y2={leafY} stroke={STROKE} strokeWidth={1.3} markerEnd="url(#fexp-arrow)" />
                  <line x1={rightCx} y1={splitY} x2={rightCx} y2={leafY} stroke={STROKE} strokeWidth={1.3} markerEnd="url(#fexp-arrow)" />

                  <Box x={leftCx - leafW / 2} y={leafY} w={leafW} h={leafH} r={6} />
                  <Label x={leftCx} y={leafY + leafH / 2} text="con MA" size={11} />
                  <Box x={rightCx - leafW / 2} y={leafY} w={leafW} h={leafH} r={6} />
                  <Label x={rightCx} y={leafY + leafH / 2} text="sin MA" size={11} />

                  <line x1={leftCx} y1={leafY + leafH} x2={leftCx} y2={mergeY} stroke={STROKE} strokeWidth={1.3} />
                  <line x1={rightCx} y1={leafY + leafH} x2={rightCx} y2={mergeY} stroke={STROKE} strokeWidth={1.3} />
                </g>
              );
            })}

            {/* Merge line → arrow down to MOEA-UD */}
            <line x1={PAIRS[0].cx - 50} y1={mergeY} x2={PAIRS[2].cx + 50} y2={mergeY} stroke={STROKE} strokeWidth={1.3} />
            <line x1={moeaCx} y1={mergeY} x2={moeaCx} y2={moea.y} stroke={STROKE} strokeWidth={1.4} markerEnd="url(#fexp-arrow)" />

            {/* === Inputs aligned with MOEA-UD (same row) === */}
            {/* Seed: icon to the left of the box */}
            <PeptideIcon x={seedBox.x - 80} y={seedBox.y + 2} />
            <Box x={seedBox.x} y={seedBox.y} w={seedBox.w} h={seedBox.h} />
            <Label x={seedBox.x + seedBox.w / 2} y={seedBox.y + 20} text="Péptido semilla (21 aa)" size={11.5} weight={700} />
            <Label x={seedBox.x + seedBox.w / 2} y={seedBox.y + 38} text="Población inicial por mutación" size={9.5} fill={MUTED} weight={500} />
            <line
              x1={seedBox.x + seedBox.w}
              y1={moeaCy}
              x2={moea.x}
              y2={moeaCy}
              stroke={STROKE}
              strokeWidth={1.4}
              markerEnd="url(#fexp-arrow)"
            />

            {/* VEGF-A */}
            <Box x={vegfBox.x} y={vegfBox.y} w={vegfBox.w} h={vegfBox.h} />
            <Label x={vegfBox.x + vegfBox.w / 2} y={vegfBox.y + 20} text="VEGF-A (proteína blanco)" size={11.5} weight={700} />
            <Label x={vegfBox.x + vegfBox.w / 2} y={vegfBox.y + 38} text="Estructura 3D para evaluación" size={9.5} fill={MUTED} weight={500} />
            <line
              x1={vegfBox.x}
              y1={moeaCy}
              x2={moea.x + moea.w}
              y2={moeaCy}
              stroke={STROKE}
              strokeWidth={1.4}
              markerEnd="url(#fexp-arrow)"
            />

            {/* === MOEA-UD === */}
            <Box x={moea.x} y={moea.y} w={moea.w} h={moea.h} r={10} strokeWidth={2} />
            <Label x={moeaCx} y={moea.y + 22} text="MOEA-UD" size={16} weight={800} />
            <Label x={moeaCx} y={moea.y + 42} text="pop. 50 · 200 gen · 10 réplicas" size={11} weight={500} fill={MUTED} />

            {/* MOEA-UD → Fronts */}
            <line x1={moeaCx} y1={moea.y + moea.h} x2={moeaCx} y2={frontY} stroke={STROKE} strokeWidth={1.4} markerEnd="url(#fexp-arrow)" />
            <Box x={270} y={frontY} w={360} h={42} r={8} strokeWidth={2} />
            <Label x={450} y={frontY + 21} text="6 frentes no dominados" size={14} weight={700} />
          </svg>
        </div>
      </motion.div>
    </motion.div>
  );
}
