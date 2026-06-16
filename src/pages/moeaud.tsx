import { motion, type Variants } from "framer-motion";

const wrap: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const fade: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export function Moeaud() {
  return (
    <motion.div
      className="ud"
      variants={wrap}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.12 }}
    >
      <motion.div variants={fade} className="ud-head">
        <h2 className="ud-title">MOEA-UD</h2>
        <p className="ud-sub">
          Algoritmo evolutivo multiobjetivo diseñado para aproximar frentes de
          soluciones regulares e irregulares mediante vectores de referencia
          adaptativos que se redistribuyen durante la búsqueda según la forma
          del frente observado.
        </p>
      </motion.div>

      <motion.div variants={fade} className="ud-points">
        <p>
          <span className="ud-lead">Vectores adaptativos.</span> NSGA-III y
          MOEA/D usan vectores de referencia fijos que no se ajustan durante la
          ejecución. Si el conjunto de soluciones tiene huecos, parte de los
          vectores apunta a zonas vacías sin generar soluciones útiles. MOEA-UD
          los reubica según las soluciones observadas, evaluando su uniformidad
          y su diversidad.
        </p>
        <p>
          <span className="ud-lead">Archivo externo.</span> NSGA-II, NSGA-III y
          MOEA/D no tienen archivo. Si una buena solución sale de la población
          por selección, se pierde. MOEA-UD conserva un archivo externo de
          soluciones no dominadas.
        </p>
        <p>
          <span className="ud-lead">Uniformidad y diversidad (UD).</span> Dos
          indicadores complementarios —el reparto uniforme de las soluciones y
          su diversidad o cobertura del frente— guían tanto la adaptación de los
          vectores de referencia como la actualización del archivo.
        </p>
      </motion.div>

      <motion.ol variants={fade} className="ud-cites">
        <li>
          Márquez-Vega LA, Falcón-Cardona JG, Covantes Osuna E. A Multi-Objective
          Evolutionary Algorithm Based on Uniformity and Diversity to Handle
          Regular and Irregular Pareto Front Shapes. <em>IEEE Access</em>.
          2024;12:158878–158907. doi:10.1109/ACCESS.2024.3486255.
        </li>
        <li>
          Deb K, Pratap A, Agarwal S, Meyarivan T. A fast and elitist
          multiobjective genetic algorithm: NSGA-II. <em>IEEE Trans Evol Comput</em>.
          2002;6(2):182–197.
        </li>
        <li>
          Deb K, Jain H. An evolutionary many-objective optimization algorithm
          using reference-point-based nondominated sorting approach, part I.{" "}
          <em>IEEE Trans Evol Comput</em>. 2014;18(4):577–601.
        </li>
        <li>
          Zhang Q, Li H. MOEA/D: a multiobjective evolutionary algorithm based on
          decomposition. <em>IEEE Trans Evol Comput</em>. 2007;11(6):712–731.
        </li>
      </motion.ol>
    </motion.div>
  );
}
