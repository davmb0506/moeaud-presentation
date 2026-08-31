import { useEffect, useMemo, useRef } from "react";
import {
  LayoutGroup,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";

const wrap: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

/* Cada pez es un tono (0–360°). La aptitud es la cercanía al rojo (0°).
   Paleta inicial: cálidos + fríos (sin franja verde-lima 70–160°). */

const POP = 8;
const KEEP = 4;
const GENS = 5;
const SEED = 6;
const SIGMA = 28;
const MUT_P = 0.4; // no todos los hijos mutan
const START_HUES = [8, 28, 42, 205, 230, 265, 300, 330];

function mulberry32(a: number) {
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const wrapHue = (h: number) => ((h % 360) + 360) % 360;
const redness = (h: number) =>
  1 - Math.min(Math.abs(h), 360 - Math.abs(h)) / 180;

function lerpHue(a: number, b: number, t: number) {
  const d = ((b - a + 540) % 360) - 180;
  return wrapHue(a + d * t);
}

function hueCss(h: number): string {
  const [r, g, b] = fishRgb(h);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Mismo tintado que el cuerpo del pez (sat/L + piso de luminancia). */
function fishRgb(h: number): [number, number, number] {
  let [r, g, b] = hslToRgb(wrapHue(h), 0.82, 0.55);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (lum < 150) {
    const s = 150 / lum;
    r = Math.min(255, Math.round(r * s));
    g = Math.min(255, Math.round(g * s));
    b = Math.min(255, Math.round(b * s));
  }
  return [r, g, b];
}

const SPRITES = [
  "/img/fish/fish-01.png?v=7",
  "/img/fish/fish-02.png?v=7",
  "/img/fish/fish-03.png?v=7",
  "/img/fish/fish-04.png?v=7",
  "/img/fish/fish-05.png?v=7",
  "/img/fish/fish-06.png?v=7",
  "/img/fish/fish-07.png?v=7",
  "/img/fish/fish-08.png?v=7",
] as const;

type Ind = { id: number; hue: number; spr: number };
type Kid = {
  id: number;
  mid: number;
  hue: number;
  mutated: boolean;
  pa: number;
  pb: number;
  spr: number;
};
type Generation = { pool: Ind[]; ranked: Ind[]; kids: Kid[] };

function buildRun(): Generation[] {
  const rnd = mulberry32(SEED);
  let nextId = 1;
  const mk = (hue: number, spr: number): Ind => ({
    id: nextId++,
    hue,
    spr,
  });

  const hues = [...START_HUES];
  for (let i = hues.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [hues[i], hues[j]] = [hues[j], hues[i]];
  }
  let pop: Ind[] = hues.map((hue, i) => mk(hue, i));

  const gens: Generation[] = [];
  for (let g = 0; g < GENS; g += 1) {
    const pool = pop.map((p) => ({ ...p }));
    pop = [...pop].sort((a, b) => redness(b.hue) - redness(a.hue));
    const ranked = pop.map((p) => ({ ...p }));
    const parents = pop.slice(0, KEEP);
    const kids: Kid[] = [];
    for (let k = 0; k < POP - KEEP; k += 1) {
      const pa = Math.floor(rnd() * KEEP);
      const pb = (pa + 1 + Math.floor(rnd() * (KEEP - 1))) % KEEP;
      const mid = lerpHue(parents[pa].hue, parents[pb].hue, 0.5);
      const mutated = rnd() < MUT_P;
      kids.push({
        id: nextId++,
        mid,
        hue: mutated ? wrapHue(mid + (rnd() * 2 - 1) * SIGMA) : mid,
        mutated,
        pa,
        pb,
        spr: parents[pa].spr,
      });
    }
    // Si por azar nadie mutó, fuerza una mutación visible.
    if (kids.length && !kids.some((k) => k.mutated)) {
      const i = Math.floor(rnd() * kids.length);
      const mid = kids[i].mid;
      kids[i] = {
        ...kids[i],
        mutated: true,
        hue: wrapHue(mid + (rnd() * 2 - 1) * SIGMA),
      };
    }
    gens.push({ pool, ranked, kids });
    pop = [
      ...parents,
      ...kids.map((k) => ({ id: k.id, hue: k.hue, spr: k.spr })),
    ];
  }

  const pool = pop.map((p) => ({ ...p }));
  pop = [...pop].sort((a, b) => redness(b.hue) - redness(a.hue));
  gens.push({ pool, ranked: pop.map((p) => ({ ...p })), kids: [] });
  return gens;
}

type Stage = 0 | 1 | 2 | 3;
type Frame = { gen: number; stage: Stage };

const FRAMES: Frame[] = [];
for (let g = 0; g < GENS; g += 1) {
  // 0 = estanque completo · 1 = selección · 2–3 = cruce / mutación
  ([0, 1, 2, 3] as Stage[]).forEach((s) => FRAMES.push({ gen: g, stage: s }));
}
FRAMES.push({ gen: GENS, stage: 0 });

export const AE_MAX_STEP = FRAMES.length - 1;

type CardState = "plain" | "keep" | "cull" | "parent" | "child";
type Card = {
  id: number;
  tag: string;
  hue: number;
  spr: number;
  state: CardState;
  note?: string;
  mutated?: boolean;
};

function cardsFor(gens: Generation[], frame: Frame): Card[] {
  const g = gens[frame.gen];

  if (frame.stage === 0) {
    return g.pool.map((ind, i) => ({
      id: ind.id,
      tag: `#${i + 1}`,
      hue: ind.hue,
      spr: ind.spr,
      state: "plain" as const,
    }));
  }

  if (frame.stage === 1) {
    return g.ranked.map((ind, i) => ({
      id: ind.id,
      tag: `#${i + 1}`,
      hue: ind.hue,
      spr: ind.spr,
      state: (i < KEEP ? "keep" : "cull") as CardState,
    }));
  }

  const parents: Card[] = g.ranked.slice(0, KEEP).map((ind, i) => ({
    id: ind.id,
    tag: `P${i + 1}`,
    hue: ind.hue,
    spr: ind.spr,
    state: "parent" as const,
  }));

  const kids: Card[] = g.kids.map((k, i) => ({
    id: k.id,
    tag: `H${i + 1}`,
    hue: frame.stage === 2 ? k.mid : k.hue,
    spr: k.spr,
    state: "child" as const,
    note: `P${k.pa + 1}×P${k.pb + 1}`,
    mutated: frame.stage === 3 && k.mutated,
  }));

  return [...parents, ...kids];
}

const spriteCache = new Map<string, HTMLImageElement>();

function loadSprite(src: string): Promise<HTMLImageElement> {
  const hit = spriteCache.get(src);
  if (hit && hit.complete && hit.naturalWidth > 0) return Promise.resolve(hit);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "sync";
    img.onload = () => {
      spriteCache.set(src, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

/** Solo recolorea grises del cuerpo. Negro (contorno/ojo) y blanco (brillo)
 *  se dejan tal cual, para no romper el pixel art. */
function colorize(img: HTMLImageElement, hue: number): HTMLCanvasElement {
  // Trabajar a 16×16 (nativo) y escalar con nearest-neighbor:
  // así el contorno de 1 px se ve como en Aseprite, no se diluye.
  const src = document.createElement("canvas");
  src.width = img.naturalWidth;
  src.height = img.naturalHeight;
  const sctx = src.getContext("2d")!;
  sctx.imageSmoothingEnabled = false;
  sctx.drawImage(img, 0, 0);
  const frame = sctx.getImageData(0, 0, src.width, src.height);
  const px = frame.data;
  // Cuerpo pastel (L alta) → el negro del contorno y el blanco del ojo no se pierden.
  let [tr, tg, tb] = fishRgb(hue);
  const w = src.width;
  const h = src.height;

  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3];
    if (a < 8) continue;
    const gray = (px[i] + px[i + 1] + px[i + 2]) / 3;

    // Contorno / pupila — incluye grises oscuros del trazo en Aseprite (~0x61)
    if (gray < 120) {
      px[i] = 0;
      px[i + 1] = 0;
      px[i + 2] = 0;
      continue;
    }
    // Solo el highlight del ojo (casi blanco puro). El CF≈207 del cuerpo se tiñe.
    if (gray > 245) {
      px[i] = 255;
      px[i + 1] = 255;
      px[i + 2] = 255;
      continue;
    }

    const f = 0.55 + 0.45 * (gray / 255);
    px[i] = Math.min(255, Math.round(tr * f));
    px[i + 1] = Math.min(255, Math.round(tg * f));
    px[i + 2] = Math.min(255, Math.round(tb * f));
  }

  sctx.putImageData(frame, 0, 0);

  const SCALE = 8;
  const canvas = document.createElement("canvas");
  canvas.width = w * SCALE;
  canvas.height = h * SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = wrapHue(h) / 360;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + hue * 12) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return [
    Math.round(f(0) * 255),
    Math.round(f(8) * 255),
    Math.round(f(4) * 255),
  ];
}

function FishSprite({
  hue,
  spr,
  flip,
}: {
  hue: number;
  spr: number;
  flip?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let live = true;
    const src = SPRITES[spr % SPRITES.length];
    loadSprite(src).then((img) => {
      if (!live || !canvasRef.current) return;
      const tinted = colorize(img, hue);
      canvas.width = tinted.width;
      canvas.height = tinted.height;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(tinted, 0, 0);
    });
    return () => {
      live = false;
    };
  }, [hue, spr]);

  return (
    <canvas
      ref={canvasRef}
      className="ae-sprite"
      style={{ transform: flip ? "scaleX(-1)" : undefined }}
      aria-hidden
    />
  );
}

function FishCard({
  card,
  prefersReduced,
  lift,
  enter,
  enterDelay = 0,
}: {
  card: Card;
  prefersReduced: boolean | null;
  lift?: "up" | "down" | "none";
  enter?: boolean;
  enterDelay?: number;
}) {
  const motionState =
    prefersReduced || !lift || lift === "none"
      ? { y: 0, scale: 1, opacity: 1 }
      : lift === "up"
        ? { y: 0, scale: 1.02, opacity: 1 }
        : { y: 0, scale: 0.92, opacity: 0.28 };

  return (
    <motion.div
      layout={!prefersReduced}
      layoutId={prefersReduced ? undefined : `ae-fish-${card.id}`}
      className="ae-fish"
      data-state={card.state}
      initial={
        enter && !prefersReduced
          ? { opacity: 0, y: 18, scale: 0.94 }
          : false
      }
      animate={motionState}
      transition={{
        layout: {
          type: "spring",
          stiffness: 90,
          damping: 18,
          mass: 1.05,
        },
        opacity: { duration: 0.55, delay: enter ? enterDelay : 0 },
        y: {
          duration: 0.55,
          delay: enter ? enterDelay : 0,
          ease: [0.22, 1, 0.36, 1],
        },
        scale: { duration: 0.5, delay: enter ? enterDelay : 0 },
      }}
    >
      <span className="ae-fish-tag">{card.tag}</span>
      <FishSprite hue={card.hue} spr={card.spr} flip={card.id % 2 === 1} />
      <span className="ae-fish-score">
        <i
          style={{
            width: `${Math.round(redness(card.hue) * 100)}%`,
            background: hueCss(card.hue),
          }}
        />
      </span>
      {card.note && <span className="ae-fish-note">{card.note}</span>}
      {card.mutated && <span className="ae-fish-mut">mutó</span>}
    </motion.div>
  );
}

export function AlgoritmosEvolutivos({ step = 0 }: { step?: number }) {
  const gens = useMemo(buildRun, []);
  const demoRef = useRef<HTMLDivElement | null>(null);
  const prefersReduced = useReducedMotion();
  const idx = prefersReduced
    ? AE_MAX_STEP
    : Math.max(0, Math.min(step, AE_MAX_STEP));

  const frame = FRAMES[idx];
  const cards = cardsFor(gens, frame);
  const done = frame.gen === GENS;
  const selecting = !done && frame.stage === 1;
  const crossing = !done && (frame.stage === 2 || frame.stage === 3);
  const measuring = frame.stage === 0 || done;
  const poolView = measuring || selecting;
  const parents = crossing ? cards.filter((c) => c.state === "parent") : null;
  const children = crossing ? cards.filter((c) => c.state === "child") : null;
  const rowTop = poolView ? cards.slice(0, KEEP) : null;
  const rowBot = poolView ? cards.slice(KEEP) : null;

  return (
    <motion.div
      className="ae"
      variants={wrap}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.15 }}
    >
      <div className="ae-head">
        <h2 className="ae-title">Algoritmos evolutivos</h2>
        <p className="ae-lead">
          Imagine que es dueño de un criadero de peces y quiere que todos sean
          rojizos. Se propone lograrlo en seis semanas: cada semana mide el color,
          se queda con los más rojizos y los cruza; de vez en cuando nace alguno
          con un tono distinto.
        </p>
      </div>

      <div className="ae-demo" ref={demoRef}>
        <div className="ae-demo-head">
          <span className="ae-gen">
            Semana {frame.gen + 1} de {GENS + 1}
          </span>
        </div>

        <LayoutGroup id="ae-tank">
          {poolView && rowTop && rowBot ? (
            <div
              className="ae-pool"
              role="img"
              aria-label={
                selecting
                  ? "Selección: los más rojizos suben, el resto sale"
                  : done
                    ? "Población final del estanque"
                    : frame.gen === 0
                      ? "Estanque inicial"
                      : "Nueva semana: se mide el tono"
              }
            >
              <div className="ae-tank ae-tank--row">
                {rowTop.map((c) => (
                  <FishCard
                    key={c.id}
                    card={c}
                    prefersReduced={prefersReduced}
                    lift={selecting ? "up" : "none"}
                  />
                ))}
              </div>
              {rowBot.length > 0 && (
                <div className="ae-tank ae-tank--row">
                  {rowBot.map((c) => (
                    <FishCard
                      key={c.id}
                      card={c}
                      prefersReduced={prefersReduced}
                      lift={selecting ? "down" : "none"}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : crossing && parents && children ? (
            <div
              className="ae-cross"
              role="img"
              aria-label={
                frame.stage === 2
                  ? "Cruce: nacen hijos con el color promedio de dos padres"
                  : "Mutación: solo algunos hijos cambian de tono"
              }
            >
              <div className="ae-tank ae-tank--row">
                {parents.map((c) => (
                  <FishCard key={c.id} card={c} prefersReduced={prefersReduced} />
                ))}
              </div>
              <div className="ae-tank ae-tank--row">
                {children.map((c, i) => (
                  <FishCard
                    key={c.id}
                    card={c}
                    prefersReduced={prefersReduced}
                    enter={frame.stage === 2}
                    enterDelay={0.15 + i * 0.22}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </LayoutGroup>
      </div>

      <p className="ae-cite">
        Holland JH. <em>Adaptation in Natural and Artificial Systems</em>.
        University of Michigan Press; 1975. · Eiben AE, Smith JE.{" "}
        <em>Introduction to Evolutionary Computing</em>. 2nd ed. Springer; 2015.
      </p>
    </motion.div>
  );
}
