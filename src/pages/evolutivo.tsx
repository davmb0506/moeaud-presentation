import type { ReactNode } from "react";
import { motion, type Variants } from "framer-motion";

const fade: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const wrap: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

// ---- Geometría ----
const CX = 500;
const CY = 330;
const NRX = 340; // radio del anillo de nodos (x)
const NRY = 225; // radio del anillo de nodos (y)
const ARX = 398; // radio del anillo de flechas (x)
const ARY = 272; // radio del anillo de flechas (y)
const INK = "#243043";

const pt = (deg: number, rx: number, ry: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [CX + rx * Math.cos(a), CY + ry * Math.sin(a)];
};
const f = (n: number) => n.toFixed(1);

// Flechas curvas entre etapas (en los huecos angulares, sentido horario).
const CONNECTORS = [-90, -30, 30, 90, 150, 210].map((t) => {
  const [sx, sy] = pt(t + 16, ARX, ARY);
  const [ex, ey] = pt(t + 44, ARX, ARY);
  return `M ${f(sx)} ${f(sy)} A ${ARX} ${ARY} 0 0 1 ${f(ex)} ${f(ey)}`;
});

// Rueda central de flechas de colores ("Evolución").
const WHEEL = ["#e2433f", "#f08a2c", "#ecc017", "#34a558", "#2f7fd6", "#7a52d6"];
const WR = 66;
const seg = (() => {
  const [ax, ay] = pt(8, WR, WR);
  const [bx, by] = pt(44, WR, WR);
  return `M ${f(ax)} ${f(ay)} A ${WR} ${WR} 0 0 1 ${f(bx)} ${f(by)}`;
})();
const arrowHead = (() => {
  const tip = pt(54, WR, WR);
  const p1 = pt(44, WR - 11, WR - 11);
  const p2 = pt(44, WR + 11, WR + 11);
  return `${f(tip[0])},${f(tip[1])} ${f(p1[0])},${f(p1[1])} ${f(p2[0])},${f(
    p2[1]
  )}`;
})();

// ---- Mini-ilustraciones de cada etapa (centradas en 0,0) ----
const GENE_ON = "#f1c40f";
const GENE_OFF = "#2f7fd6";

function bar(bits: number[], y: number, cross?: number): ReactNode {
  const w = 13;
  const gap = 2;
  const startX = -((bits.length * (w + gap) - gap) / 2);
  return bits.map((b, i) => (
    <rect
      key={`${y}-${i}`}
      x={startX + i * (w + gap)}
      y={y}
      width={w}
      height={w}
      rx={3}
      fill={i === cross ? "#e2433f" : b ? GENE_ON : GENE_OFF}
      stroke="rgba(0,0,0,0.14)"
    />
  ));
}

function art(id: string): ReactNode {
  switch (id) {
    case "pop": {
      const rows = [
        ["x₁", "100100", "1296"],
        ["x₂", "010010", "324"],
        ["x₃", "010110", "484"],
        ["x₄", "000001", "1"],
      ];
      return (
        <g>
          <rect
            x={-100}
            y={-58}
            width={200}
            height={116}
            rx={14}
            fill="#eaf7ef"
            stroke="#a9d9b8"
            strokeWidth={2}
          />
          <text x={-78} y={-36} fontSize={12.5} fontWeight={700} fill={INK}>
            ind
          </text>
          <text x={-26} y={-36} fontSize={12.5} fontWeight={700} fill={INK}>
            genotipo
          </text>
          <text
            x={84}
            y={-36}
            fontSize={12}
            fontStyle="italic"
            textAnchor="end"
            fill={INK}
          >
            fitness
          </text>
          {rows.map((r, i) => {
            const y = -14 + i * 20;
            return (
              <g key={r[0]}>
                <text x={-78} y={y} fontSize={13} fontWeight={700} fill={INK}>
                  {r[0]}
                </text>
                <text
                  x={-26}
                  y={y}
                  fontSize={13}
                  fill={INK}
                  fontFamily="ui-monospace, monospace"
                >
                  {r[1]}
                </text>
                <text x={84} y={y} fontSize={13} textAnchor="end" fill={INK}>
                  {r[2]}
                </text>
              </g>
            );
          })}
        </g>
      );
    }
    case "sel":
      return (
        <g>
          <circle r={31} fill="#f1c40f" stroke="#fff" strokeWidth={2.5} />
          <path d="M0 0 L31 0 A31 31 0 0 1 -23.7 19.9 Z" fill="#2f7fd6" />
          <path
            d="M0 0 L-23.7 19.9 A31 31 0 0 1 -26.8 -15.5 Z"
            fill="#34a558"
          />
          <path
            d="M0 0 L-26.8 -15.5 A31 31 0 0 1 -10.6 -29.1 Z"
            fill="#e2433f"
          />
          <circle r={31} fill="none" stroke="#fff" strokeWidth={2.5} />
          <polygon points="0,-40 -6,-31 6,-31" fill={INK} />
        </g>
      );
    case "repro":
      return (
        <g>
          {bar([1, 1, 0, 1, 0, 0], -16)}
          {bar([0, 0, 1, 0, 1, 1], 4)}
        </g>
      );
    case "cross":
      return (
        <g>
          {bar([1, 1, 0, 0, 1, 1], -22)}
          {bar([0, 1, 1, 1, 0, 0], 10, 4)}
          <path
            d="M-30 -9 L-6 23 M-6 -9 L-30 23"
            stroke={INK}
            strokeWidth={1.6}
            fill="none"
          />
        </g>
      );
    case "newpop":
      return (
        <g>
          {bar([1, 0, 1, 1, 0, 1], -16)}
          {bar([0, 1, 1, 0, 1, 0], 4)}
        </g>
      );
    case "eval":
      return (
        <g>
          <rect
            x={-48}
            y={-34}
            width={96}
            height={68}
            rx={16}
            fill="#fff6da"
            stroke="#e7c84d"
            strokeWidth={2}
          />
          <text
            x={0}
            y={2}
            fontSize={26}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="ui-monospace, monospace"
            fontWeight={700}
            fill={INK}
          >
            f(∘)
          </text>
        </g>
      );
    default:
      return null;
  }
}

type Stage = { id: string; a: number; lines: string[]; ly: number };
const STAGES: Stage[] = [
  { id: "pop", a: -90, lines: ["Población"], ly: 84 },
  { id: "sel", a: -30, lines: ["Selección de", "progenitores"], ly: 56 },
  { id: "repro", a: 30, lines: ["Reproducción"], ly: 52 },
  { id: "cross", a: 90, lines: ["Cruce y mutación"], ly: 52 },
  { id: "newpop", a: 150, lines: ["Nueva población"], ly: 52 },
  { id: "eval", a: 210, lines: ["Evaluación"], ly: 56 },
];

export function Evolutivo() {
  return (
    <motion.div
      className="evo"
      variants={wrap}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.3 }}
    >
      <motion.span variants={fade} className="evo-eyebrow">
        Optimización inspirada en la naturaleza
      </motion.span>
      <motion.h2 variants={fade} className="evo-title">
        ¿Qué es un algoritmo evolutivo?
      </motion.h2>
      <motion.p variants={fade} className="evo-lead">
        Una <strong>población</strong> de soluciones que mejora generación tras
        generación imitando la <strong>selección natural</strong>.
      </motion.p>

      <motion.div variants={fade} className="evo-figure">
        <svg viewBox="0 0 1000 660" role="img" aria-label="Ciclo de un algoritmo evolutivo">
          <defs>
            <marker
              id="evoArrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0 0 L10 5 L0 10 z" fill={INK} />
            </marker>
            <filter id="evoSoft" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="4"
                stdDeviation="6"
                floodColor="#0b1b34"
                floodOpacity="0.12"
              />
            </filter>
          </defs>

          {/* Flechas del ciclo */}
          {CONNECTORS.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={INK}
              strokeWidth={3}
              strokeLinecap="round"
              markerEnd="url(#evoArrow)"
            />
          ))}

          {/* Rueda central */}
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`0 ${CX} ${CY}`}
              to={`360 ${CX} ${CY}`}
              dur="22s"
              repeatCount="indefinite"
            />
            {WHEEL.map((color, k) => (
              <g key={k} transform={`rotate(${k * 60} ${CX} ${CY})`}>
                <path
                  d={seg}
                  fill="none"
                  stroke={color}
                  strokeWidth={15}
                  strokeLinecap="butt"
                />
                <polygon points={arrowHead} fill={color} />
              </g>
            ))}
            <circle cx={CX} cy={CY} r={52} fill="#fff" />
          </g>
          <text
            x={CX}
            y={CY}
            fontSize={22}
            fontWeight={800}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#0b1b34"
          >
            Evolución
          </text>

          {/* Etapas */}
          {STAGES.map((s) => {
            const [x, y] = pt(s.a, NRX, NRY);
            return (
              <g key={s.id} transform={`translate(${f(x)} ${f(y)})`} filter="url(#evoSoft)">
                {art(s.id)}
                {s.lines.map((line, i) => (
                  <text
                    key={line}
                    x={0}
                    y={s.ly + i * 19}
                    fontSize={15.5}
                    fontWeight={700}
                    textAnchor="middle"
                    fill="#0b1b34"
                  >
                    {line}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
      </motion.div>
    </motion.div>
  );
}
