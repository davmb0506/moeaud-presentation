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

export function ValidacionHaddockWave() {
  const { nonredundant } = validationDeck;

  return (
    <motion.div
      className="validacion vseq"
      variants={fade}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.15 }}
    >
      <h2 className="validacion-title">Qué aporta la rama no redundante</h2>
      <p className="validacion-sub">
        Además del panel base, el repositorio ya tiene una rama de docking local
        construida para <strong>preservar diversidad secuencial</strong>. Esa
        rama quedó históricamente en 15/16, pero ahora puede leerse de forma
        efectiva como <strong>16/16</strong> gracias a un reemplazo trazable del
        mismo grupo.
      </p>

      <div className="vdeck-strip">
        {nonredundant.strip.map((item) => (
          <article key={item.label} className="validacion-card vdeck-stat">
            <span className="vdeck-stat-label">{item.label}</span>
            <strong className="vdeck-stat-value">{item.value}</strong>
            <p className="vdeck-stat-note">{item.note}</p>
          </article>
        ))}
      </div>

      <div className="vdeck-grid vdeck-grid-two">
        <section className="validacion-card vdeck-card">
          <h3 className="vdeck-title">Qué fue esta rama</h3>
          <p className="vdeck-copy">{nonredundant.definition}</p>

          <div className="vdeck-transition-grid">
            <div className="vdeck-transition-box vdeck-transition-box-failed">
              <span className="vdeck-mini-label">Slot histórico fallido</span>
              <code>{nonredundant.transition.failedId}</code>
              <p>{nonredundant.transition.failedStatus}</p>
            </div>

            <div className="vdeck-transition-box vdeck-transition-box-replacement">
              <span className="vdeck-mini-label">Reemplazo efectivo</span>
              <code>{nonredundant.transition.replacementId}</code>
              <p>{nonredundant.transition.replacementRule}</p>
              <strong>{nonredundant.transition.replacementScore}</strong>
            </div>
          </div>

          <p className="vdeck-sequence">
            Secuencia del reemplazo:{" "}
            <code>{nonredundant.transition.replacementSeq}</code>
          </p>
        </section>

        <section className="validacion-card vdeck-table-card">
          <h3 className="vdeck-title">Top del panel efectivo 16/16</h3>
          <table className="vdeck-table">
            <thead>
              <tr>
                <th>Slot</th>
                <th>Candidato</th>
                <th>Fuente</th>
                <th>Mejor HADDOCK</th>
              </tr>
            </thead>
            <tbody>
              {nonredundant.topEffective.map((row) => (
                <tr key={`${row.slot}-${row.repredId}`}>
                  <td>{row.slot}</td>
                  <td>
                    <code>{row.repredId}</code>
                  </td>
                  <td>{row.source}</td>
                  <td>{row.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="validacion-card vdeck-foot-card">
        <h3 className="vdeck-title">Cómo debe leerse</h3>
        <ul className="vdeck-list">
          {nonredundant.notes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="vdeck-meta">
          Reconciliación:{" "}
          {nonredundant.sources.map((item, index) => (
            <span key={item}>
              <code>{item}</code>
              {index < nonredundant.sources.length - 1 ? " · " : ""}
            </span>
          ))}
        </p>
      </section>
    </motion.div>
  );
}
