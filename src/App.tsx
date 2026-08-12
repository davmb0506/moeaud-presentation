import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import "./App.css";
import { MoleculeViewer } from "./components/MoleculeViewer";
import { Agenda } from "./pages/02-agenda";
import { TrabajoPendientePrevio } from "./pages/03-trabajo-pendiente-previo";
import { EvoproIntro } from "./pages/05-evopro-intro";
import { Hapd1Variantes } from "./pages/06-hapd1-variantes";
import { Hapd1Representativos } from "./pages/07-hapd1-representativos";
import { Multiobjetivo, MO_MAX_STEP } from "./pages/08-multiobjetivo";
import { Moeaud, UD_MAX_STEP } from "./pages/09-moeaud";
import { FormulacionesMecanismos } from "./pages/10-formulaciones-mecanismos";
import { ParesObjetivos } from "./pages/06-pares-objetivos";
import { AblacionConvergencia, AblacionCosto } from "./pages/11-ablacion-convergencia";
import { Ablacion } from "./pages/12-ablacion";
import { CompositeFront } from "./pages/13-composite-front";
import { IpsaeScFront } from "./pages/14-ipsae-sc-front";
import { ValidacionSintesis, GOUDY_MAX_STEP } from "./pages/15-validacion-sintesis";
import { ValidacionShortlist } from "./pages/16-validacion-shortlist";
import { WrapUp, TrabajoPendiente } from "./pages/17-wrap-up";
import { Referencias } from "./pages/18-referencias";
import { SectionDivider } from "./pages/section-divider";
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
import { DisenoAlgoritmo } from "./pages/diseno-algoritmo";
*/

const NEXT_KEYS = ["ArrowRight", "ArrowDown", "PageDown"];
const PREV_KEYS = ["ArrowLeft", "ArrowUp", "PageUp"];

const TOTAL_SLIDES = 22;
const pad = (n: number) => String(n).padStart(2, "0");

function SlideNoFixed({ n }: { n: number | null }) {
  if (n == null) return null;
  return (
    <div className="slide-no slide-no-fixed" aria-hidden>
      <b>{pad(n)}</b> / {pad(TOTAL_SLIDES)}
    </div>
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
  // Paso intra-slide: la importancia biológica se revela con la tecla de avanzar.
  const [bioRevealed, setBioRevealed] = useState(false);
  const bioRef = useRef(false);
  const revealBio = (v: boolean) => {
    bioRef.current = v;
    setBioRevealed(v);
  };

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
  const setMo = (n: number) => {
    const next = Math.max(0, Math.min(MO_MAX_STEP, n));
    moRef.current = next;
    setMoStep(next);
  };

  // Pasos intra-slide MOEA-UD (frente → fijos → adaptativos).
  const [udStep, setUdStep] = useState(0);
  const udRef = useRef(0);
  const setUd = (n: number) => {
    const next = Math.max(0, Math.min(UD_MAX_STEP, n));
    udRef.current = next;
    setUdStep(next);
  };

  // Número de slide visible (fijo en esquina; no se pierde en slides altos).
  const [visibleSlideNo, setVisibleSlideNo] = useState<number | null>(1);

  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>(".slide[data-n]")
    );
    if (!nodes.length) return;

    const ratios = new Map<HTMLElement, number>();
    const update = () => {
      let best: HTMLElement | null = null;
      let bestRatio = 0;
      for (const el of nodes) {
        const r = ratios.get(el) ?? 0;
        if (r > bestRatio) {
          bestRatio = r;
          best = el;
        }
      }
      if (!best || bestRatio <= 0) {
        // Fuera del deck numerado (p. ej. apéndice): ocultar.
        const anyMain = nodes.some((el) => (ratios.get(el) ?? 0) > 0.02);
        if (!anyMain) setVisibleSlideNo(null);
        return;
      }
      const n = Number(best.dataset.n);
      if (!Number.isNaN(n)) setVisibleSlideNo(n);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          ratios.set(e.target as HTMLElement, e.intersectionRatio);
        }
        update();
      },
      { threshold: [0, 0.08, 0.2, 0.35, 0.5, 0.65, 0.8, 1] }
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
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

      // getBoundingClientRect tolera zoom/#root mejor que offsetTop vs scrollY.
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

      if (step === "bio" && isNext && !bioRef.current) {
        e.preventDefault();
        revealBio(true);
        return;
      }
      if (step === "bio" && isPrev && bioRef.current) {
        e.preventDefault();
        revealBio(false);
        return;
      }

      if (step === "goudy" && isNext && goudyRef.current < GOUDY_MAX_STEP) {
        e.preventDefault();
        setGoudy(goudyRef.current + 1);
        return;
      }
      if (step === "goudy" && isPrev && goudyRef.current > 0) {
        e.preventDefault();
        setGoudy(goudyRef.current - 1);
        return;
      }

      if (step === "mo" && isNext && moRef.current < MO_MAX_STEP) {
        e.preventDefault();
        setMo(moRef.current + 1);
        return;
      }
      if (step === "mo" && isPrev && moRef.current > 0) {
        e.preventDefault();
        setMo(moRef.current - 1);
        return;
      }

      if (step === "ud" && isNext && udRef.current < UD_MAX_STEP) {
        e.preventDefault();
        setUd(udRef.current + 1);
        return;
      }
      if (step === "ud" && isPrev && udRef.current > 0) {
        e.preventDefault();
        setUd(udRef.current - 1);
        return;
      }

      const target = isNext
        ? Math.min(current + 1, slides.length - 1)
        : Math.max(current - 1, 0);

      if (target !== current) {
        e.preventDefault();
        // Resetear el destino (no el origen): si se resetea el origen durante
        // scroll suave, la siguiente tecla reentra a los pasos internos.
        const destStep = slides[target]?.dataset.step;
        if (destStep === "bio") revealBio(false);
        if (destStep === "goudy") setGoudy(0);
        if (destStep === "mo") setMo(0);
        if (destStep === "ud") setUd(0);
        slides[target].scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className="app">
      <SlideNoFixed n={visibleSlideNo} />
      {/* ============================================================ */}
      {/* === DECK AVANCES (activo) — énfasis en RESULTADOS === */}
      {/* 01 Portada · 02 Agenda · 03 Recapitulación · 04–06 Objetivo/EvoPro/Pendientes */}
      {/* 07 Resultados · 08 Formulación multiobjetivo · 09 Diseño · 10–13 Ablación */}
      {/* 14 Cribado · 15 Shortlist · 16 Sep. HA-PD1 · 17 HA-PD1 · 18 Síntesis · 19–20 Wrap/Pendiente · 21 Gracias · 22 Refs */}
      {/* ============================================================ */}

      {/* 01 · Portada */}
      <motion.section data-n="1"
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
        <motion.p variants={slideItem} className="cover-subtitle">
          Tercer avance
        </motion.p>

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
      <motion.section data-n="2"
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        <Agenda />

      </motion.section>

      {/* 03 · Separador · Recapitulación */}
      <motion.section
        data-n="3"
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        <SectionDivider
          title="Recapitulación"
          subtitle="Objetivo, punto de partida y pendientes del periodo anterior"
        />
      </motion.section>

      {/* 04 · Objetivo general / Importancia biológica */}
      <motion.section data-n="4"
        className="showcase slide"
        data-step="bio"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        <div className="showcase-grid">
          <motion.div variants={slideItem} className="objective">
            <AnimatePresence mode="wait" initial={false}>
              {!bioRevealed ? (
                <motion.div
                  key="obj"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h2 className="objective-title">Objetivo general</h2>
                  <p className="objective-text">
                    <strong> Desarrollar, implementar y validar</strong> un marco
                    computacional de diseño de proteínas basado en{" "}
                    <strong>optimización evolutiva multiobjetivo</strong>,
                    aplicándolo al diseño <em>de novo</em> de{" "}
                    <strong>
                      péptidos de unión. Caso de estudio: VEGF-A.
                    </strong>
                    
                  </p>
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

      {/* 05 · EvoPro */}
      <motion.section data-n="5"
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        <EvoproIntro />

      </motion.section>

      {/* 06 · Actividades pendientes */}
      <motion.section data-n="6"
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        <TrabajoPendientePrevio />

      </motion.section>

      {/* 07 · Separador · Resultados */}
      <motion.section
        data-n="7"
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        <SectionDivider title="Resultados" />
      </motion.section>

      {/* 08 · Formulación multiobjetivo */}
      <motion.section
        data-n="8"
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.15 }}
      >
        <ParesObjetivos />
      </motion.section>

      {/* 09 · Formulaciones multiobjetivo / diseño experimental */}
      <motion.section data-n="9"
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.15 }}
      >
        <FormulacionesMecanismos />

      </motion.section>

      {/* 10 · Ablación · convergencia HV */}
      <motion.section data-n="10"
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.3 }}
      >
        <AblacionConvergencia />

      </motion.section>

      {/* 11 · Ablación · frente Interface-PAE / pLDDT */}
      <motion.section data-n="11"
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.12 }}
      >
        <Ablacion />

      </motion.section>

      {/* 12 · Ablación · frente Composite / TM-score */}
      <motion.section data-n="12"
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.12 }}
      >
        <CompositeFront />

      </motion.section>

      {/* 13 · Ablación · frente ipSAE / SC */}
      <motion.section data-n="13"
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.12 }}
      >
        <IpsaeScFront />

      </motion.section>

      {/* 14 · Cribado computacional */}
      <motion.section data-n="14"
        className="showcase slide"
        data-step="goudy"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.18 }}
      >
        <ValidacionSintesis step={goudyStep} onStepChange={setGoudy} />

      </motion.section>

      {/* 15 · Shortlist / selección final */}
      <motion.section data-n="15"
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.12 }}
      >
        <ValidacionShortlist />

      </motion.section>

      {/* 16 · Separador · HA-PD1 */}
      <motion.section
        data-n="16"
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        <SectionDivider title="Soluciones de experimentos previos" />
      </motion.section>

      {/* 17 · HA-PD1 · soluciones representativas */}
      <motion.section data-n="17"
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.12 }}
      >
        <Hapd1Representativos />

      </motion.section>

      {/* 18 · Separador · Síntesis */}
      <motion.section
        data-n="18"
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        <SectionDivider
          title="Síntesis"
          subtitle="Hallazgos clave y trabajo pendiente"
        />
      </motion.section>

      {/* 19 · Síntesis */}
      <motion.section data-n="19"
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.15 }}
      >
        <WrapUp />

      </motion.section>

      {/* 20 · Trabajo pendiente */}
      <motion.section data-n="20"
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.15 }}
      >
        <TrabajoPendiente />

      </motion.section>

      {/* 21 · Cierre */}
      <motion.section
        data-n="21"
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        <SectionDivider
          title="Muchas gracias"
          subtitle="Preguntas y comentarios"
        />
      </motion.section>

      {/* 22 · Referencias */}
      <motion.section data-n="22"
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
