import { motion, type Variants } from "framer-motion";
import { ComplexViewer } from "../components/ComplexViewer";

const fade: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const STAGE3_PDB = "/pdbs/reprediction/interface_pae_plddt_mech__002_cand_0014.pdb";
const STAGE4_PDB =
  "/pdbs/blind/interface_pae_plddt_mech__002_cand_0014_cluster3_medoid_all_atom.pdb";

const mainFlow = [
  {
    label: "Pool inicial",
    value: "1208",
    note: "Secuencias consolidadas desde 6 grupos experimentales.",
  },
  {
    label: "ProtParam",
    value: "739",
    note: "Secuencias retenidas tras el cribado fisicoquímico.",
  },
  {
    label: "Docking-ready",
    value: "150",
    note: "Conjunto que pasó al filtrado previo antes de comparar PDBs.",
  },
  {
    label: "Panel local",
    value: "24",
    note: "Candidatos ejecutados en HADDOCK local guiado.",
  },
];

export function ValidacionFlujo() {
  return (
    <motion.div
      className="validacion vflow-slide vseq"
      variants={fade}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.15 }}
    >
      <h2 className="validacion-title">De 1,208 secuencias a PDBs comparables del complejo</h2>
      <p className="validacion-sub">
        La validación combinó un embudo de priorización con dos revisiones de
        PDBs del complejo: una comparación local y una búsqueda libre sobre
        VEGFA nativo.
      </p>

      <section className="validacion-card vflow-rail-card">
        <div className="vflow-main">
          {mainFlow.map((node, index) => (
            <div key={node.label} className="vflow-main-fragment">
              <article className="vflow-node">
                <span className="vflow-node-label">{node.label}</span>
                <strong className="vflow-node-value">{node.value}</strong>
                <p className="vflow-node-note">{node.note}</p>
              </article>
              {index < mainFlow.length - 1 ? <span className="vflow-connector" /> : null}
            </div>
          ))}
        </div>

        <div className="vflow-branch">
          <span className="vflow-branch-chip">Rama complementaria</span>
          <div className="vflow-branch-line">
            <span className="vflow-branch-origin">Desde el conjunto docking-ready</span>
            <div className="vflow-branch-node">
              <strong>16</strong>
              <p>búsqueda libre sobre VEGFA nativo</p>
            </div>
          </div>
        </div>
      </section>

      <div className="vflow-evidence-grid">
        <article className="validacion-card vflow-evidence-card">
          <span className="vflow-stage-chip">Etapa 1</span>
          <div className="vflow-thumb vflow-thumb-bars">
            <div className="vflow-bar-row">
              <span>Pool total</span>
              <div className="vflow-bar-track">
                <div className="vflow-bar-fill total" style={{ width: "100%" }} />
              </div>
              <strong>1208</strong>
            </div>
            <div className="vflow-bar-row">
              <span>Retenidas</span>
              <div className="vflow-bar-track">
                <div className="vflow-bar-fill pass" style={{ width: "61.2%" }} />
              </div>
              <strong>739</strong>
            </div>
            <div className="vflow-pill-row">
              <span>II</span>
              <span>GRAVY</span>
              <span>pI</span>
              <span>Cys</span>
            </div>
          </div>
          <h3 className="vdeck-title">Filtro fisicoquímico</h3>
          <p className="vflow-card-copy">
            ProtParam sirvió como primer recorte antes de pasar a la generación
            y comparación de PDBs.
          </p>
        </article>

        <article className="validacion-card vflow-evidence-card">
          <span className="vflow-stage-chip">Etapa 2</span>
          <div className="vflow-thumb vflow-thumb-image">
            <img
              src="/validation/step2_binding_energy_crop.png"
              alt="Resumen representativo de la evaluación de energía de unión"
            />
          </div>
          <h3 className="vdeck-title">Filtro de unión</h3>
          <p className="vflow-card-copy">
            La energía externa y los criterios de interfaz redujeron el espacio
            a los candidatos con mejor perfil para revisión posterior.
          </p>
        </article>

        <article className="validacion-card vflow-evidence-card">
          <span className="vflow-stage-chip">Etapa 3</span>
          <div className="vflow-thumb vflow-thumb-viewer">
            <ComplexViewer pdbUrl={STAGE3_PDB} referenceUrl={STAGE3_PDB} />
          </div>
          <h3 className="vdeck-title">Panel local guiado</h3>
          <p className="vflow-card-copy">
            Primero se generó un PDB de referencia del complejo péptido
            diseñado - VEGFA y luego se compararon 24 candidatos con docking
            local.
          </p>
          <code className="vflow-card-id">interface_pae_plddt_mech__002_cand_0014</code>
        </article>

        <article className="validacion-card vflow-evidence-card">
          <span className="vflow-stage-chip">Etapa 4</span>
          <div className="vflow-thumb vflow-thumb-viewer">
            <ComplexViewer pdbUrl={STAGE4_PDB} referenceUrl={STAGE3_PDB} />
          </div>
          <h3 className="vdeck-title">Contraste no guiado</h3>
          <p className="vflow-card-copy">
            Aquí se muestra un PDB generado por blind docking sobre VEGFA
            nativo para el mismo candidato. Sirve para ver si el péptido vuelve
            a acercarse a una zona parecida sin imponerle un acomodo previo.
          </p>
          <code className="vflow-card-id">
            interface_pae_plddt_mech__002_cand_0014 · cluster_3
          </code>
        </article>
      </div>
    </motion.div>
  );
}
