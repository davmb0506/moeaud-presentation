import { useMemo, useState, type ReactNode } from "react";
import {
  motion,
  AnimatePresence,
  LayoutGroup,
  type Variants,
} from "framer-motion";

type Candidato = {
  id: number;
  seq: string[];
  tag?: "sel" | "descartado" | "variante";
};

const POP = 6;
const L = 8;

// Colores de los residuos que cambian, según el operador que los produjo.
const MUT_COLOR = "#e2433f"; // mutación aleatoria
const MPNN_COLOR = "#6a5cff"; // rediseño dirigido con ProteinMPNN

const fade: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

// ---- Aminoacidos y propiedades (para colorear los chips) ----
const ALPHABET = "ACDEFGHIKLMNPQRSTVWY".split("");

type AaGroup = "hydro" | "polar" | "pos" | "neg" | "special";

const GROUP: Record<string, AaGroup> = {
  A: "hydro", V: "hydro", L: "hydro", I: "hydro", M: "hydro", F: "hydro", W: "hydro",
  S: "polar", T: "polar", N: "polar", Q: "polar", Y: "polar", C: "polar",
  K: "pos", R: "pos", H: "pos",
  D: "neg", E: "neg",
  G: "special", P: "special",
};

const aaGroup = (a: string): AaGroup => GROUP[a] ?? "polar";

// Color distinto por aminoácido (paleta de 20 colores distinguibles).
const AA_COLOR: Record<string, string> = {
  A: "#e6194b", R: "#3cb44b", N: "#ffe119", D: "#4363d8", C: "#f58231",
  Q: "#911eb4", E: "#42d4f4", G: "#f032e6", H: "#bfef45", I: "#fabed4",
  L: "#469990", K: "#dcbeff", M: "#9a6324", F: "#d4b106", P: "#800000",
  S: "#aaffc3", T: "#808000", W: "#ffa472", Y: "#000075", V: "#a9a9a9",
};

// Texto blanco o negro según la luminancia del fondo, para legibilidad.
const textOn = (hex: string): string => {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#1b2330" : "#fff";
};

// ---- Modelo de aptitud (simulacion determinista de metricas de AF2) ----
// Secuencia objetivo oculta + pesos por posicion (interfaz mas importante al centro).
const TARGET = "WYKLVRFE".split("");
const WEIGHTS = [0.6, 0.8, 1.2, 1.4, 1.4, 1.2, 0.8, 0.6];
const WSUM = WEIGHTS.reduce((s, w) => s + w, 0);

const posScore = (a: string, b: string): number => {
  if (a === b) return 1;
  return aaGroup(a) === aaGroup(b) ? 0.5 : 0;
};

type Metrics = { plddt: number; pae: number; contacts: number; score: number };

const evaluate = (seq: string[]): Metrics => {
  let acc = 0;
  for (let i = 0; i < L; i += 1) acc += WEIGHTS[i] * posScore(seq[i], TARGET[i]);
  const m = acc / WSUM; // 0..1

  const plddt = Math.round(45 + 55 * m); // 45..100 (mayor mejor)
  const pae = Math.round((30 - 22 * m) * 10) / 10; // ~30..8 A (menor mejor)
  const contacts = Math.round(3 + 15 * m); // 3..18

  const score = Math.round(
    100 * (0.5 * (plddt / 100) + 0.3 * (1 - pae / 30) + 0.2 * (contacts / 18))
  );
  return { plddt, pae, contacts, score };
};

const randomSeq = () =>
  Array.from({ length: L }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]);

const randomDiff = (a: string): string => {
  let b = a;
  while (b === a) b = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return b;
};

// ProteinMPNN: rediseño condicionado a la estructura. En esta simulación
// propone residuos compatibles con el plegado (sesgados al objetivo oculto),
// lo que tiende a mejorar la aptitud, a diferencia de la mutación aleatoria.
const mpnnRedesign = (idx: number, a: string): string => {
  if (Math.random() < 0.7) return TARGET[idx];
  const group = aaGroup(TARGET[idx]);
  const sameGroup = ALPHABET.filter((x) => aaGroup(x) === group && x !== a);
  return sameGroup.length
    ? sameGroup[Math.floor(Math.random() * sameGroup.length)]
    : randomDiff(a);
};

const initialPop = (): Candidato[] => [
  { id: 1, seq: "GKWLAFDE".split("") },
  { id: 2, seq: "SARLVKTE".split("") },
  { id: 3, seq: "WYRLVKFE".split("") },
  { id: 4, seq: "AAGLPNSE".split("") },
  { id: 5, seq: "DKWMVRYE".split("") },
  { id: 6, seq: "TTGISNQP".split("") },
];

type Phase = "inicial" | "evaluacion" | "eliminar" | "offspring";

// Etiqueta del botón = acción que ejecuta la siguiente fase del ciclo EvoPro.
const STEP_LABEL: Record<Phase, string> = {
  inicial: "Evaluar con AF2",
  evaluacion: "Eliminar peor mitad",
  eliminar: "Generar offspring",
  offspring: "Siguiente",
};

const PHASE_TITLE: Record<Phase, string> = {
  inicial: "Población inicial",
  evaluacion: "Evaluación con AF2",
  eliminar: "Eliminar peor mitad",
  offspring: "Generar offspring",
};

const PHASE_DESC: Record<Phase, string> = {
  inicial:
    "Conjunto inicial de secuencias candidatas de péptidos binder de novo. Cada individuo codifica una solución como una cadena de aminoácidos.",
  evaluacion:
    "Cada candidato se pliega junto al target con AlphaFold2 y se le asigna una aptitud (score) a partir de la confianza de la predicción y la interfaz.",
  eliminar:
    "Supervivencia por selección elitista: se conserva la mitad superior según el score y se elimina la peor mitad.",
  offspring:
    "Los supervivientes generan la descendencia que rellena la población: mutación (operador principal) y, cada N generaciones, rediseño con ProteinMPNN. El ciclo vuelve a la evaluación hasta cumplir el criterio de paro.",
};

export function Evopro({ intro }: { intro?: ReactNode }) {
  const [pop, setPop] = useState<Candidato[]>(initialPop);
  const [phase, setPhase] = useState<Phase>("inicial");
  const [gen, setGen] = useState(1);
  const [mutatedCells, setMutatedCells] = useState<{ id: number; idx: number }[]>([]);
  const [pm, setPm] = useState(0.15);
  const [mpnnEvery, setMpnnEvery] = useState(3);
  // Operador que generó las variantes actuales (para colorear los cambios).
  const [variantOp, setVariantOp] = useState<"mpnn" | "mut">("mut");
  const nextId = useMemo(() => ({ v: POP + 1 }), []);

  // El operador de diversificación: ProteinMPNN cada N generaciones; el resto, mutación.
  const mpnnThisGen = gen % mpnnEvery === 0;

  // El score de un individuo solo se muestra cuando AF2 ya lo evaluó:
  // antes de la primera evaluación y para la descendencia recién generada se oculta.
  const scoreShown = (ind: Candidato) =>
    phase !== "inicial" && ind.tag !== "variante";

  // Evaluación con AF2: revela el score de toda la población y la ordena.
  const evaluar = () => {
    setMutatedCells([]);
    const ranked = [...pop]
      .map((c) => ({ ...c, tag: undefined }))
      .sort((a, b) => evaluate(b.seq).score - evaluate(a.seq).score);
    setPop(ranked);
    setPhase("evaluacion");
  };

  const next = () => {
    if (phase === "inicial") {
      // Evaluación inicial con AF2.
      evaluar();
      return;
    }

    if (phase === "evaluacion") {
      // Eliminar peor mitad (selección elitista): marca supervivientes y descartados.
      const keep = Math.floor(POP / 2);
      const tagged = pop.map((c, i) => ({
        ...c,
        tag: (i < keep ? "sel" : "descartado") as Candidato["tag"],
      }));
      setPop(tagged);
      setPhase("eliminar");
      return;
    }

    if (phase === "eliminar") {
      // Generar offspring: los supervivientes producen descendencia (mutación o
      // ProteinMPNN) que reemplaza a la peor mitad eliminada.
      const survivors = pop.filter((c) => c.tag === "sel");
      if (survivors.length < 1) return;
      const needed = POP - survivors.length;
      const flips: { id: number; idx: number }[] = [];
      const variants: Candidato[] = [];

      for (let i = 0; i < needed; i += 1) {
        const parent = survivors[i % survivors.length];
        const id = nextId.v++;

        const childSeq = parent.seq.map((a, idx) => {
          if (mpnnThisGen) {
            // ProteinMPNN rediseña cada residuo con prob. 0.6.
            if (Math.random() < 0.6) {
              const r = mpnnRedesign(idx, a);
              if (r !== a) {
                flips.push({ id, idx });
                return r;
              }
            }
            return a;
          }
          // Mutación puntual por residuo con probabilidad pm.
          if (Math.random() < pm) {
            flips.push({ id, idx });
            return randomDiff(a);
          }
          return a;
        });

        variants.push({ id, seq: childSeq, tag: "variante" });
      }

      const carried = survivors.map((c) => ({ ...c, tag: undefined }));
      setPop([...carried, ...variants]);
      setMutatedCells(flips);
      setVariantOp(mpnnThisGen ? "mpnn" : "mut");
      setPhase("offspring");
      return;
    }

    if (phase === "offspring") {
      // ¿Criterio de paro? No → nueva generación: el ciclo vuelve a la evaluación.
      setGen((g) => g + 1);
      evaluar();
      return;
    }
  };

  const restart = (seqs: () => Candidato[]) => {
    setPop(seqs());
    setPhase("inicial");
    setGen(1);
    setMutatedCells([]);
    nextId.v = POP + 1;
  };

  return (
    <motion.div
      className="pob epro"
      variants={fade}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.3 }}
    >
      <div className="pob-layout">
        <aside className="pob-aside">
          
          {intro ?? (
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                className="pob-slide"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.35 }}
              >
                <h3 className="pob-slide-title">{PHASE_TITLE[phase]}</h3>
                <p className="pob-slide-desc">{PHASE_DESC[phase]}</p>
              </motion.div>
            </AnimatePresence>
          )}
        </aside>

        <div className="pob-main">
          <div className="pob-table">
            <div className="epro-colhead">
              <span className="pob-th pob-th-geno">Secuencia</span>
              <span className="pob-th">Score</span>
            </div>

            <LayoutGroup>
              <AnimatePresence mode="popLayout" initial={false}>
                {pop.map((ind) => {
                  const m = evaluate(ind.seq);
                  return (
                    <motion.div
                      layout
                      key={ind.id}
                      className={`epro-row ${ind.tag ?? ""}`}
                      initial={{ opacity: 0, scale: 0.7, x: -40 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.7, x: 60 }}
                      transition={{ type: "spring", stiffness: 320, damping: 30 }}
                    >
                      <div className="epro-seq">
                        {ind.seq.map((a, idx) => {
                          const isChanged = mutatedCells.some(
                            (f) => f.id === ind.id && f.idx === idx
                          );
                          const changeColor =
                            variantOp === "mpnn" ? MPNN_COLOR : MUT_COLOR;
                          const bg = isChanged
                            ? changeColor
                            : AA_COLOR[a] ?? "#94a3b8";
                          return (
                            <motion.span
                              key={idx}
                              className={`aa ${isChanged ? "mut" : ""}`}
                              style={{
                                backgroundColor: bg,
                                color: textOn(bg),
                                boxShadow: isChanged
                                  ? `0 0 0 2px ${changeColor}59`
                                  : undefined,
                              }}
                              animate={{ scale: isChanged ? [1, 1.35, 1] : 1 }}
                              transition={{ duration: isChanged ? 0.5 : 0.25 }}
                            >
                              {a}
                            </motion.span>
                          );
                        })}
                      </div>

                      <motion.span layout className="epro-score">
                        {scoreShown(ind) ? m.score : "—"}
                      </motion.span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </LayoutGroup>
          </div>

          <div className="pob-operators">
            <label className="pob-op">
              <span>
                ProteinMPNN cada <strong>{mpnnEvery} gen.</strong>
              </span>
              <input
                type="range"
                min={2}
                max={6}
                step={1}
                value={mpnnEvery}
                onChange={(e) => setMpnnEvery(parseInt(e.target.value, 10))}
              />
            </label>
            <label className="pob-op">
              <span>
                Prob. de mutación <strong>pm = {pm.toFixed(2)}</strong>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={pm}
                onChange={(e) => setPm(parseFloat(e.target.value))}
              />
            </label>
          </div>

          {/* Calendario de generaciones: deja claro CUÁNDO entra ProteinMPNN */}
          <div className="epro-mpnn">
            <div className="epro-timeline" role="img" aria-label="calendario de generaciones">
              {Array.from({ length: 9 }, (_, k) => {
                const g = Math.max(1, gen - 2) + k;
                const isMpnn = g % mpnnEvery === 0;
                const isNow = g === gen;
                return (
                  <span
                    key={g}
                    className={`epro-gen ${isMpnn ? "mpnn" : "mut"} ${
                      isNow ? "now" : ""
                    }`}
                    title={
                      isMpnn ? "rediseño con ProteinMPNN" : "mutación puntual"
                    }
                  >
                    {g}
                  </span>
                );
              })}
              <span className="epro-gen-more">…</span>
            </div>
          </div>

          <div className="pob-controls">
            <button className="molecule-button" onClick={next}>
              {STEP_LABEL[phase]}
            </button>
            <button className="pob-ghost" onClick={() => restart(initialPop)}>
              Reiniciar
            </button>
            <button
              className="pob-ghost"
              onClick={() =>
                restart(() =>
                  Array.from({ length: POP }, (_, i) => ({
                    id: i + 1,
                    seq: randomSeq(),
                  }))
                )
              }
            >
              Aleatorizar
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
