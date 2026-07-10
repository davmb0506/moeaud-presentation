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

export function ValidacionRuns() {
  const { panel } = validationDeck;

  return (
    <motion.div
      className="validacion vseq"
      variants={fade}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.15 }}
    >
      <h2 className="validacion-title">Qué sí quedó cerrado en el panel principal</h2>
      <p className="validacion-sub">
        El tramo central del flujo sí quedó resuelto en el repositorio: el{" "}
        <strong>panel base 12/12</strong> completó HADDOCK local, el blind
        docking nativo del panel también quedó corrido y el{" "}
        <strong>control nativo VEGFA-VEGFR2</strong> quedó disponible como
        chequeo interno del protocolo.
      </p>

      <div className="vdeck-strip">
        {panel.strip.map((item) => (
          <article key={item.label} className="validacion-card vdeck-stat">
            <span className="vdeck-stat-label">{item.label}</span>
            <strong className="vdeck-stat-value">{item.value}</strong>
            <p className="vdeck-stat-note">{item.note}</p>
          </article>
        ))}
      </div>

      <div className="vdeck-grid vdeck-grid-two">
        <section className="validacion-card vdeck-card">
          <h3 className="vdeck-title">Cómo se ejecutó este bloque</h3>
          <div className="vdeck-mini-metrics">
            <div className="vdeck-mini-metric">
              <span className="vdeck-mini-label">Piloto</span>
              <strong>2/2</strong>
              <p>casos con criterios más estrictos</p>
            </div>
            <div className="vdeck-mini-metric">
              <span className="vdeck-mini-label">Ola primaria</span>
              <strong>10/10</strong>
              <p>resto del panel final</p>
            </div>
            <div className="vdeck-mini-metric">
              <span className="vdeck-mini-label">Backups</span>
              <strong>0/12</strong>
              <p>no se ejecutaron</p>
            </div>
          </div>

          <ul className="vdeck-list">
            {panel.notes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="validacion-card vdeck-table-card">
          <h3 className="vdeck-title">Mejor candidato por grupo experimental</h3>
          <table className="vdeck-table">
            <thead>
              <tr>
                <th>Grupo</th>
                <th>Candidato</th>
                <th>Mejor HADDOCK</th>
              </tr>
            </thead>
            <tbody>
              {panel.byGroup.map((row) => (
                <tr key={row.group}>
                  <td>{row.group}</td>
                  <td>
                    <code>{row.repredId}</code>
                  </td>
                  <td>{row.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <div className="vdeck-grid vdeck-grid-two">
        <section className="validacion-card vdeck-card">
          <h3 className="vdeck-title">Top del panel base</h3>
          <ol className="vdeck-rank-list">
            {panel.topPanel.slice(0, 4).map((row, index) => (
              <li key={row.repredId} className="vdeck-rank-item">
                <span className="vdeck-rank-index">0{index + 1}</span>
                <div className="vdeck-rank-copy">
                  <code>{row.repredId}</code>
                  <p>
                    {row.group} · <strong>{row.score}</strong>
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <aside className="validacion-card vdeck-card vdeck-card-highlight">
          <h3 className="vdeck-title">Control nativo VEGFA-VEGFR2</h3>
          <div className="vdeck-mini-metrics">
            <div className="vdeck-mini-metric">
              <span className="vdeck-mini-label">Mejor score</span>
              <strong>{panel.control.bestScore}</strong>
              <p>mismo protocolo local</p>
            </div>
            <div className="vdeck-mini-metric">
              <span className="vdeck-mini-label">Distancia de interfaz</span>
              <strong>{panel.control.interfaceRmsd}</strong>
              <p>sobre VEGFR2</p>
            </div>
            <div className="vdeck-mini-metric">
              <span className="vdeck-mini-label">Distancia del VEGFA</span>
              <strong>{panel.control.alignmentRmsd}</strong>
              <p>alineamiento del target</p>
            </div>
          </div>
          <p className="vdeck-copy">{panel.control.note}</p>
        </aside>
      </div>

      <p className="vdeck-meta">
        Base documental:{" "}
        {panel.sources.map((item, index) => (
          <span key={item}>
            <code>{item}</code>
            {index < panel.sources.length - 1 ? " · " : ""}
          </span>
        ))}
      </p>
    </motion.div>
  );
}
