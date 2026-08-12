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
import { AblacionConvergencia } from "./pages/11-ablacion-convergencia";
import { Ablacion } from "./pages/12-ablacion";
import { CompositeFront } from "./pages/13-composite-front";
import { IpsaeScFront } from "./pages/14-ipsae-sc-front";
import { ValidacionSintesis, GOUDY_MAX_STEP } from "./pages/15-validacion-sintesis";
import { ValidacionShortlist } from "./pages/16-validacion-shortlist";
import { WrapUp } from "./pages/17-wrap-up";
import { Referencias } from "./pages/18-referencias";
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

const TOTAL_SLIDES = 15;
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
      {/* ============================================================ */}
      {/* === DECK AVANCES (activo) — énfasis en RESULTADOS === */}
      {/* 01 Portada · 02 Agenda · 03 Objetivo · 04 EvoPro · 05 HA-PD1 variantes */}
      {/* 06 HA-PD1 reps · 07 Actividades pendientes · 08 Mono→multi · 09 MOEA-UD */}
      {/* 10 Formulaciones · 11 Ablación HV · 12 Frente PAE/pLDDT · 13 Composite/TM */}
      {/* 14 ipSAE/SC · 15 Cribado · 16 Shortlist · 17 Síntesis · 18 Referencias */}
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
        <SlideNo n={1} />
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
        <SlideNo n={2} />
      </motion.section>

      {/* 03 · Objetivo general / Importancia biológica */}
      <motion.section
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
                    .
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
        <SlideNo n={3} />
      </motion.section>

      {/* 04 · EvoPro */}
      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        <EvoproIntro />
        <SlideNo n={4} />
      </motion.section>

      {/* 05 · Actividades pendientes */}
      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        <TrabajoPendientePrevio />
        <SlideNo n={5} />
      </motion.section>

      {/* 06 · Formulaciones multiobjetivo */}
      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.15 }}
      >
        <FormulacionesMecanismos />
        <SlideNo n={6} />
      </motion.section>

      {/* 07 · Ablación · convergencia HV */}
      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.3 }}
      >
        <AblacionConvergencia />
        <SlideNo n={7} />
      </motion.section>

      {/* 08 · Ablación · frente Interface-PAE / pLDDT */}
      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.12 }}
      >
        <Ablacion />
        <SlideNo n={8} />
      </motion.section>

      {/* 09 · Ablación · frente Composite / TM-score */}
      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.12 }}
      >
        <CompositeFront />
        <SlideNo n={9} />
      </motion.section>

      {/* 10 · Ablación · frente ipSAE / SC */}
      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.12 }}
      >
        <IpsaeScFront />
        <SlideNo n={10} />
      </motion.section>

      {/* 11 · Cribado computacional */}
      <motion.section
        className="showcase slide"
        data-step="goudy"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.18 }}
      >
        <ValidacionSintesis step={goudyStep} onStepChange={setGoudy} />
        <SlideNo n={11} />
      </motion.section>

      {/* 12 · Shortlist / selección final */}
      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.12 }}
      >
        <ValidacionShortlist />
        <SlideNo n={12} />
      </motion.section>

      {/* 13 · Síntesis */}
      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.15 }}
      >
        <WrapUp />
        <SlideNo n={13} />
      </motion.section>

      {/* 14 · HA-PD1 · soluciones representativas */}
      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.12 }}
      >
        <Hapd1Representativos />
        <SlideNo n={14} />
      </motion.section>

      {/* 15 · Referencias */}
      <motion.section
        className="refs-slide slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.1 }}
      >
        <Referencias />
        <SlideNo n={15} />
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
        <h2 className="appendix-title">Apéndice</h2>
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
