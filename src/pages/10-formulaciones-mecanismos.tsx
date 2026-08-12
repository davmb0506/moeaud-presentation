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
  const seedCx = 230;
  const vegfCx = 645;
  const inputBottom = 86;
  const joinY = 108;
  const pairY = 148;
  const pairW = 220;
  const pairH = 40;
  const leafY = 250;
  const leafW = 88;
  const leafH = 32;
  const moea = { x: 300, y: 350, w: 300, h: 58 };
  const moeaCx = moea.x + moea.w / 2;
  const mergeY = 320;
  const frontY = 440;

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
            viewBox="0 0 900 510"
            role="img"
            aria-label="Flujo del experimento: entradas, tres pares de objetivos con y sin mecanismos adaptativos, MOEA-UD y seis frentes no dominados"
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
              <clipPath id="fexp-pdb-clip">
                <rect x={790} y={28} width={72} height={72} rx={8} />
              </clipPath>
            </defs>

            {/* Inputs → join → pairs */}
            <path
              d={`M ${seedCx} ${inputBottom} V ${joinY} H ${moeaCx}`}
              fill="none"
              stroke={STROKE}
              strokeWidth={1.4}
            />
            <path
              d={`M ${vegfCx} ${inputBottom} V ${joinY} H ${moeaCx}`}
              fill="none"
              stroke={STROKE}
              strokeWidth={1.4}
            />
            <line
              x1={PAIRS[0].cx}
              y1={joinY}
              x2={PAIRS[2].cx}
              y2={joinY}
              stroke={STROKE}
              strokeWidth={1.4}
            />
            {PAIRS.map((p) => (
              <line
                key={`to-pair-${p.name}`}
                x1={p.cx}
                y1={joinY}
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

            {/* Leaves → MOEA */}
            {PAIRS.map((p) => {
              const leftCx = p.cx - 52;
              const rightCx = p.cx + 52;
              return (
                <g key={`to-moea-${p.name}`}>
                  <line
                    x1={leftCx}
                    y1={leafY + leafH}
                    x2={leftCx}
                    y2={mergeY}
                    stroke={STROKE}
                    strokeWidth={1.3}
                  />
                  <line
                    x1={rightCx}
                    y1={leafY + leafH}
                    x2={rightCx}
                    y2={mergeY}
                    stroke={STROKE}
                    strokeWidth={1.3}
                  />
                </g>
              );
            })}
            <line
              x1={PAIRS[0].cx - 52}
              y1={mergeY}
              x2={PAIRS[2].cx + 52}
              y2={mergeY}
              stroke={STROKE}
              strokeWidth={1.3}
            />
            <line
              x1={moeaCx}
              y1={mergeY}
              x2={moeaCx}
              y2={moea.y}
              stroke={STROKE}
              strokeWidth={1.4}
              markerEnd="url(#fexp-arrow)"
            />
            <line
              x1={moeaCx}
              y1={moea.y + moea.h}
              x2={moeaCx}
              y2={frontY}
              stroke={STROKE}
              strokeWidth={1.4}
              markerEnd="url(#fexp-arrow)"
            />

            <Label
              x={450}
              y={14}
              text="Entradas del algoritmo"
              size={13}
              weight={700}
              fill={MUTED}
            />

            {/* Seed input + peptide icon */}
            <PeptideIcon x={42} y={16} />
            <Box x={130} y={30} w={200} h={56} />
            <Label x={230} y={48} text="Péptido semilla (21 aa)" size={12.5} weight={700} />
            <Label
              x={230}
              y={68}
              text="Población inicial por mutación"
              size={10}
              fill={MUTED}
              weight={500}
            />

            {/* VEGF input + PDB slot (HTML overlay) */}
            <Box x={520} y={30} w={250} h={56} />
            <Label x={645} y={48} text="VEGF-A (proteína blanco)" size={12.5} weight={700} />
            <Label
              x={645}
              y={68}
              text="Estructura 3D para evaluación"
              size={10}
              fill={MUTED}
              weight={500}
            />

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

            <Box x={270} y={frontY} w={360} h={42} r={8} strokeWidth={2} />
            <Label
              x={450}
              y={frontY + 21}
              text="6 frentes no dominados"
              size={14}
              weight={700}
            />
          </svg>
        </div>
      </motion.div>
    </motion.div>
  );
}
