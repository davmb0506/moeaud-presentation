import { motion, type Variants } from "framer-motion";

const fade: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const METRICS = [
  {
    label: "Pool agregado",
    value: "1,208",
    note: "candidatos extraídos de archivos finales",
  },
  {
    label: "Pasan ProtParam",
    value: "739",
    note: "61.2% del pool inicial",
  },
  {
    label: "PRODIGY ≤ nativo",
    value: "249",
    note: "33.8% post-interfaz (ΔG ≤ -9.35 kcal/mol)",
  },
] as const;

const GROUPS = [
  {
    name: "Interface-PAE/pLDDT mech",
    runs: "10",
    pool: "439",
    protparam: "251 (57%)",
    interface: "251",
    energy: "158 (63%)",
  },
  {
    name: "Interface-PAE/pLDDT no-mech",
    runs: "10",
    pool: "284",
    protparam: "142 (50%)",
    interface: "142",
    energy: "37 (26%)",
  },
  {
    name: "Composite/TM-score mech",
    runs: "10",
    pool: "155",
    protparam: "120 (77%)",
    interface: "120",
    energy: "26 (22%)",
  },
  {
    name: "Composite/TM-score no-mech",
    runs: "10",
    pool: "109",
    protparam: "81 (74%)",
    interface: "81",
    energy: "12 (15%)",
  },
  {
    name: "ipSAE/SC mech",
    runs: "10",
    pool: "105",
    protparam: "70 (67%)",
    interface: "69",
    energy: "5 (7%)",
  },
  {
    name: "ipSAE/SC no-mech",
    runs: "10",
    pool: "116",
    protparam: "75 (65%)",
    interface: "73",
    energy: "11 (15%)",
  },
] as const;

const FINDINGS = [
  "Composite/TM-score muestra la mayor retención inicial tras ProtParam (74-77%).",
  "Interface-PAE/pLDDT mech genera el mayor pool y la interfaz más robusta (mediana ΔSASA = 1819 Å²; 16 contactos).",
  "PRODIGY: 249 candidatos (33.8% post-interfaz) muestran ΔG ≤ -9.35 kcal/mol, igual o más favorable que el complejo nativo VEGF-A–VEGFR-2.",
] as const;

export function ValidacionRuns() {
  return (
    <motion.div
      className="validacion"
      variants={fade}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.15 }}
    >
      <h2 className="validacion-title">Primeras fases de validación</h2>
      <p className="validacion-sub">
        Se consolidaron <strong>60 runs</strong> ejecutados en{" "}
        <strong>6 grupos experimentales</strong> (10 réplicas por grupo) para
        aplicar el cribado inicial de validación en cascada.
      </p>

      <div className="validacion-metrics">
        {METRICS.map((metric) => (
          <article key={metric.label} className="validacion-metric">
            <span className="validacion-metric-label">{metric.label}</span>
            <strong className="validacion-metric-value">{metric.value}</strong>
            <span className="validacion-metric-note">{metric.note}</span>
          </article>
        ))}
      </div>

      <div className="validacion-grid">
        <div className="validacion-card validacion-table-card">
          <table className="validacion-table">
            <thead>
              <tr>
                <th>Grupo</th>
                <th>Runs</th>
                <th>Pool</th>
                <th>ProtParam</th>
                <th>Interfaz</th>
                <th>Energía</th>
              </tr>
            </thead>
            <tbody>
              {GROUPS.map((group) => (
                <tr key={group.name}>
                  <td>{group.name}</td>
                  <td>{group.runs}</td>
                  <td>{group.pool}</td>
                  <td>{group.protparam}</td>
                  <td>{group.interface}</td>
                  <td>{group.energy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="validacion-card validacion-findings">
          <h3 className="validacion-findings-title">Hallazgos</h3>
          <ul className="validacion-findings-list">
            {FINDINGS.map((finding) => (
              <li key={finding}>{finding}</li>
            ))}
          </ul>
        </aside>
      </div>
    </motion.div>
  );
}
