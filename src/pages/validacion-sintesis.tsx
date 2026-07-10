import { motion, type Variants } from "framer-motion";

const fade: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const funnel = [
  {
    label: "Pool total",
    value: "1208",
    note: "secuencias únicas",
  },
  {
    label: "Fisicoquímica",
    value: "739",
    note: "perfil físico razonable",
  },
  {
    label: "Interfaz mínima",
    value: "736",
    note: "contacto básico con VEGFA",
  },
  {
    label: "Energía externa",
    value: "150",
    note: "mejor señal de unión",
  },
  {
    label: "Evaluación detallada",
    value: "24",
    note: "casos llevados a simulación local",
  },
];

const exits = [
  {
    label: "-469",
    note: "perfil físico desfavorable",
  },
  {
    label: "-3",
    note: "sin interfaz mínima",
  },
  {
    label: "-586",
    note: "menor prioridad energética",
  },
  {
    label: "-126",
    note: "fuera de la selección final",
  },
];

export function ValidacionSintesis() {
  return (
    <motion.div
      className="validacion vflow-slide vflow-slide-compact"
      variants={fade}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.2 }}
    >
      <h2 className="validacion-title">Validación computacional</h2>
      <p className="validacion-sub">
        El objetivo de esta etapa fue reducir el conjunto de soluciones hasta
        los casos más sólidos para generar y comparar PDBs del complejo
        péptido diseñado - VEGFA.
      </p>

      <section className="validacion-card vflow-rail-card">
        <div className="vflow-main">
          {funnel.map((node, index) => (
            <div key={node.label} className="vflow-main-fragment">
              <article className="vflow-node">
                <span className="vflow-node-label">{node.label}</span>
                <strong className="vflow-node-value">{node.value}</strong>
                <p className="vflow-node-note">{node.note}</p>
              </article>
              {index < funnel.length - 1 ? <span className="vflow-connector" /> : null}
            </div>
          ))}
        </div>

        
      </section>

      <div className="vdeck-strip">
        {exits.map((item) => (
          <article key={item.label} className="validacion-card vdeck-stat">
            <span className="vdeck-stat-label">Salieron</span>
            <strong className="vdeck-stat-value">{item.label}</strong>
            <p className="vdeck-stat-note">{item.note}</p>
          </article>
        ))}
      </div>

      
    </motion.div>
  );
}
