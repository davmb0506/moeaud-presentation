import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const MECH = "#2E6B8E"; // con mecanismos
const NOMECH = "#F28E2B"; // sin mecanismos
const GREEN = "#2f8f5f"; // anotaciones / mensaje

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

type SlideData = {
  title: string;
  sub: ReactNode;
  img: string;
  alt: string;
  rows: Test[];
  msg: string;
};

const H0_BI =
  "MOEA-UD con mecanismos obtiene un HV acumulado final igual al de la versión sin mecanismos.";
const H1_BI =
  "MOEA-UD con mecanismos obtiene un HV acumulado final distinto al de la versión sin mecanismos.";
const H0_UNI =
  "MOEA-UD con mecanismos obtiene un HV acumulado final igual o menor que la versión sin mecanismos.";
const H1_UNI =
  "MOEA-UD con mecanismos obtiene un HV acumulado final mayor que la versión sin mecanismos.";
const ABLATION_FIGURE_VERSION = "median-v1";

const SLIDES: SlideData[] = [
  {
    title: "Ablación de mecanismos — Interface-PAE / pLDDT",
    sub: (
      <>
        <B>Con mecanismos</B> alcanza un hipervolumen acumulado final medio mayor (
        <B>1.003</B>) y también una mediana final mayor (<B>1.011</B>) que la
        versión <O>sin mecanismos</O> (<O>0.915</O>; mediana <O>0.921</O>).
      </>
    ),
    img: `/figures/ablation_cumhv_interface_pae_plddt.png?v=${ABLATION_FIGURE_VERSION}`,
    alt: "Curva de convergencia del hipervolumen acumulado — Interface-PAE / pLDDT: con mecanismos frente a sin mecanismos.",
    rows: [
      { test: "Mann-Whitney U (bilateral)", h0: H0_BI, h1: H1_BI, p: "0.00911", sig: "**", reject: true },
      { test: "Mann-Whitney U (unilateral)", h0: H0_UNI, h1: H1_UNI, p: "0.00455", sig: "**", reject: true },
    ],
    msg: "En esta formulación, los mecanismos adaptativos mejoran de forma significativa el mejor hipervolumen alcanzado a lo largo de la corrida.",
  },
  {
    title: "Ablación de mecanismos — Composite / TM-score",
    sub: (
      <>
        <O>Sin mecanismos</O> termina ligeramente por encima en hipervolumen
        acumulado final (<O>1.203</O>) frente a <B>con mecanismos</B> (
        <B>1.192</B>); las medianas finales permanecen muy cercanas (
        <B>1.200</B> vs. <O>1.202</O>), sin evidencia de una diferencia
        estadísticamente significativa.
      </>
    ),
    img: `/figures/ablation_cumhv_composite_tmscore.png?v=${ABLATION_FIGURE_VERSION}`,
    alt: "Curva de convergencia del hipervolumen acumulado — Composite / TM-score: con mecanismos frente a sin mecanismos.",
    rows: [
      { test: "Mann-Whitney U (bilateral)", h0: H0_BI, h1: H1_BI, p: "0.2406", sig: "n.s.", reject: false },
      { test: "Mann-Whitney U (unilateral)", h0: H0_UNI, h1: H1_UNI, p: "0.8942", sig: "n.s.", reject: false },
    ],
    msg: "Las trayectorias acumuladas son muy similares y no hay evidencia de que los mecanismos mejoren el mejor HV alcanzado en esta formulación.",
  },
  {
    title: "Ablación de mecanismos — ipSAE / SC",
    sub: (
      <>
        No se observa diferencia significativa en el hipervolumen acumulado final
        (<B>con mecanismos: media 1.190</B>;{" "}
        <O>sin mecanismos: media 1.199</O>; mediana <B>1.210</B> frente a{" "}
        <O>1.203</O>).
      </>
    ), 
    img: `/figures/ablation_cumhv_ipsae_sc.png?v=${ABLATION_FIGURE_VERSION}`,
    alt: "Curva de convergencia del hipervolumen acumulado — ipSAE / SC: con mecanismos frente a sin mecanismos.",
    rows: [
      { test: "Mann-Whitney U (bilateral)", h0: H0_BI, h1: H1_BI, p: "0.2755", sig: "n.s.", reject: false },
      { test: "Mann-Whitney U (unilateral)", h0: H0_UNI, h1: H1_UNI, p: "0.1378", sig: "n.s.", reject: false },
    ],
    msg: "La comparación sigue siendo no concluyente: ambas condiciones alcanzan techos muy parecidos y la variabilidad entre réplicas domina la diferencia media.",
  },
];
const TOTAL = SLIDES.length;

const NEXT = ["ArrowRight", "ArrowDown", "PageDown"];
const PREV = ["ArrowLeft", "ArrowUp", "PageUp"];

const variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 60 : -60 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -60 : 60 }),
};

function SlideView({ data }: { data: SlideData }) {
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
                <td className="exp-td-sig" style={r.reject ? undefined : { color: "var(--text)" }}>
                  {r.sig}
                </td>
                <td className={"exp-td-res" + (r.reject ? "" : " ns")}>
                  {r.reject ? "Se rechaza H₀" : "No se rechaza H₀"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="exp-msg" style={{ color: GREEN }}>
          {data.msg}
        </p>

        <p className="exp-foot">
          *** p&lt;0.001, ** p&lt;0.01, * p&lt;0.05, n.s. = no significativo.
          Hipervolumen acumulado final por réplica; n = 10 réplicas
          independientes por condición. Línea sólida: media; línea discontinua:
          mediana; banda: variabilidad entre réplicas.
        </p>
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
        <span className="mec-part b">Ablación · convergencia del HV</span>
        <span className="mec-progress">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              className={"mec-pip pb" + (i === idx ? " on" : "")}
              aria-label={`Ir a la formulación ${i + 1}`}
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
