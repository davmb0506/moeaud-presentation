import { motion, type Variants } from "framer-motion";

const wrap: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const fade: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

type Check = { ok: boolean; text: string };

const WHY: Check[] = [
  {
    ok: true,
    text: "De 1208 secuencias no dominadas, el embudo deja 10 con energía Rosetta, composición y acuerdo OmegaFold dentro de los umbrales usados.",
  },
  {
    ok: true,
    text: "En acoplamiento local (HADDOCK), 10 de 12 evaluados tienen mejor HADDOCK score que el control nativo VEGF–VEGFR-2 (−80.1); el mejor llega a −144.",
  },
  {
    ok: true,
    text: "En pose de diseño, dos formulaciones superan a secuencias barajadas en energía de interfaz y en oclusión estérica del sitio VEGFR-2.",
  },
  {
    ok: false,
    text: "Esa ventaja no aparece en docking a ciegas: no hay evidencia aquí de reconocimiento del epítopo fuera de la pose de diseño.",
  },
];

export function ResultadosClave() {
  return (
    <motion.div
      className="rclave"
      variants={wrap}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.12 }}
    >
      <motion.header variants={fade} className="rclave-head">
        <h2 className="rclave-title">Candidatos VEGF-A tras el cribado</h2>
        <p className="rclave-sub">
          El protocolo deja <strong>10 secuencias</strong> priorizadas para un
          eventual ensayo. Son candidatos computacionales; no hay afinidad
          experimental medida en este trabajo.
        </p>
      </motion.header>

      <motion.div variants={fade} className="rclave-verdict">
        <div className="rclave-verdict-main">
          <span className="rclave-badge">VEGF-A · selección</span>
          <p>
            <strong>10 secuencias</strong> pasan el filtro y forman el
            panel propuesto para unión y competencia con VEGFR-2.
          </p>
        </div>
        <div className="rclave-verdict-side">
          <span className="rclave-side-k">Mecanismos adaptativos</span>
          <p>
            Mejoran el frente solo en{" "}
            <strong>Interface-PAE / pLDDT</strong> (más no dominadas y mayor
            hipervolumen). En compuesto/TM e ipSAE/SC la diferencia no es
            significativa.
          </p>
        </div>
      </motion.div>

      <motion.article variants={fade} className="rclave-track rclave-track-single">
        <header className="rclave-track-head">
          <div>
            <span className="rclave-kicker">VEGF-A · MOEA-UD</span>
            <h3 className="rclave-col-title">
              Evidencia a favor y en contra del panel
            </h3>
          </div>
          <div className="rclave-nblock" aria-label="10 candidatos priorizados">
            <strong className="rclave-n">10</strong>
            <span className="rclave-nlab">candidatos priorizados</span>
          </div>
        </header>

        <ul className="rclave-checks">
          {WHY.map((c) => (
            <li
              key={c.text}
              className={c.ok ? "rclave-check ok" : "rclave-check no"}
            >
              <span className="rclave-mark" aria-hidden>
                {c.ok ? "✓" : "!"}
              </span>
              <span>{c.text}</span>
            </li>
          ))}
        </ul>

        <p className="rclave-next">
          El ensayo útil es unión más competencia con VEGFR-2, no solo el score
          computacional.
        </p>
        <p className="rclave-note">
          <strong>HADDOCK score:</strong> índice de ranking del pose (más
          negativo, mejor). No es <em>K</em>
          <sub>D</sub>; se interpreta frente al control nativo bajo el mismo
          protocolo.
        </p>
      </motion.article>

      <motion.p variants={fade} className="rclave-caveat">
        <strong>Alcance:</strong> priorización por pliegue, energía y docking
        local. No sustituye medición experimental de afinidad ni de inhibición.
      </motion.p>
    </motion.div>
  );
}
