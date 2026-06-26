import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import "./App.css";
import { MoleculeViewer } from "./components/MoleculeViewer";
import { Agenda } from "./pages/agenda";
import { EvoproIntro } from "./pages/evopro-intro";
import { Experimentos } from "./pages/experimentos";
import { Temperatura } from "./pages/temperatura";
import { ExperimentosTemp } from "./pages/experimentos-temp";
import { DisenoAlgoritmo } from "./pages/diseno-algoritmo";
import { Moeaud } from "./pages/moeaud";
import { MecanismosDeck } from "./pages/mecanismos/MecanismosDeck";
import { AblacionConvergencia } from "./pages/ablacion-convergencia";
import { Operadores } from "./pages/operadores";
import { Ablacion } from "./pages/ablacion";
import { CompositeFront } from "./pages/composite-front";
import { IpsaeScFront } from "./pages/ipsae-sc-front";
import { Referencias } from "./pages/referencias";
import { ValidacionFlujo } from "./pages/validacion-flujo";
import { ValidacionRuns } from "./pages/validacion-runs";

const NEXT_KEYS = ["ArrowRight", "ArrowDown", "PageDown"];
const PREV_KEYS = ["ArrowLeft", "ArrowUp", "PageUp"];

const TOTAL_SLIDES = 19;
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

  // Paso intra-slide: el bloque de temperatura variable se revela con avanzar.
  const [tempRevealed, setTempRevealed] = useState(false);
  const tempRef = useRef(false);
  const revealTemp = (v: boolean) => {
    tempRef.current = v;
    setTempRevealed(v);
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

      // Diapositiva actual = la más cercana al scroll actual
      const y = window.scrollY;
      let current = 0;
      let best = Infinity;
      slides.forEach((s, i) => {
        const d = Math.abs(s.offsetTop - y);
        if (d < best) {
          best = d;
          current = i;
        }
      });

      const step = slides[current]?.dataset.step;

      // Slide con paso intermedio (objetivo → importancia biológica).
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

      // Slide de temperatura: revela el bloque de temperatura variable.
      if (step === "temp" && isNext && !tempRef.current) {
        e.preventDefault();
        revealTemp(true);
        return;
      }
      if (step === "temp" && isPrev && tempRef.current) {
        e.preventDefault();
        revealTemp(false);
        return;
      }

      const target = isNext
        ? Math.min(current + 1, slides.length - 1)
        : Math.max(current - 1, 0);

      if (target !== current) {
        e.preventDefault();
        // Al salir de un slide con paso, reinicia el paso para poder repetirlo.
        if (step === "bio") revealBio(false);
        if (step === "temp") revealTemp(false);
        slides[target].scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className="app">
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
      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        <Agenda></Agenda>
        <SlideNo n={2} />
      </motion.section>
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
                      péptidos <em>binders</em> de VEGF-A
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
                  <ul className="objective-bio-list">
                    <li>
                      <strong>Angiogénesis.</strong> VEGF-A media la formación
                      de vasos sanguíneos en procesos fisiológicos y
                      patológicos.<sup className="cite">1</sup>
                    </li>
                    <li>
                      <strong>Patología.</strong> Su desregulación interviene en
                      la progresión tumoral (vascularización, metástasis) y en
                      enfermedades oculares neovasculares.
                      <sup className="cite">2</sup>
                    </li>
                    <li>
                      <strong>Diana terapéutica.</strong> La inhibición del eje
                      VEGF-A/VEGFR-2 tiene uso clínico (p. ej., bevacizumab).
                      <sup className="cite">3</sup> El diseño <em>de novo</em> de
                      péptidos <em>binder</em> es una alternativa a los
                      anticuerpos monoclonales.<sup className="cite">4</sup>
                    </li>
                  </ul>

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
            <motion.p variants={slideItem} style={{fontWeight:"lighter",fontSize:"0.5rem",marginTop:"10px"}}>
              Estructuras: PDB 3V2A (VEGF-A · VEGFR-2), 1UBQ, 1CRN, 2GB1 · Render con
              3Dmol.js
            </motion.p>
          </motion.div>
        </div>
        <SlideNo n={3} />
      </motion.section>

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

      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.15 }}
      >
        <Experimentos />
        <SlideNo n={5} />
      </motion.section>

      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.12 }}
      >
        <Operadores />
        <SlideNo n={6} />
      </motion.section>

      <motion.section
        className="showcase slide"
        data-step="temp"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        <Temperatura revealed={tempRevealed} />
        <SlideNo n={7} />
      </motion.section>

      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.15 }}
      >
        <ExperimentosTemp />
        <SlideNo n={8} />
      </motion.section>

      

      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        <DisenoAlgoritmo />
        <SlideNo n={10} />
      </motion.section>

      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.12 }}
      >
        <Moeaud />
        <SlideNo n={11} />
      </motion.section>

      {/* <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.3 }}
      >
        <MecanismosDeck />
        <SlideNo n={12} />
      </motion.section> */}

      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.3 }}
      >
        <AblacionConvergencia />
        <SlideNo n={13} />
      </motion.section>

      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.12 }}
      >
        <Ablacion />
        <SlideNo n={14} />
      </motion.section>

      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.12 }}
      >
        <CompositeFront />
        <SlideNo n={15} />
      </motion.section>

      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.12 }}
      >
        <IpsaeScFront />
        <SlideNo n={16} />
      </motion.section>

      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.12 }}
      >
        <ValidacionFlujo />
        <SlideNo n={17} />
      </motion.section>

      <motion.section
        className="showcase slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.12 }}
      >
        <ValidacionRuns />
        <SlideNo n={18} />
      </motion.section>
      <motion.section
        className="refs-slide slide"
        variants={slideContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.1 }}
      >
        <Referencias />
        <SlideNo n={19} />
      </motion.section>

      
    </main>
  );
}
