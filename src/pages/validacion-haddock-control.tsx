import { motion, type Variants } from "framer-motion";
import { validationDeck } from "../data/validationDeckData";

const fade: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export function ValidacionHaddockControl() {
  const { orthogonal } = validationDeck;

  return (
    <motion.div
      className="validacion vseq"
      variants={fade}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.15 }}
    >
      <h2 className="validacion-title">Qué apoyo adicional ya tenemos</h2>
      <p className="validacion-sub">
        La parte de búsqueda libre ya no está pendiente: el panel principal ya
        tiene blind docking sobre VEGFA nativo, además de cohortes adicionales
        y un chequeo energético complementario sobre el panel base.
      </p>

      <div className="vdeck-strip">
        {orthogonal.strip.map((item) => (
          <article key={item.label} className="validacion-card vdeck-stat">
            <span className="vdeck-stat-label">{item.label}</span>
            <strong className="vdeck-stat-value">{item.value}</strong>
            <p className="vdeck-stat-note">{item.note}</p>
          </article>
        ))}
      </div>

      <div className="vdeck-grid vdeck-grid-two">
        <section className="validacion-card vdeck-table-card">
          <h3 className="vdeck-title">Mejores acercamientos en blind docking nativo</h3>
          <table className="vdeck-table">
            <thead>
              <tr>
                <th>Candidato</th>
                <th>Distancia al modelo de AlphaFold</th>
                <th>Distancia al modelo local</th>
                <th>Grupo del modelo local</th>
              </tr>
            </thead>
            <tbody>
              {orthogonal.phase2.map((row) => (
                <tr key={row.repredId}>
                  <td>
                    <code>{row.repredId}</code>
                  </td>
                  <td>{row.rmsdToAf2}</td>
                  <td>{row.rmsdToHaddock}</td>
                  <td>{row.clusterHaddock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="validacion-card vdeck-table-card">
          <h3 className="vdeck-title">Qué más se corrió sobre VEGFA nativo</h3>
          <table className="vdeck-table">
            <thead>
              <tr>
                <th>Cohorte</th>
                <th>Tamaño</th>
                <th>Lectura</th>
              </tr>
            </thead>
            <tbody>
              {orthogonal.nativeExtensions.map((row) => (
                <tr key={row.cohort}>
                  <td>{row.cohort}</td>
                  <td>{row.size}</td>
                  <td>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <div className="vdeck-grid vdeck-grid-two">
        <section className="validacion-card vdeck-card">
          <h3 className="vdeck-title">Señales complementarias</h3>
          <p className="vdeck-copy">
            PyRosetta simple no reemplaza al docking, pero sí ayuda a ver qué
            complejos del panel base conservan una señal energética favorable en
            una herramienta distinta.
          </p>

          <div className="vdeck-chip-grid">
            {orthogonal.pyrosetta.map((row) => (
              <article key={row.repredId} className="vdeck-chip-card">
                <code>{row.repredId}</code>
                <strong>{row.ddg}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="validacion-card vdeck-card vdeck-card-caution">
          <h3 className="vdeck-title">Interpretación defendible hoy</h3>

          <div className="vdeck-double-list">
            <div>
              <span className="vdeck-mini-label">Qué sí apoya la evidencia</span>
              <ul className="vdeck-list">
                {orthogonal.supports.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <span className="vdeck-mini-label">Qué sigue abierto</span>
              <ul className="vdeck-list">
                {orthogonal.open.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>

      <p className="vdeck-meta">
        Base documental:{" "}
        {orthogonal.sources.map((item, index) => (
          <span key={item}>
            <code>{item}</code>
            {index < orthogonal.sources.length - 1 ? " · " : ""}
          </span>
        ))}
      </p>
    </motion.div>
  );
}
