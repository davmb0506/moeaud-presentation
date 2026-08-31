import { AeProblemaDemo } from "../components/AeProblemaDemo";

/** Puente AE → problema de diseño (proteínas / VEGF-A). */
export function AeAlProblema() {
  return (
    <div className="ae-prob">
      <h2 className="ae-prob-title">Diseño de proteínas</h2>

      <div className="showcase-grid ae-prob-grid">
        <div className="ae-prob-copy">
          <div className="ae-prob-body">
            <p>
              Llevando la analogía anterior al diseño de proteínas, los peces serían
              posibles secuencias de aminoácidos a plegarse en conformaciones
              deseables para cumplir con un objetivo. En este caso, el objetivo es
              que nuestras secuencias se unan a otra proteína.
            </p>
            <p>
              A diferencia del estanque de peces, el espacio de búsqueda es enorme:
              con <em>L</em> aminoácidos hay <em>20<sup>L</sup></em> secuencias posibles.
              Explorar todas las secuencias
              posibles y sus conformaciones —a una evaluación por segundo— para un
              péptido de 21 aminoácidos tomaría alrededor de{" "}
              <strong>10<sup>19</sup> años</strong> —{" "}
              <strong>mil millones de veces</strong> la edad del universo.
            </p>
          </div>
        </div>

        <div className="ae-prob-viz">
          <AeProblemaDemo />
        </div>
      </div>
    </div>
  );
}
