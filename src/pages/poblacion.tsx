import { useMemo, useState, type ReactNode } from "react";
import {
  motion,
  AnimatePresence,
  LayoutGroup,
  type Variants,
} from "framer-motion";

type Individuo = {
  id: number;
  genes: number[];
  tag?: "padre" | "hijo" | "descartado";
};

const GENES = 6;
const POP = 6;

const COLOR_ON = "#f5c518";
const COLOR_OFF = "#2f7fd6";

const fade: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const fitness = (genes: number[]) => {
  const dec = parseInt(genes.join(""), 2);
  return dec * dec; // f(x) = x²  (igual que en el diagrama)
};

const randomGenes = () =>
  Array.from({ length: GENES }, () => (Math.random() < 0.5 ? 0 : 1));

const initialPop = (): Individuo[] => [
  { id: 1, genes: [1, 0, 0, 1, 0, 0] },
  { id: 2, genes: [0, 1, 0, 0, 1, 0] },
  { id: 3, genes: [0, 1, 0, 1, 1, 0] },
  { id: 4, genes: [0, 0, 0, 0, 0, 1] },
  { id: 5, genes: [1, 0, 1, 1, 1, 0] },
  { id: 6, genes: [1, 1, 0, 0, 1, 0] },
];

type Phase = "inicio" | "seleccion" | "cruce" | "mutacion";

const STEP_LABEL: Record<Phase, string> = {
  inicio: "Seleccionar",
  seleccion: "Cruzar",
  cruce: "Mutar",
  mutacion: "Nueva generación",
};

const PHASE_TITLE: Record<Phase, string> = {
  inicio: "Población",
  seleccion: "Selección",
  cruce: "Cruce",
  mutacion: "Mutación",
};

const PHASE_DESC: Record<Phase, string> = {
  inicio:
    "Conjunto de soluciones candidatas. Cada individuo codifica una solución como un genotipo (cadena binaria de longitud ℓ), evaluado por la función de aptitud f.",
  seleccion:
    "Selección de progenitores por torneo binario (k=2): se muestrean 2 individuos de forma uniforme y se reproduce el de mayor aptitud. Se realizan dos torneos para obtener los dos progenitores.",
  cruce:
    "Recombinación: con probabilidad p_c se aplica cruce de un punto entre dos progenitores, intercambiando segmentos del genotipo; con probabilidad 1−p_c la descendencia los replica.",
  mutacion:
    "Mutación bit-flip: cada gen se invierte de forma independiente con probabilidad p_m (típicamente p_m ≈ 1/ℓ), introduciendo variación que preserva la exploración del espacio de búsqueda.",
};

const K_TORNEO = 2; // tamaño del torneo (binario)

// Toma k candidatos al azar (sin repetir) para un torneo.
const pickK = (cands: Individuo[], k: number): Individuo[] => {
  const pool = [...cands];
  const out: Individuo[] = [];
  for (let i = 0; i < Math.min(k, pool.length); i += 1) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
};

// Gana el de mayor aptitud.
const best = (arr: Individuo[]): Individuo =>
  arr.reduce((b, c) => (fitness(c.genes) > fitness(b.genes) ? c : b), arr[0]);

export function Poblacion({ intro }: { intro?: ReactNode }) {
  const [pop, setPop] = useState<Individuo[]>(initialPop);
  const [phase, setPhase] = useState<Phase>("inicio");
  const [, setGen] = useState(1); // contador de generación (no se muestra)
  const [mutatedCells, setMutatedCells] = useState<
    { id: number; idx: number }[]
  >([]);
  const [pc, setPc] = useState(0.9); // tasa de cruce
  const [pm, setPm] = useState(0.15); // tasa de mutación por gen
  const [contenders, setContenders] = useState<number[]>([]); // compitieron y perdieron
  const [started, setStarted] = useState(false); // gate: primero se enuncia el problema
  const [, setOutcome] = useState<{ text: string; ok: boolean } | null>(
    null
  ); // resultado del último sorteo (cruce/mutación)
  const nextId = useMemo(() => ({ v: POP + 1 }), []);

  const next = () => {
    if (phase === "inicio" || phase === "mutacion") {
      // Evaluar + SELECCIÓN DE PROGENITORES por torneo.
      setMutatedCells([]);
      // Ordenar por aptitud (para mostrar ranking) y limpiar etiquetas.
      const ranked: Individuo[] = [...pop]
        .sort((a, b) => fitness(b.genes) - fitness(a.genes))
        .map((ind) => ({ ...ind, tag: undefined }));

      // Torneo A
      const groupA = pickK(ranked, K_TORNEO);
      const winA = best(groupA);
      // Torneo B (excluye al ganador de A)
      const groupB = pickK(
        ranked.filter((i) => i.id !== winA.id),
        K_TORNEO
      );
      const winB = best(groupB);

      const winners = new Set([winA.id, winB.id]);
      const competed = [...groupA, ...groupB]
        .map((i) => i.id)
        .filter((id) => !winners.has(id));

      const tagged = ranked.map((i) => ({
        ...i,
        tag: winners.has(i.id) ? ("padre" as const) : undefined,
      }));
      const labelOf = (id: number) =>
        `X${tagged.findIndex((t) => t.id === id) + 1}`;
      const aTxt = groupA.map((g) => labelOf(g.id)).join(" vs ");
      const bTxt = groupB.map((g) => labelOf(g.id)).join(" vs ");
      setPop(tagged);
      setContenders([...new Set(competed)]);
      setOutcome({
        text: `Torneo binario — A: ${aTxt} → gana ${labelOf(
          winA.id
        )} · B: ${bTxt} → gana ${labelOf(winB.id)}`,
        ok: true,
      });
      if (phase === "mutacion") setGen((g) => g + 1);
      setPhase("seleccion");
      return;
    }

    if (phase === "seleccion") {
      // Operador de CRUCE entre los progenitores, aplicado con probabilidad pc.
      const parents = pop.filter((i) => i.tag === "padre");
      if (parents.length < 2) return;
      const [p1, p2] = parents;
      const r = Math.random();
      const applied = r < pc;

      let childA: number[];
      let childB: number[];
      if (applied) {
        const cut = 1 + Math.floor(Math.random() * (GENES - 1));
        childA = [...p1.genes.slice(0, cut), ...p2.genes.slice(cut)];
        childB = [...p2.genes.slice(0, cut), ...p1.genes.slice(cut)];
        setOutcome({
          text: `Cruce aplicado: r = ${r.toFixed(2)} < pc = ${pc.toFixed(
            2
          )} (corte tras el gen ${cut})`,
          ok: true,
        });
      } else {
        childA = [...p1.genes];
        childB = [...p2.genes];
        setOutcome({
          text: `Sin cruce: r = ${r.toFixed(2)} ≥ pc = ${pc.toFixed(
            2
          )} (la descendencia copia a los progenitores)`,
          ok: false,
        });
      }

      // Reemplazo: los 2 peores NO-padres salen; el resto sobrevive.
      const nonParents = pop.filter((i) => i.tag !== "padre");
      const doomed = new Set(
        [...nonParents]
          .sort((a, b) => fitness(a.genes) - fitness(b.genes))
          .slice(0, 2)
          .map((i) => i.id)
      );
      const survivors = pop
        .filter((i) => !doomed.has(i.id))
        .map((i) => ({
          ...i,
          tag: i.tag === "padre" ? ("padre" as const) : undefined,
        }));
      const hijos: Individuo[] = [
        { id: nextId.v++, genes: childA, tag: "hijo" },
        { id: nextId.v++, genes: childB, tag: "hijo" },
      ];
      setContenders([]);
      setPop([...survivors, ...hijos]);
      setPhase("cruce");
      return;
    }

    if (phase === "cruce") {
      // Operador de MUTACIÓN: cada gen de cada hijo se invierte con prob. pm.
      const flips: { id: number; idx: number }[] = [];
      const newPop = pop.map((ind) => {
        if (ind.tag !== "hijo") return ind;
        const genes = ind.genes.map((g, i) => {
          if (Math.random() < pm) {
            flips.push({ id: ind.id, idx: i });
            return g ? 0 : 1;
          }
          return g;
        });
        return { ...ind, genes };
      });
      setPop(newPop);
      setMutatedCells(flips);
      setOutcome({
        text:
          flips.length > 0
            ? `Mutación: ${flips.length} ${
                flips.length === 1 ? "gen invertido" : "genes invertidos"
              } (pm = ${pm.toFixed(2)} por gen)`
            : `Sin mutaciones: ningún gen se invirtió (pm = ${pm.toFixed(2)})`,
        ok: flips.length > 0,
      });
      setPhase("mutacion");
      return;
    }
  };

  const restart = (genes: () => Individuo[]) => {
    setPop(genes());
    setPhase("inicio");
    setGen(1);
    setMutatedCells([]);
    setContenders([]);
    setOutcome(null);
    nextId.v = POP + 1;
  };

  return (
    <motion.div
      className="pob"
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
          {!started ? (
            <motion.div
              className="pob-problem"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <span className="pob-problem-tag">Problema de ejemplo</span>
              <h3 className="pob-problem-title">
                Maximizar <span className="pob-problem-fx">f(x) = x²</span>
              </h3>
              <p className="pob-problem-desc">
                Cada individuo es un genotipo de <strong>6 bits</strong> que
                codifica un entero <strong>x ∈ [0, 63]</strong>. La aptitud es{" "}
                <strong>f(x) = x²</strong>; el algoritmo busca el genotipo que la
                maximiza (óptimo en <code>111111</code>, x = 63, f = 3969).
              </p>
              <button className="molecule-button" onClick={() => setStarted(true)}>
                Comenzar
              </button>
            </motion.div>
          ) : (
          <>
          <div className="pob-table">
            <div className="pob-colhead">
              <span className="pob-corner" />
              <span className="pob-th pob-th-geno">Genotipo</span>
              <span className="pob-th">Fitness</span>
            </div>

            <LayoutGroup>
          <AnimatePresence mode="popLayout" initial={false}>
            {pop.map((ind, i) => (
              <motion.div
                layout
                key={ind.id}
                className={`pob-row ${ind.tag ?? ""} ${
                  contenders.includes(ind.id) ? "contendiente" : ""
                }`}
                initial={{ opacity: 0, scale: 0.7, x: -40 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.7, x: 60 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
              >
                <span className="pob-label">X{i + 1}</span>

                <div className="pob-genes">
                  {ind.genes.map((g, idx) => {
                    const isMut = mutatedCells.some(
                      (m) => m.id === ind.id && m.idx === idx
                    );
                    return (
                      <motion.span
                        key={idx}
                        className="pob-gene"
                        animate={{
                          backgroundColor: isMut
                            ? "#e2433f"
                            : g
                            ? COLOR_ON
                            : COLOR_OFF,
                          color: g && !isMut ? "#3a2f00" : "#fff",
                          scale: isMut ? [1, 1.35, 1] : 1,
                        }}
                        transition={{ duration: isMut ? 0.5 : 0.3 }}
                      >
                        {g}
                      </motion.span>
                    );
                  })}
                </div>

                <motion.span layout className="pob-fit">
                  {fitness(ind.genes)}
                </motion.span>
              </motion.div>
              ))}
            </AnimatePresence>
          </LayoutGroup>
          </div>

          <div className="pob-operators">
            <label className="pob-op">
              <span>
                Prob. de cruce <strong>pc = {pc.toFixed(2)}</strong>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={pc}
                onChange={(e) => setPc(parseFloat(e.target.value))}
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
                    genes: randomGenes(),
                  }))
                )
              }
            >
              Aleatorizar
            </button>
          </div>

          

          <ul className="pob-legend pob-legend-inline">
            <li>
              <span className="pob-dot green" /> Progenitor (ganó el torneo)
            </li>
            <li>
              <span className="pob-dot amber" /> Compitió y perdió
            </li>
            <li>
              <span className="pob-dot violet" /> Hijo (nuevo)
            </li>
          </ul>
          </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
