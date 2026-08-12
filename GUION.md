# Guion de presentación — Tercer avance

Cada sección corresponde a un slide. Tiempos sugeridos entre paréntesis.

---

## Slide 01 · Portada (~15 s)

Buenas tardes a todos. Voy a presentar los avances de mi proyecto de diseño de proteínas con algoritmos evolutivos de optimización multiobjetivo.

---

## Slide 02 · Agenda (~20 s)

La agenda del día es la siguiente. Primero hare una breve recapitulación del proyecto: el objetivo general, el punto de partida del mismo y las actividades que quedaron pendientes del periodo pasado. Luego hablare de los experimentos realizados durante este periodo y los resultados obtenidos. Finalmente, hare una breve síntesis, para concluir con el trabajo subsecuente.

---

## Slide 03 · Separador · Recapitulación (~5 s)

[Separador] Empezamos con la recapitulación.

---

## Slide 04 · Objetivo general / Importancia biológica (~45 s)

El objetivo general de este proyecto era desarrollar, implementar y validar un marco computacional de diseño de proteínas basado en optimización evolutiva multiobjetivo, aplicándolo al diseño de novo de péptidos de union, tomando como caso de estudio a VEGF-A.

[Avanzar para revelar importancia biológica]

¿Por qué VEGF-A? VEGF-A promueve la formación de vasos sanguíneos. En patologías que dependen de angiogénesis anómala — cáncer, enfermedades oculares neovasculares — su sobreexpresión favorece la progresión. Fármacos como bevacizumab son anticuerpos de ~150 kDa que se unen a VEGF-A, evitando la interacción con VEGFR. Aquí se buscan péptidos de 21 residuos con el mismo propósito.

---

## Slide 05 · EvoPro (~60 s)

Recordando un poco de anteriores avances, el proyecto parte una metodología de diseño computacional de proteinas basada en deep learning y en un algoritmo genético llamada EvoPro. EvoPro utiliza AlphaFold2 para predecir la estructura de las secuencias que conforman la poblacion a evolucionar con el algoritmo y ProteinMPNN cada cierto numero de generaciones para guiar la evolucion.

El flujo es: se inicia con una población de 50 secuencias, se evalúan con AlphaFold, se ordenan por una función escalarizada de tres términos derivados de la predicción — confianza de plegamiento, confianza de interfaz —, se elimina la peor mitad, se genera descendencia a partir de los sobrevivientes y se repite. Cada diez generaciones se usa ProteinMPNN para samplear hijos a partir de los backbones de los padres.



---

## Slide 06 · Actividades pendientes del periodo pasado (~15 s)

Y bueno, las actividades que quedaron pendientes del avance anterior son estas: Realizar los experimentos finales con la formulacion multiobjetivo que se implemento, validar los resultados de estos experimentos y, finalmente la redaccion del documento de tesis.

---

## Slide 07 · Separador · Resultados (~5 s)

[Separador] Pasamos a los resultados de este periodo.

---

## Slide 08 · Formulación multiobjetivo (~60 s)

- El proyecto mantiene el esquema de EvoPro en cuanto al uso de modelos de deep learning para la evaluación y generación de secuencias.
- Lo que cambia es lo que se optimiza.

Hay tres pares; todos miden calidad de interfaz global, no el epítopo VEGFR-2.

**Interface-PAE / pLDDT.** Error de pose relativa y confianza del pliegue.

**Compuesto / TM-score.** Calidad de interfaz agregada y similitud del péptido monómero vs. unido al blanco.

**ipSAE / SC.** Confianza de pose en la interfaz y complementariedad de forma.

Cada par se corre con y sin mecanismos adaptativos → seis formulaciones. El siguiente slide muestra el diseño experimental.

---
## Slide 09 · Diseño experimental — Fase de búsqueda (~20 s)

Cada par se corre con y sin mecanismos adaptativos (MA).

---
## Slide 10 · Ablación — Convergencia del hipervolumen (~50 s)

Tres formulaciones: Interface-PAE / pLDDT (MA supera a Base, significativo), Compuesto / TM-score e ipSAE / SC (sin diferencia significativa).

---

## Slide 11 · Frente Interface-PAE / pLDDT (~30 s)

Aquí vemos los frentes no dominados de una réplica representativa (la más cercana a la media en tamaño de archivo). El frente con mecanismos (azul) domina al frente sin mecanismos (naranja) en la mayor parte del espacio de objetivos. Además, el tamaño del archivo es mayor — 44 soluciones promedio frente a 31 — lo cual da más candidatos para análisis posterior.

Al seleccionar cualquier punto se puede inspeccionar su estructura y propiedades fisicoquímicas.

---

## Slide 12 · Frente Compuesto / TM-score (~15 s)

En Compuesto / TM-score ya no es tan clara la diferencia: algunas soluciones con mecanismos dominan a algunas sin mecanismos y viceversa. Consistente con que no hubo significancia estadística. Ninguno de los candidatos finales proviene de esta formulación.

---

## Slide 13 · Frente ipSAE / SC (~15 s)

Mismo caso para ipSAE / SC. En esta réplica particular sí se observa cierta dominancia visual, pero no se replicó en todas las ejecuciones.

---

## Slide 14 · Cribado computacional (~45 s)

Una vez obtenidos los frentes, las 1208 secuencias no dominadas pasaron por un pipeline de validación.

Primero, relajación con Rosetta: mueve átomos para minimizar la energía del complejo; si no converge, se descarta. Quedan 1049.

De esas, nos quedamos con las 100 de menor energía de interfaz (ΔG / ΔSASA).

Luego un control de calidad: se eliminan secuencias con sesgos composicionales y se exige ≥20% de cobertura del epítopo VEGFR-2. Quedan 90.

Finalmente, repredicción con AlphaFold 2 y OmegaFold: se pide que ambos modelos coincidan en la estructura del péptido (RMSD < 5 Å). De aquí salen 10 candidatos finales.

---

## Slide 15 · Diseños destacados (~50 s)

De los 10 que pasan el filtro, cuatro resaltan por un criterio distinto cada uno.

El primero supera al nativo en docking: el score HADDOCK de nuestro diseño (−131) es mejor que el del complejo VEGF–VEGFR-2 nativo (−80).

El segundo tiene la mejor energía libre de unión por MM-GBSA (−139), y además cubre el 57% del epítopo.

El tercero tiene la estructura más consistente: los dos predictores coinciden con un error de solo 2.63 Å, el único por debajo de 3 Å.

El cuarto tiene la mayor cobertura del epítopo — 64% — sin que el epítopo haya sido un objetivo de optimización directo.

Algunos puntos de validación adicionales: la identidad entre los finalistas es de 0 a 29%, es decir, son soluciones genuinamente diversas. Y 3 de los 4 muestran oclusión estérica significativa del sitio de VEGFR-2: se posicionan donde iría el receptor natural.

---

## Slide 16 · Separador · Soluciones de experimentos previos (~5 s)

[Separador] Había quedado pendiente mostrar las soluciones representativas de la formulación monoobjetivo.

---

## Slide 17 · Soluciones representativas HA-PD1 (~30 s)

Aquí se muestran las soluciones representativas del experimento monoobjetivo sobre HA-PD1 — una por cada variante del algoritmo genético: solo mutación, mutación y cruce, y temperatura variable.

La cuarta tarjeta muestra el mejor AID validado computacionalmente: proviene del brazo de temperatura variable, con un RMSD AF2–OmegaFold de solo 0.83 Å. De hecho, los 4 candidatos que pasaron el pipeline de validación para HA-PD1 provienen todos de este brazo, lo cual refuerza el hallazgo de que la temperatura variable produce mejores diseños.

---

## Slide 18 · Separador · Síntesis (~5 s)

[Separador] Cerramos con la síntesis.

---

## Slide 19 · Síntesis (~25 s)

1. En la formulación monoobjetivo sobre HA-PD1, el uso de cruza y de temperatura variable mejoró la aptitud respecto a la formulación base.
2. En la formulación multiobjetivo sobre VEGF-A, los mecanismos adaptativos mejoraron el rendimiento y ampliaron el conjunto final de secuencias, en particular en el par Interface-PAE / pLDDT.
3. Tras la validación in silico —relajación, control composicional y repredicción independiente—, el marco produce secuencias estructuralmente plausibles y diversas, listas como candidatos para una caracterización experimental futura.

---

## Slide 20 · Trabajo pendiente (~20 s)

La actividad principal pendiente es continuar redactando el documento de tesis. Ya se escribieron los capítulos 1, 2 y 3; actualmente estoy escribiendo el cuarto y aplicando las correcciones sugeridas.

A la derecha se muestra el cronograma actualizado con las actividades restantes.

---

## Slide 21 · Muchas gracias (~5 s)

Muchas gracias. Estoy abierto a preguntas.

---

## Slide 22 · Referencias (~5 s)

Aquí están las referencias.

---

**Tiempo total estimado: ~8–9 minutos**
