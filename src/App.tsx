import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import "./App.css";
import { MoleculeViewer } from "./components/MoleculeViewer";
import { Agenda } from "./pages/02-agenda";
import { Proteinas } from "./pages/03-proteinas";
import { TrabajoPendientePrevio } from "./pages/03-trabajo-pendiente-previo";
import { AlgoritmosEvolutivos, AE_MAX_STEP } from "./pages/05-algoritmos-evolutivos";
import { AeAlProblema } from "./pages/05-ae-al-problema";
import { EvoproIntro } from "./pages/05-evopro-intro";
import { Hapd1Variantes } from "./pages/06-hapd1-variantes";
import { Hapd1Representativos } from "./pages/07-hapd1-representativos";
import { Multiobjetivo, MO_MAX_STEP } from "./pages/08-multiobjetivo";
import { Moeaud, UD_MAX_STEP } from "./pages/09-moeaud";
import { FormulacionesMecanismos } from "./pages/10-formulaciones-mecanismos";
import { AblacionConvergencia, AblacionCosto } from "./pages/11-ablacion-convergencia";
import { ParesObjetivos } from "./pages/06-pares-objetivos";
import { SectionDivider } from "./pages/section-divider";
import { Ablacion } from "./pages/12-ablacion";
import { CompositeFront } from "./pages/13-composite-front";
import { IpsaeScFront } from "./pages/14-ipsae-sc-front";
import { ValidacionSintesis, GOUDY_MAX_STEP } from "./pages/15-validacion-sintesis";
import { ValidacionShortlist } from "./pages/16-validacion-shortlist";
import { WrapUp, TrabajoPendiente } from "./pages/17-wrap-up";
import { Referencias } from "./pages/18-referencias";
import { SectionTitle } from "./pages/diseno-algoritmo";
/* Inactivos en avances (redundantes con HA-PD1):
import { Experimentos } from "./pages/experimentos";
import { Hapd1Stats } from "./pages/hapd1-stats";
import { Operadores } from "./pages/operadores";
import { Hapd1Mono60VsPaper } from "./pages/hapd1-mono60-vs-paper";
*/

/* Imports del deck completo (inactivos en avances):
import { Temperatura } from "./pages/temperatura";
import { ExperimentosTemp } from "./pages/experimentos-temp";
import { VariantesEvoPro } from "./pages/variantes-evopro";
*/

const NEXT_KEYS = ["ArrowRight", "ArrowDown", "PageDown"];
const PREV_KEYS = ["ArrowLeft", "ArrowUp", "PageUp"];

const BIO_MAX_STEP = 2;

const SPECIFIC_OBJECTIVES = [
  "Establecer entornos computacionales reproducibles para EvoPro",
  "Evaluar el desempeño del algoritmo genético de EvoPro",
  "Formular un algoritmo genético multiobjetivo basado en EvoPro",
  "Implementar el algoritmo multiobjetivo propuesto y analizar resultados experimentales",
] as const;

const TOTAL_SLIDES = 22;
const pad = (n: number) => String(n).padStart(2, "0");
function SlideNo({ n }: { n: number }) {
  return (
    <span className="slide-no" aria-hidden>
      <b>{pad(n)}</b> / {pad(TOTAL_SLIDES)}
    </span>
  );
}

const slideContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut", staggerChildren: 0.12 },
  },
};

const slideItem: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const viewport = { amount: 0.4 } as const;

export default function App() {
  const [currentSlide, setCurrentSlide] = useState(1);

  // Pasos intra-slide del objetivo: 0 general → 1 específicos → 2 importancia.
  const [bioStep, setBioStep] = useState(0);
  const bioRef = useRef(0);

  // Pasos intra-slide AE (estanque de peces).
  const [aeStep, setAeStep] = useState(0);
  const aeRef = useRef(0);

  // Pasos intra-slide del embudo (0 = panorama, 1–N = fases).
  const [goudyStep, setGoudyStep] = useState(0);
  const goudyRef = useRef(0);
  const setGoudy = (n: number) => {
    const next = Math.max(0, Math.min(GOUDY_MAX_STEP, n));
    goudyRef.current = next;
    setGoudyStep(next);
  };

  // Pasos intra-slide mono→multi (convergencia → nube+frente).
  const [moStep, setMoStep] = useState(0);
  const moRef = useRef(0);

  // Pasos intra-slide MOEA-UD (frente → fijos → adaptativos).
  const [udStep, setUdStep] = useState(0);
  const udRef = useRef(0);

  useEffect(() => {
    const syncSlideNo = () => {
      const slides = Array.from(
        document.querySelectorAll<HTMLElement>(".slide")
      );
      if (!slides.length) return;

      let idx = 0;
      let best = Infinity;
      slides.forEach((s, i) => {
        const d = Math.abs(s.getBoundingClientRect().top);
        if (d < best) {
          best = d;
          idx = i;
        }
      });
      setCurrentSlide(Math.min(idx + 1, TOTAL_SLIDES));
    };

    syncSlideNo();
    window.addEventListener("scroll", syncSlideNo, { passive: true });
    window.addEventListener("resize", syncSlideNo);
    return () => {
      window.removeEventListener("scroll", syncSlideNo);
      window.removeEventListener("resize", syncSlideNo);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isNext = NEXT_KEYS.includes(e.key);
      const isPrev = PREV_KEYS.includes(e.key);
      if (!isNext && !isPrev) return;

      const slides = Array.from(
        document.querySelectorAll<HTMLElement>(".slide")
      );
      if (!slides.length) return;

      let current = 0;
      let best = Infinity;
      slides.forEach((s, i) => {
        const d = Math.abs(s.getBoundingClientRect().top);
        if (d < best) {
          best = d;
          current = i;
        }
      });

      const step = slides[current]?.dataset.step;

      if (step === "bio") {
        if (isNext && bioRef.current < BIO_MAX_STEP) {
          e.preventDefault();
          const next = bioRef.current + 1;
          bioRef.current = next;
          setBioStep(next);
          return;
        }
        if (isPrev && bioRef.current > 0) {
          e.preventDefault();
          const next = bioRef.current - 1;
          bioRef.current = next;
          setBioStep(next);
          return;
        }
      }

      if (step === "ae") {
        if (isNext && aeRef.current < AE_MAX_STEP) {
          e.preventDefault();
          const next = aeRef.current + 1;
          aeRef.current = next;
          setAeStep(next);
          return;
        }
        if (isPrev && aeRef.current > 0) {
          e.preventDefault();
          const next = aeRef.current - 1;
          aeRef.current = next;
          setAeStep(next);
          return;
        }
      }

      if (step === "goudy") {
        if (isNext && goudyRef.current < GOUDY_MAX_STEP) {
          e.preventDefault();
          const next = goudyRef.current + 1;
          goudyRef.current = next;
          setGoudyStep(next);
          return;
        }
        if (isPrev && goudyRef.current > 0) {
          e.preventDefault();
          const next = goudyRef.current - 1;
          goudyRef.current = next;
          setGoudyStep(next);
          return;
        }
      }

      if (step === "mo") {
        if (isNext && moRef.current < MO_MAX_STEP) {
          e.preventDefault();
          const next = moRef.current + 1;
          moRef.current = next;
          setMoStep(next);
          return;
        }
        if (isPrev && moRef.current > 0) {
          e.preventDefault();
          const next = moRef.current - 1;
          moRef.current = next;
          setMoStep(next);
          return;
        }
      }

      if (step === "ud") {
        if (isNext && udRef.current < UD_MAX_STEP) {
          e.preventDefault();
          const next = udRef.current + 1;
          udRef.current = next;
          setUdStep(next);
          return;
        }
        if (isPrev && udRef.current > 0) {
          e.preventDefault();
          const next = udRef.current - 1;
          udRef.current = next;
          setUdStep(next);
          return;
        }
      }

      const target = isNext
        ? Math.min(current + 1, slides.length - 1)
        : Math.max(current - 1, 0);

      if (target !== current) {
        e.preventDefault();
        const destStep = slides[target]?.dataset.step;
        // Resetear el destino (no el origen) para no pelear con el scroll.
        if (destStep === "bio") {
          bioRef.current = 0;
          setBioStep(0);
        }
        if (destStep === "ae") {
          aeRef.current = 0;
          setAeStep(0);
        }
        if (destStep === "goudy") {
          goudyRef.current = 0;
          setGoudyStep(0);
        }
        if (destStep === "mo") {
          moRef.current = 0;
          setMoStep(0);
        }
        if (destStep === "ud") {
          udRef.current = 0;
          setUdStep(0);
        }
        slides[target].scrollIntoView({ behavior: "auto", block: "start" });
        setCurrentSlide(Math.min(target + 1, TOTAL_SLIDES));
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className="app">
      <SlideNo n={currentSlide} />
      {/* ============================================================ */}
      {/* === DECK AVANCES (activo) — énfasis en RESULTADOS === */}
      {/* 01 Portada · 02 Agenda · 03 Objetivos · 04 Objetivo · 05 Conceptos · 06 Proteínas · 07 AE */}
      {/* 08 Diseño de proteínas · 09 Metodología · 10 EvoPro · … */}
      {/* 08 Metodología · 09 EvoPro · 10 Actividades · 11 Formulaciones · … */}
      {/* ============================================================ */}

      {/* 01 · Portada */}
      <motion.section
        className="cover slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        <motion.img
          variants={slideItem}
          className="cover-logo"
          src="/cicese_mr_con_margen_transpBG.png"
          alt="CICESE"
        />
        <motion.h1 variants={slideItem} className="cover-title">
          Diseño de proteínas con algoritmos evolutivos de optimización
          multiobjetivo
        </motion.h1>

        <motion.div variants={slideItem} className="cover-people">
          <p>Presenta: David Gerardo Murillo Benítez</p>
          <p>
            <strong>Co-Director:</strong> Dr. Carlos Alberto Brizuela Rodríguez
          </p>
          <p>
            <strong>Co-Director:</strong> Dr. Jesús Guillermo Falcón Cardona
          </p>
          <p className="committee-title">
            <strong>Comité de tesis:</strong>
          </p>
          <p>Dr. Irvin Hussein López Nava</p>
          <p>Dr. Pierrick Gerard Jean Fournier</p>
        </motion.div>
      </motion.section>

      {/* 02 · Agenda */}
      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        <Agenda />
      </motion.section>

      {/* 03 · Título de sección · Objetivos */}
      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        <SectionTitle title="Objetivos" />
      </motion.section>

      {/* 04 · Objetivo general / Específicos / Importancia biológica */}
      <motion.section
        className="showcase slide"
        data-step="bio"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        <div
          className="showcase-grid"
          data-obj-step={bioStep}
        >
          <motion.div variants={slideItem} className="objective">
            <AnimatePresence mode="wait" initial={false}>
              {bioStep < 2 ? (
                <motion.div
                  key="obj"
                  className="objective-block"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h2 className="objective-title">Objetivo general</h2>
                  <p className="objective-text">
                    <strong>Desarrollar, implementar y validar</strong> un marco
                    computacional de diseño de proteínas basado en{" "}
                    <strong>optimización evolutiva multiobjetivo</strong>,
                    aplicándolo al diseño <em>de novo</em> de{" "}
                    <strong>
                      péptidos de unión. Caso de estudio: VEGF-A.
                    </strong>
                  </p>

                  <AnimatePresence initial={false}>
                    {bioStep >= 1 && (
                      <motion.div
                        key="especificos"
                        className="objective-specifics"
                        initial={{ opacity: 0, y: 28 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 16 }}
                        transition={{
                          duration: 0.45,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        <h3 className="objective-specifics-title">
                          Objetivos específicos
                        </h3>
                        <ol className="objective-specifics-list">
                          {SPECIFIC_OBJECTIVES.map((text) => (
                            <li key={text}>{text}</li>
                          ))}
                        </ol>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div
                  key="bio"
                  className="objective-bio"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h2 className="objective-title">Importancia biológica</h2>
                  <p className="objective-text">
                    VEGF-A promueve la formación de vasos sanguíneos.
                    <sup className="cite">1</sup> En patologías que dependen
                    de angiogénesis anómala —cáncer y enfermedades oculares
                    neovasculares—, su sobreexpresión favorece la progresión.
                    <sup className="cite">2</sup> Fármacos como bevacizumab —
                    anticuerpos de ~150&nbsp;kDa — se unen a VEGF-A y evitan
                    que active VEGFR-2.<sup className="cite">3</sup> Aquí se
                    buscan péptidos de 21 residuos con el mismo fin.
                    <sup className="cite">4</sup>
                  </p>

                  <ol className="objective-refs">
                    <li>
                      Ferrara N, Gerber HP, LeCouter J. The biology of VEGF and
                      its receptors. <em>Nat Med</em>. 2003;9(6):669–676.
                    </li>
                    <li>
                      Apte RS, Chen DS, Ferrara N. VEGF in signaling and
                      disease. <em>Cell</em>. 2019;176(6):1248–1264.
                    </li>
                    <li>
                      Ferrara N, Hillan KJ, Gerber HP, Novotny W. Discovery and
                      development of bevacizumab. <em>Nat Rev Drug Discov</em>.
                      2004;3(5):391–400.
                    </li>
                    <li>
                      Cao L, et al. Design of protein-binding proteins from the
                      target structure alone. <em>Nature</em>.
                      2022;605(7910):551–560.
                    </li>
                  </ol>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div variants={slideItem} className="showcase-card">
            <MoleculeViewer />
            <motion.p
              variants={slideItem}
              style={{ fontWeight: "lighter", fontSize: "0.5rem", marginTop: "10px" }}
            >
              Estructuras: PDB 3V2A (VEGF-A · VEGFR-2), 1UBQ, 1CRN, 2GB1 · Render
              con 3Dmol.js
            </motion.p>
          </motion.div>
        </div>
      </motion.section>

      {/* 05 · Título de sección · Conceptos previos */}
      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        <SectionTitle title="Conceptos previos" />
      </motion.section>

      {/* 06 · Conceptos · proteínas / hipótesis termodinámica */}
      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        <Proteinas />
      </motion.section>

      {/* 07 · Conceptos · Algoritmos evolutivos */}
      <motion.section
        className="showcase slide"
        data-step="ae"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.15 }}
      >
        <AlgoritmosEvolutivos step={aeStep} />
      </motion.section>

      {/* 08 · Conceptos · AE → diseño de proteínas */}
      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        <AeAlProblema />
      </motion.section>

      {/* 09 · Título de sección · Metodología */}
      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        <SectionTitle title="Metodología" />
      </motion.section>

      {/* 10 · EvoPro */}
      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        <EvoproIntro />
      </motion.section>

      {/* 09 · Actividades pendientes */}
      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        <TrabajoPendientePrevio />
      </motion.section>

      {/* 10 · Formulaciones multiobjetivo */}
      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.15 }}
      >
        <FormulacionesMecanismos />
      </motion.section>

      {/* Formulación multiobjetivo · pares de objetivos */}
      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.2 }}
      >
        <ParesObjetivos />
      </motion.section>

      {/* 11 · Ablación · convergencia HV */}
      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.3 }}
      >
        <AblacionConvergencia />
      </motion.section>

      {/* 12 · Ablación · frente Interface-PAE / pLDDT */}
      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.12 }}
      >
        <Ablacion />
      </motion.section>

      {/* 13 · Ablación · frente Composite / TM-score */}
      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.12 }}
      >
        <CompositeFront />
      </motion.section>

      {/* 14 · Ablación · frente ipSAE / SC */}
      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.12 }}
      >
        <IpsaeScFront />
      </motion.section>

      {/* 15 · Cribado computacional */}
      <motion.section
        className="showcase slide"
        data-step="goudy"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.18 }}
      >
        <ValidacionSintesis step={goudyStep} onStepChange={setGoudy} />
      </motion.section>

      {/* 16 · Shortlist / selección final */}
      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.12 }}
      >
        <ValidacionShortlist />
      </motion.section>

      {/* 17 · HA-PD1 · soluciones representativas */}
      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.12 }}
      >
        <Hapd1Representativos />
      </motion.section>

      {/* 18 · Síntesis */}
      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.15 }}
      >
        <WrapUp />
      </motion.section>

      {/* 19 · Trabajo pendiente */}
      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.15 }}
      >
        <TrabajoPendiente />
      </motion.section>

      {/* 20 · Referencias */}
      <motion.section
        className="refs-slide slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.1 }}
      >
        <Referencias />
      </motion.section>

      {/* ============================================================ */}
      {/* === APÉNDICE === */}
      {/* ============================================================ */}

      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        <SectionDivider title="Apéndice" />
      </motion.section>

      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.15 }}
      >
        <Hapd1Variantes />
      </motion.section>

      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.15 }}
      >
        <AblacionCosto />
      </motion.section>

      <motion.section
        className="showcase slide"
        data-step="mo"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.15 }}
      >
        <Multiobjetivo step={moStep} />
      </motion.section>

      <motion.section
        className="showcase slide"
        data-step="ud"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.12 }}
      >
        <Moeaud step={udStep} />
      </motion.section>

      {/* ============================================================ */}
      {/* === DECK COMPLETO (comentado para avances) === */}
      {/* No montar estas secciones: se conservan para restaurar el deck. */}
      {/*
      Operadores, Experimentos, Hapd1Stats (sacados del deck de avances).
      <motion.section className="showcase slide" data-step="temp" ...>
        <Temperatura revealed={tempRevealed} />
      </motion.section>
      <motion.section className="showcase slide" ...>
        <ExperimentosTemp />
      </motion.section>
      <motion.section className="showcase slide" ...>
        <VariantesEvoPro />
      </motion.section>
      <motion.section className="showcase slide" ...>
        <DisenoAlgoritmo />
      </motion.section>
      <motion.section className="showcase slide" ...>
        <MecanismosDeck />
      </motion.section>
      */}
      {/* === FIN DECK COMPLETO === */}
    </main>
  );
}
