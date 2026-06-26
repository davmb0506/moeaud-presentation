import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Slide1, Slide2, Slide3 } from "./SlidesA";
import { Slide4, Slide5, Slide6, Slide7 } from "./SlidesB1";
import { Slide8, Slide9, Slide10 } from "./SlidesB2";
import { Slide11, Slide12 } from "./SlidesEnd";

type Def = { part: "A" | "B"; comp: React.FC };

const SLIDES: Def[] = [
  { part: "A", comp: Slide1 },
  { part: "A", comp: Slide2 },
  { part: "A", comp: Slide3 },
  { part: "B", comp: Slide4 },
  { part: "B", comp: Slide5 },
  { part: "B", comp: Slide6 },
  { part: "B", comp: Slide7 },
  { part: "B", comp: Slide8 },
  { part: "B", comp: Slide9 },
  { part: "B", comp: Slide10 },
  { part: "B", comp: Slide11 },
  { part: "B", comp: Slide12 },
];
const TOTAL = SLIDES.length;

const NEXT = ["ArrowRight", "ArrowDown", "PageDown"];
const PREV = ["ArrowLeft", "ArrowUp", "PageUp"];

const variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 60 : -60 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -60 : 60 }),
};

export function MecanismosDeck() {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const idxRef = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const go = (d: number) => {
    setDir(d);
    setIdx((i) => {
      const n = Math.max(0, Math.min(TOTAL - 1, i + d));
      idxRef.current = n;
      return n;
    });
  };

  // Intercepta ← → solo cuando esta sección es la diapositiva actual y no
  // estamos en un borde; en los bordes deja pasar el evento al navegador global.
  useEffect(() => {
    const section = rootRef.current?.closest<HTMLElement>(".slide") ?? null;
    const onKey = (e: KeyboardEvent) => {
      const isNext = NEXT.includes(e.key);
      const isPrev = PREV.includes(e.key);
      if (!isNext && !isPrev) return;
      if (!section) return;

      const slides = Array.from(document.querySelectorAll<HTMLElement>(".slide"));
      const y = window.scrollY;
      let curEl: HTMLElement | null = null;
      let best = Infinity;
      slides.forEach((s) => {
        const d = Math.abs(s.offsetTop - y);
        if (d < best) {
          best = d;
          curEl = s;
        }
      });
      if (curEl !== section) return; // no es nuestra slide → navegación global

      const i = idxRef.current;
      if (isNext && i < TOTAL - 1) {
        e.preventDefault();
        e.stopImmediatePropagation();
        go(1);
      } else if (isPrev && i > 0) {
        e.preventDefault();
        e.stopImmediatePropagation();
        go(-1);
      }
      // en los bordes: no hacemos nada → el handler global desplaza de sección
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  // Al salir de la sección, reinicia al primer sub-slide para una re-entrada limpia.
  useEffect(() => {
    const section = rootRef.current?.closest<HTMLElement>(".slide") ?? null;
    if (!section) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) {
            setIdx(0);
            idxRef.current = 0;
          }
        }
      },
      { threshold: 0.25 }
    );
    obs.observe(section);
    return () => obs.disconnect();
  }, []);

  const Current = SLIDES[idx].comp;
  const part = SLIDES[idx].part;

  return (
    <div className="mec-deck" ref={rootRef}>
      <div className="mec-deck-top">
        <span className={"mec-part " + (part === "A" ? "a" : "b")}>
          {part === "A" ? "Parte A · Operadores" : "Parte B · Inyección de diversidad"}
        </span>
        <span className="mec-progress">
          {SLIDES.map((s, i) => (
            <button
              key={i}
              type="button"
              className={
                "mec-pip" +
                (i === idx ? " on" : "") +
                (s.part === "A" ? " pa" : " pb")
              }
              aria-label={`Ir a la lámina ${i + 1}`}
              onClick={() => {
                setDir(i > idx ? 1 : -1);
                setIdx(i);
                idxRef.current = i;
              }}
            />
          ))}
        </span>
      </div>

      <div className="mec-deck-stage">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={idx}
            className="mec-slide"
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            <Current />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mec-deck-nav">
        <button
          type="button"
          className="mec-nav-btn"
          onClick={() => go(-1)}
          disabled={idx === 0}
          aria-label="Lámina anterior"
        >
          ←
        </button>
        <span className="mec-nav-count">
          {idx + 1} / {TOTAL}
        </span>
        <button
          type="button"
          className="mec-nav-btn"
          onClick={() => go(1)}
          disabled={idx === TOTAL - 1}
          aria-label="Lámina siguiente"
        >
          →
        </button>
      </div>
    </div>
  );
}
