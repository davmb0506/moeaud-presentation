import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { ABLATION_CONDS } from "../data/experimentLabels";
import overheadRaw from "../data/ablationOverhead.json";

const MECH = ABLATION_CONDS.con.color;
const NOMECH = ABLATION_CONDS.sin.color;

type OverheadReplica = {
  id: string;
  replica: number;
  injection_s: number;
  injection_min: number;
  injection_per_gen_s: number;
  injection_per_event_s: number;
  n_injections: number;
  gen_median_min: number;
  pct_of_gen: number;
  offspring_min: number;
  selection_min: number;
  af2_scoring_pct: number;
  wall_clock_h: number;
};

type OverheadSummary = {
  injection_s_median: number;
  injection_s_min: number;
  injection_s_max: number;
  injection_min_median: number;
  injection_min_min: number;
  injection_min_max: number;
  injection_per_gen_s_median: number;
  n_injections_median: number;
  n_injections_total: number;
  injection_per_event_s_median: number;
  injection_per_event_s_min: number;
  injection_per_event_s_max: number;
  gen_median_s: number;
  gen_median_min: number;
  pct_of_gen_median: number;
  offspring_min_median: number;
  selection_min_median: number;
  offspring_per_gen_s_median: number;
  selection_per_gen_s_median: number;
  af2_scoring_per_gen_s_median: number;
  af2_scoring_pct_median: number;
  wall_clock_h_median: number;
};

type OperatorSelectionCost = {
  n_offspring_per_gen: number;
  window_tw: number;
  draw_us: number;
  switch_ms: number;
  total_s_per_run: number;
  per_gen_ms: number;
};

type OverheadData = {
  meta: { formulation: string; n_replicas: number; generations: number };
  ma: OverheadReplica[];
  base: OverheadReplica[];
  summary: { ma: OverheadSummary; base: OverheadSummary };
  operator_selection: OperatorSelectionCost;
};

const OVERHEAD = overheadRaw as OverheadData;

const fade: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const B = ({ children }: { children: ReactNode }) => (
  <strong style={{ color: MECH }}>{children}</strong>
);
const O = ({ children }: { children: ReactNode }) => (
  <strong style={{ color: NOMECH }}>{children}</strong>
);

type Test = {
  test: string;
  h0: string;
  h1: string;
  p: string;
  sig: string;
  reject: boolean;
};

type SlideData =
  | {
      kind: "stats";
      title: string;
      sub: ReactNode;
      img: string;
      alt: string;
      rows: Test[];
    }
  | {
      kind: "overhead";
      title: string;
      sub: ReactNode;
    };

const H0_BI =
  "MOEA-UD con MA obtiene un HV final igual al de la versión Base.";
const H1_BI =
  "MOEA-UD con MA obtiene un HV final distinto al de la versión Base.";
const H0_UNI =
  "MOEA-UD con MA obtiene un HV final igual o menor que la versión Base.";
const H1_UNI =
  "MOEA-UD con MA obtiene un HV final mayor que la versión Base.";
const ABLATION_FIGURE_VERSION = "ma-base-v3";

const SLIDES: SlideData[] = [
  {
    kind: "stats",
    title: "Ablación de mecanismos — Interface-PAE / pLDDT",
    sub: (
      <>
        <B>MA</B> alcanza un hipervolumen final medio mayor (
        <B>1.003</B>) y también una mediana final mayor (<B>1.011</B>) que{" "}
        <O>Base</O> (<O>0.915</O>; mediana <O>0.921</O>).
      </>
    ),
    img: `/figures/ablation_cumhv_interface_pae_plddt.png?v=${ABLATION_FIGURE_VERSION}`,
    alt: "Curva de convergencia del hipervolumen — Interface-PAE / pLDDT: MA frente a Base.",
    rows: [
      { test: "Mann-Whitney U (bilateral)", h0: H0_BI, h1: H1_BI, p: "0.00911", sig: "**", reject: true },
      { test: "Mann-Whitney U (unilateral)", h0: H0_UNI, h1: H1_UNI, p: "0.00455", sig: "**", reject: true },
    ],
  },
  {
    kind: "stats",
    title: "Ablación de mecanismos — Compuesto / TM-score",
    sub: (
      <>
        <O>Base</O> termina ligeramente por encima en hipervolumen
        final (<O>1.203</O>) frente a <B>MA</B> (
        <B>1.192</B>); las medianas finales permanecen muy cercanas (
        <B>1.200</B> vs. <O>1.202</O>), sin evidencia de una diferencia
        estadísticamente significativa.
      </>
    ),
    img: `/figures/ablation_cumhv_composite_tmscore.png?v=${ABLATION_FIGURE_VERSION}`,
    alt: "Curva de convergencia del hipervolumen — Compuesto / TM-score: MA frente a Base.",
    rows: [
      { test: "Mann-Whitney U (bilateral)", h0: H0_BI, h1: H1_BI, p: "0.2406", sig: "n.s.", reject: false },
      { test: "Mann-Whitney U (unilateral)", h0: H0_UNI, h1: H1_UNI, p: "0.8942", sig: "n.s.", reject: false },
    ],
  },
  {
    kind: "stats",
    title: "Ablación de mecanismos — ipSAE / SC",
    sub: (
      <>
        No se observa diferencia significativa en el hipervolumen final
        (<B>MA: media 1.190</B>;{" "}
        <O>Base: media 1.199</O>; mediana <B>1.210</B> frente a{" "}
        <O>1.203</O>).
      </>
    ),
    img: `/figures/ablation_cumhv_ipsae_sc.png?v=${ABLATION_FIGURE_VERSION}`,
    alt: "Curva de convergencia del hipervolumen — ipSAE / SC: MA frente a Base.",
    rows: [
      { test: "Mann-Whitney U (bilateral)", h0: H0_BI, h1: H1_BI, p: "0.2755", sig: "n.s.", reject: false },
      { test: "Mann-Whitney U (unilateral)", h0: H0_UNI, h1: H1_UNI, p: "0.1378", sig: "n.s.", reject: false },
    ],
  },
  {
    kind: "overhead",
    title: "Costo computacional adicional de los mecanismos adaptativos",
    sub: null,
  },
];
const TOTAL = SLIDES.length;

const NEXT = ["ArrowRight", "ArrowDown", "PageDown"];
const PREV = ["ArrowLeft", "ArrowUp", "PageUp"];

/** Tiempo en la unidad que lo deja legible sin ceros de relleno. */
function fmtTime(seconds: number): string {
  if (seconds >= 60) return `${(seconds / 60).toFixed(1)} min`;
  if (seconds >= 1) return `${seconds.toFixed(1)} s`;
  if (seconds >= 0.01) return `${seconds.toFixed(2)} s`;
  return `${(seconds * 1000).toFixed(1)} ms`;
}

function fmtPct(seconds: number, total: number): string {
  const pct = (100 * seconds) / total;
  if (pct >= 1) return `${pct.toFixed(1)} %`;
  if (pct >= 0.01) return `${pct.toFixed(2)} %`;
  return `${pct.toFixed(4)} %`;
}

const variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 60 : -60 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -60 : 60 }),
};

function SlideView({ data }: { data: SlideData }) {
  if (data.kind === "overhead") {
    const s = OVERHEAD.summary.ma;
    const genSec = s.gen_median_s;
    const phases = [
      { name: "Predicción AF2 y scoring", seconds: s.af2_scoring_per_gen_s_median },
      { name: "Selección MOEA-UD", seconds: s.selection_per_gen_s_median },
      { name: "Generación de descendencia", seconds: s.offspring_per_gen_s_median },
      { name: "Inyección de diversidad", seconds: s.injection_per_gen_s_median, ma: true },
      {
        name: "Selección adaptativa de operadores",
        seconds: OVERHEAD.operator_selection.per_gen_ms / 1000,
        ma: true,
      },
    ];
    return (
      <motion.div
        className="exp exp-oh-slide"
        variants={fade}
        initial="hidden"
        animate="visible"
      >
        <div className="exp-head">
          <h2 className="exp-title">{data.title}</h2>
          {data.sub ? <p className="exp-sub">{data.sub}</p> : null}
        </div>

        <div className="exp-oh">
          <table className="exp-table exp-table-phases">
            <thead>
              <tr>
                <th>Fase de una generación</th>
                <th>Tiempo</th>
                <th>% de la generación</th>
              </tr>
            </thead>
            <tbody>
              {phases.map((p) => (
                <tr key={p.name} className={p.ma ? "exp-tr-ma" : undefined}>
                  <td className="exp-td-test">
                    {p.name}
                    {p.ma ? <span className="exp-ma-tag">MA</span> : null}
                  </td>
                  <td className="exp-td-num">{fmtTime(p.seconds)}</td>
                  <td className="exp-td-num">{fmtPct(p.seconds, genSec)}</td>
                </tr>
              ))}
              <tr className="exp-tr-median">
                <td className="exp-td-test">Generación completa</td>
                <td className="exp-td-num">{fmtTime(genSec)}</td>
                <td className="exp-td-num">100 %</td>
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div className="exp" variants={fade} initial="hidden" animate="visible">
      <div className="exp-head">
        <h2 className="exp-title">{data.title}</h2>
        <p className="exp-sub">{data.sub}</p>
      </div>

      <figure className="exp-card exp-figure exp-figure-abl">
        <img className="exp-img exp-img-abl" src={data.img} alt={data.alt} />
      </figure>

      <div className="exp-table-wrap">
        <table className="exp-table">
          <thead>
            <tr>
              <th>Prueba</th>
              <th>H₀</th>
              <th>H₁</th>
              <th>p-value</th>
              <th>Sig.</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.test}>
                <td className="exp-td-test">{r.test}</td>
                <td>{r.h0}</td>
                <td>{r.h1}</td>
                <td className="exp-td-num">{r.p}</td>
                <td
                  className="exp-td-sig"
                  style={r.reject ? undefined : { color: "var(--text)" }}
                >
                  {r.sig}
                </td>
                <td className={"exp-td-res" + (r.reject ? "" : " ns")}>
                  {r.reject ? "Se rechaza H₀" : "No se rechaza H₀"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

export function AblacionConvergencia() {
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

  useEffect(() => {
    const section = rootRef.current?.closest<HTMLElement>(".slide") ?? null;
    const onKey = (e: KeyboardEvent) => {
      const isNext = NEXT.includes(e.key);
      const isPrev = PREV.includes(e.key);
      if ((!isNext && !isPrev) || !section) return;

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
      if (curEl !== section) return;

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
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

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

  return (
    <div className="mec-deck" ref={rootRef}>
      <div className="mec-deck-top">
        <span className="mec-part b">Ablación · HV y costo computacional</span>
        <span className="mec-progress">
          {SLIDES.map((s, i) => (
            <button
              key={i}
              type="button"
              className={"mec-pip pb" + (i === idx ? " on" : "")}
              aria-label={
                s.kind === "overhead"
                  ? "Ir al costo computacional de los mecanismos"
                  : `Ir a la formulación ${i + 1}`
              }
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
            <SlideView data={SLIDES[idx]} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mec-deck-nav">
        <button type="button" className="mec-nav-btn" onClick={() => go(-1)} disabled={idx === 0} aria-label="Anterior">
          ←
        </button>
        <span className="mec-nav-count">
          {idx + 1} / {TOTAL}
        </span>
        <button type="button" className="mec-nav-btn" onClick={() => go(1)} disabled={idx === TOTAL - 1} aria-label="Siguiente">
          →
        </button>
      </div>
    </div>
  );
}
