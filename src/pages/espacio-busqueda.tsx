import { useEffect, useMemo, useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";

const container: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const cellIn: Variants = {
  hidden: { opacity: 0, scale: 0.4 },
  visible: { opacity: 1, scale: 1 },
};

const pointsVar: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

// Paleta de aminoácidos para el "enjambre" de la derecha.
const AA_PALETTE = [
  "#e6194b", "#3cb44b", "#ffd21e", "#4363d8", "#f58231",
  "#911eb4", "#42d4f4", "#f032e6", "#469990", "#9a6324",
  "#800000", "#808000", "#000075", "#2b6ef2", "#00c2b8",
];

// Contador en vivo: al crecer la longitud ℓ, el espacio 20^ℓ explota.
function MagnitudeCounter() {
  const [l, setL] = useState(1);
  const last = useRef(1);
  useEffect(() => {
    let raf = 0;
    let start = 0;
    const dur = 4200; // tiempo en barrer de ℓ=1 a ℓ=100
    const hold = 1100; // pausa al llegar al tope
    const maxL = 100;
    const tick = (t: number) => {
      if (!start) start = t;
      const cycle = (t - start) % (dur + hold);
      const p = Math.min(1, cycle / dur);
      const v = Math.max(1, Math.round(p * maxL));
      if (v !== last.current) {
        last.current = v;
        setL(v);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const exp = Math.round(l * 1.30103);
  return (
    <div className="esp-readout">
      <span className="esp-readout-l">ℓ = {l} residuos</span>
      <span className="esp-readout-eq">
        |S| = 20<sup>{l}</sup> ≈ 10<sup>{exp}</sup>
      </span>
    </div>
  );
}

export function EspacioBusqueda() {
  // Enjambre de puntos para el panel de proteínas (posiciones deterministas).
  const swarm = useMemo(
    () =>
      Array.from({ length: 130 }, (_, i) => ({
        left: (i * 67) % 100,
        top: (i * 41 + (i % 7) * 9) % 100,
        size: 5 + ((i * 13) % 7),
        color: AA_PALETTE[i % AA_PALETTE.length],
      })),
    []
  );

  const dots = (
    <>
      {swarm.map((d, i) => (
        <span
          key={i}
          className="esp-dot"
          style={{
            left: `${d.left}%`,
            top: `${d.top}%`,
            width: d.size,
            height: d.size,
            background: d.color,
          }}
        />
      ))}
    </>
  );

  // Dos capas idénticas que hacen zoom y se cruzan en opacidad => sensación
  // de "buceo" infinito hacia un espacio que nunca se acaba.
  const zoom = {
    animate: { scale: [0.45, 2.3], opacity: [0, 0.95, 0.95, 0] },
    transition: { duration: 7, repeat: Infinity, ease: "linear" as const },
  };

  return (
    <motion.div
      className="esp"
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.3 }}
    >
      <motion.h2 variants={item} className="esp-title">
        Problema
      </motion.h2>

      <div className="esp-problem">
        {/* Retos del diseño de proteínas */}
        <motion.ol className="esp-points" variants={pointsVar}>
          <motion.li variants={item} className="esp-point active">
            <span className="esp-point-k">01</span>
            <div className="esp-point-body">
              <h3 className="esp-point-h">Espacio de búsqueda</h3>
              <p className="esp-point-d">
                De <strong>2⁶ = 64</strong> soluciones enumerables a{" "}
                <strong>
                  20<sup>ℓ</sup>
                </strong>
                : un espacio astronómico, imposible de recorrer por fuerza
                bruta <em>(ver animación →)</em>.
              </p>
            </div>
          </motion.li>

          <motion.li variants={item} className="esp-point">
            <span className="esp-point-k">02</span>
            <div className="esp-point-body">
              <h3 className="esp-point-h">
                La relación secuencia–estructura–función es altamente no lineal
              </h3>
              <p className="esp-point-d">
                Un solo cambio de aminoácido puede alterar drásticamente el
                plegamiento y la función.
              </p>
              <div className="esp-mini">
                <span className="esp-mini-seq ok">
                  …F<b>K</b>L… <span className="esp-mini-mark ok">✓ se pliega</span>
                </span>
                <span className="esp-mini-seq bad">
                  …F<b>E</b>L… <span className="esp-mini-mark bad">✗ colapsa</span>
                </span>
              </div>
            </div>
          </motion.li>

          <motion.li variants={item} className="esp-point">
            <span className="esp-point-k">03</span>
            <div className="esp-point-body">
              <h3 className="esp-point-h">
                Las propiedades deseables son objetivos frecuentemente
                antagónicos
              </h3>
              <p className="esp-point-d">
                Mejorar una suele empeorar otra → se requiere{" "}
                <strong>optimización multiobjetivo</strong>.
              </p>
              <div className="esp-mini">
                <span className="esp-mini-pill">Afinidad</span>
                <span className="esp-mini-tug">⇄</span>
                <span className="esp-mini-pill">Estabilidad</span>
              </div>
            </div>
          </motion.li>
        </motion.ol>

        {/* Visual: el salto del espacio de búsqueda (animado) */}
        <motion.div variants={item} className="esp-visual">
          <div className="esp-fields">
            {/* Enumerable */}
            <figure className="esp-field">
              <div className="esp-field-box">
                <motion.div
                  className="esp-grid"
                  variants={{
                    visible: { transition: { staggerChildren: 0.012 } },
                  }}
                >
                  {Array.from({ length: 64 }, (_, n) => (
                    <motion.span
                      key={n}
                      variants={cellIn}
                      className={`esp-cell64 ${n === 63 ? "opt" : ""}`}
                    >
                      {n}
                    </motion.span>
                  ))}
                </motion.div>
              </div>
              <figcaption className="esp-cap">
                <span className="esp-cap-lead">Ejemplo</span>
                <span className="esp-big">
                  2<sup>6</sup> = 64
                </span>
              </figcaption>
            </figure>

            <span className="esp-vs" aria-hidden>
              →
            </span>

            {/* Inabarcable */}
            <figure className="esp-field">
              <div className="esp-field-box esp-swarm-box">
                <div className="esp-swarm">
                  <motion.div
                    className="esp-zoom-layer"
                    animate={zoom.animate}
                    transition={zoom.transition}
                  >
                    {dots}
                  </motion.div>
                  <motion.div
                    className="esp-zoom-layer"
                    animate={zoom.animate}
                    transition={{ ...zoom.transition, delay: 3.5 }}
                  >
                    {dots}
                  </motion.div>
                </div>
                <MagnitudeCounter />
              </div>
              <figcaption className="esp-cap">
                <span className="esp-cap-lead">Diseño de proteínas</span>
                <span className="esp-small">
                  cada residuo extra <em>multiplica ×20</em> el espacio
                </span>
              </figcaption>
            </figure>
          </div>

          <p className="esp-foot">
            Y evaluar la aptitud ya no es una fórmula: requiere{" "}
            <strong>predicción estructural (AlphaFold2)</strong>, cara y sin
            gradiente.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
