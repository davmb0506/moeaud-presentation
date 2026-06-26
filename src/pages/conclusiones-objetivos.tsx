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

const ACCENT = "#2b6ef2";
const RED = "#d6455a";
const GREEN = "#34d399";
const WARN = "#e8590c";

// 1. Compromiso: dos ejes + curva de Pareto decreciente.
function GlyphTradeoff() {
  return (
    <svg viewBox="0 0 120 84" className="concl-glyph">
      <line x1="18" y1="10" x2="18" y2="68" className="cg-axis" />
      <line x1="18" y1="68" x2="108" y2="68" className="cg-axis" />
      <path
        d="M24 18 C 45 22, 55 50, 102 62"
        fill="none"
        stroke={ACCENT}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="1 5"
      />
      {[
        [27, 19],
        [44, 28],
        [66, 47],
        [100, 61],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill={ACCENT} stroke="#fff" strokeWidth="1.3" />
      ))}
    </svg>
  );
}

// 2. Mecanismos ganan: barras 43.9 (con) vs 30.8 (sin).
function GlyphBars() {
  const baseY = 70;
  const conH = 52;
  const sinH = 52 * (30.8 / 43.9);
  return (
    <svg viewBox="0 0 120 84" className="concl-glyph">
      <line x1="14" y1={baseY} x2="106" y2={baseY} className="cg-axis" />
      <rect x="34" y={baseY - conH} width="22" height={conH} rx="3" fill={ACCENT} />
      <rect x="66" y={baseY - sinH} width="22" height={sinH} rx="3" fill={RED} />
      <text x="45" y={baseY - conH - 5} className="cg-num" textAnchor="middle">43.9</text>
      <text x="77" y={baseY - sinH - 5} className="cg-num" textAnchor="middle">30.8</text>
      <text x="45" y={baseY + 12} className="cg-tick" textAnchor="middle">con</text>
      <text x="77" y={baseY + 12} className="cg-tick" textAnchor="middle">sin</text>
    </svg>
  );
}

// 3. Sesgo de motivo: hebra β (flecha) vs hélice α (cilindro).
function GlyphMotif() {
  return (
    <svg viewBox="0 0 120 84" className="concl-glyph">
      {/* β-strand: flecha */}
      <path
        d="M16 30 L44 30 L44 24 L56 35 L44 46 L44 40 L16 40 Z"
        fill={ACCENT}
      />
      <text x="36" y="60" className="cg-tick" textAnchor="middle" fill={ACCENT}>β</text>
      {/* α-helix: espiral */}
      <path
        d="M70 35 q6 -13 12 0 q6 13 12 0 q6 -13 12 0"
        fill="none"
        stroke={RED}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M70 41 q6 -13 12 0 q6 13 12 0 q6 -13 12 0"
        fill="none"
        stroke={RED}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.4"
      />
      <text x="88" y="62" className="cg-tick" textAnchor="middle" fill={RED}>α</text>
    </svg>
  );
}

// 4. Sin validez física: dos formas que se solapan (choque).
function GlyphClash() {
  return (
    <svg viewBox="0 0 120 84" className="concl-glyph">
      <circle cx="50" cy="42" r="24" fill={ACCENT} opacity="0.22" stroke={ACCENT} strokeWidth="2" />
      <circle cx="70" cy="42" r="18" fill={GREEN} opacity="0.3" stroke={GREEN} strokeWidth="2" />
      {/* chispas de colisión en el solape */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => {
        const r1 = 4;
        const r2 = 9;
        const rad = (a * Math.PI) / 180;
        const cx = 60;
        const cy = 42;
        return (
          <line
            key={i}
            x1={cx + r1 * Math.cos(rad)}
            y1={cy + r1 * Math.sin(rad)}
            x2={cx + r2 * Math.cos(rad)}
            y2={cy + r2 * Math.sin(rad)}
            stroke={WARN}
            strokeWidth="2"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

// 5. Falta objetivo físico: ejes PAE/pLDDT + un eje físico que se suma.
function GlyphAddObjective() {
  return (
    <svg viewBox="0 0 120 84" className="concl-glyph">
      <line x1="34" y1="14" x2="34" y2="66" className="cg-axis" />
      <line x1="34" y1="66" x2="92" y2="66" className="cg-axis" />
      {/* tercer eje (físico) emergente, en verde */}
      <line x1="34" y1="66" x2="66" y2="38" stroke={GREEN} strokeWidth="2.5" strokeDasharray="4 3" strokeLinecap="round" />
      {/* badge + */}
      <circle cx="70" cy="34" r="12" fill={GREEN} />
      <line x1="70" y1="28" x2="70" y2="40" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <line x1="64" y1="34" x2="76" y2="34" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

type Tile = {
  glyph: React.ReactNode;
  title: string;
  sub: string;
  key?: boolean;
};

const TILES: Tile[] = [
  { glyph: <GlyphTradeoff />, title: "Compromiso real", sub: "PAE ↔ pLDDT, no un único óptimo" },
  { glyph: <GlyphBars />, title: "Mecanismos ganan", sub: "más frente · HV mayor (p = 0.0091)" },
  { glyph: <GlyphMotif />, title: "Sesgo de motivo", sub: "con → hoja β · sin → hélice α" },
  { glyph: <GlyphClash />, title: "Sin validez física", sub: "AF no penaliza choques", key: true },
  { glyph: <GlyphAddObjective />, title: "Falta objetivo físico", sub: "+ validación in silico" },
];

export function ConclusionesObjetivos() {
  return (
    <motion.div
      className="concl"
      variants={wrap}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.15 }}
    >
      <motion.h2 variants={fade} className="concl-title">
        Conclusiones del par Interface-PAE / pLDDT
      </motion.h2>

      <div className="concl-tiles">
        {TILES.map((t, i) => (
          <motion.div
            key={i}
            className={"concl-tile" + (t.key ? " key" : "")}
            variants={fade}
            initial="hidden"
            whileInView="visible"
            viewport={{ amount: 0.2, once: true }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.06 }}
          >
            <span className="concl-step">{i + 1}</span>
            {t.glyph}
            <h3 className="concl-tile-title">{t.title}</h3>
            <p className="concl-tile-sub">{t.sub}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
