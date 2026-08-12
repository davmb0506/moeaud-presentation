# Guion de presentación — Tercer avance

Cada sección corresponde a un slide. Tiempos sugeridos entre paréntesis.

---

## Slide 01 · Portada (~15 s)

Buenas tardes a todos. Voy a presentar los avances de mi proyecto de diseño de proteínas con algoritmos evolutivos de optimización multiobjetivo.

---

## Slide 02 · Agenda (~20 s)

La agenda del día es la siguiente. Primero hare una breve recapitulación del proyecto: el objetivo general, el punto de partida del mismo y las actividades que quedaron pendientes del periodo pasado. Luego hablare de los experimentos realizados durante este periodo y los resultados obtenidos. Finalmente, hare una breve síntesis, para concluir con el trabajo subsecuente.

---

## Slide 03 · Objetivo general / Importancia biológica (~45 s)

El objetivo general de este proyecto era desarrollar, implementar y validar un marco computacional de diseño de proteínas basado en optimización evolutiva multiobjetivo, aplicándolo al diseño de novo de péptidos de union, tomando como caso de estudio a VEGF-A.

[Avanzar para revelar importancia biológica]

¿Por qué VEGF-A? VEGF-A promueve la formación de vasos sanguíneos. En patologías que dependen de angiogénesis anómala — cáncer, enfermedades oculares neovasculares — su sobreexpresión favorece la progresión. Fármacos como bevacizumab son anticuerpos de ~150 kDa que se unen a VEGF-A, evitando la interacción con VEGFR. Aquí se buscan péptidos de 21 residuos con el mismo propósito.

---

## Slide 04 · EvoPro (~60 s)

Recordando un poco de anteriores avances, el proyecto parte una metodología de diseño computacional de proteinas basada en deep learning y en un algoritmo genético llamada EvoPro. EvoPro utiliza AlphaFold2 para predecir la estructura de las secuencias que conforman la poblacion a evolucionar con el algoritmo y ProteinMPNN cada cierto numero de generaciones para guiar la evolucion.

El flujo es: se inicia con una población de 50 secuencias, se evalúan con AlphaFold, se ordenan por una función escalarizada de tres términos derivados de la predicción — confianza de plegamiento, confianza de interfaz —, se elimina la peor mitad, se genera descendencia a partir de los sobrevivientes y se repite. Cada diez generaciones se usa ProteinMPNN para samplear hijos a partir de los backbones de los padres.



---

## Slide 05 · Actividades pendientes del periodo pasado (~15 s)

Y bueno, las actividades que quedaron pendientes del avance anterior son estas: Realizar los experimentos finales con la formulacion multiobjetivo que se implemento, validar los resultados de estos experimentos y, finalmente la redaccion del documento de tesis.

---

## Slide 06 · Diseño experimental — Fase de búsqueda (~20 s)




Ahora, se menciono que este proyecto parte de EvoPro por que mantiene el esquema de, en un algoritmo evolutivo, evaluar las secuencias de aminoacidos utilizando AlphaFold y generar descendencia cada cierto numero de generaciones con ProteinMPNN (que es otro modelo de aprendizaje profundo). Sin embargo, ahora lo que se busca optimizar no es una funcion escaralizada, si no un par de objetivos de manera simultanea. 

Se seleccionaron tres pares de objetivos. El primero, Interface-PAE contra pLDDT, busca minimizar el error de la predicción en la interfaz y maximizar la confianza del plegamiento — esencialmente, que el modelo esté seguro de que el péptido se une bien y se pliega correctamente. El segundo, Compuesto contra TM-score, combina varias señales de calidad en un solo escalar y lo contrasta con la similitud estructural respecto a una conformación de referencia. El tercero, ipSAE contra SC, busca minimizar un error de alineamiento de la interfaz y maximizar la complementariedad de forma entre las superficies del péptido y el target.


[Panel 1: Interface-PAE / pLDDT]
En este par de objetivos se encontró diferencia estadísticamente significativa: los mecanismos adaptativos alcanzan un hipervolumen final mayor.

[Panel 2: Compuesto / TM-score]
En este par no se encontró diferencia significativa. Las medianas finales quedan muy cercanas.

[Panel 3: ipSAE / SC]
Tampoco se encontró diferencia significativa aquí.



---
## Slide 07 · Ablación — Convergencia del hipervolumen (~50 s)



[Panel 4: Costo computacional]
El costo adicional de los mecanismos es despreciable. La predicción con AlphaFold toma ~6 minutos por generación; la inyección de diversidad toma 0.15 segundos y la selección de operadores 0.7 milisegundos. Frente a la ganancia en Interface-PAE/pLDDT, vale la pena usarlos.

---

## Slide 08 · Frente Interface-PAE / pLDDT (~30 s)

Aquí vemos los frentes no dominados de una réplica representativa (la más cercana a la media en tamaño de archivo). El frente con mecanismos (azul) domina al frente sin mecanismos (naranja) en la mayor parte del espacio de objetivos. Además, el tamaño del archivo es mayor — 44 soluciones promedio frente a 31 — lo cual da más candidatos para análisis posterior.

Al seleccionar cualquier punto se puede inspeccionar su estructura y propiedades fisicoquímicas.

---

## Slide 09 · Frente Compuesto / TM-score (~15 s)

En Compuesto / TM-score ya no es tan clara la diferencia: algunas soluciones con mecanismos dominan a algunas sin mecanismos y viceversa. Consistente con que no hubo significancia estadística. Ninguno de los candidatos finales proviene de esta formulación.

---

## Slide 10 · Frente ipSAE / SC (~15 s)

Mismo caso para ipSAE / SC. En esta réplica particular sí se observa cierta dominancia visual, pero no se replicó en todas las ejecuciones.

---

## Slide 11 · Cribado computacional (~45 s)

Una vez obtenidos los frentes, las 1208 secuencias no dominadas pasaron por un pipeline de validación.

Primero, relajación con Rosetta: mueve átomos para minimizar la energía del complejo; si no converge, se descarta. Quedan 1049.

De esas, nos quedamos con las 100 de menor energía de interfaz (ΔG / ΔSASA).

Luego un control de calidad: se eliminan secuencias con sesgos composicionales y se exige ≥20% de cobertura del epítopo VEGFR-2. Quedan 90.

Finalmente, repredicción con AlphaFold 2 y OmegaFold: se pide que ambos modelos coincidan en la estructura del péptido (RMSD < 5 Å). De aquí salen 10 candidatos finales.

---

## Slide 12 · Diseños destacados (~50 s)

De los 10 que pasan el filtro, cuatro resaltan por un criterio distinto cada uno.

El primero supera al nativo en docking: el score HADDOCK de nuestro diseño (−131) es mejor que el del complejo VEGF–VEGFR-2 nativo (−80).

El segundo tiene la mejor energía libre de unión por MM-GBSA (−139), y además cubre el 57% del epítopo.

El tercero tiene la estructura más consistente: los dos predictores coinciden con un error de solo 2.63 Å, el único por debajo de 3 Å.

El cuarto tiene la mayor cobertura del epítopo — 64% — sin que el epítopo haya sido un objetivo de optimización directo.

Algunos puntos de validación adicionales: la identidad entre los finalistas es de 0 a 29%, es decir, son soluciones genuinamente diversas. Y 3 de los 4 muestran oclusión estérica significativa del sitio de VEGFR-2: se posicionan donde iría el receptor natural.

---

## Slide 13 · Síntesis (~25 s)

En resumen:

Uno. La formulación monoobjetivo (HA-PD1) mostró que cruza y temperatura variable mejoran la aptitud frente a la formulación base.

Dos. La formulación multiobjetivo (VEGF-A): los mecanismos adaptativos mejoran el rendimiento y aumentan el tamaño del conjunto final de secuencias en el par de objetivos Interface-PAE / pLDDT.

Tres. Los diseños muestran oclusión estérica significativa del sitio VEGFR-2, posicionándolos como candidatos computacionales pendientes de validación experimental.

---

## Slide 14 · Trabajo pendiente (~20 s)

La actividad principal pendiente es continuar redactando el documento de tesis. Ya se escribieron los capítulos 1, 2 y 3; actualmente estoy escribiendo el cuarto y aplicando las correcciones sugeridas.

A la derecha se muestra el cronograma actualizado con las actividades restantes.

---

## Slide 15 · Soluciones representativas HA-PD1 (~30 s)

Aquí se muestran las soluciones representativas del experimento monoobjetivo sobre HA-PD1 — una por cada variante del algoritmo genético: solo mutación, mutación y cruce, y temperatura variable.

La cuarta tarjeta muestra el mejor AID validado computacionalmente: proviene del brazo de temperatura variable, con un RMSD AF2–OmegaFold de solo 0.83 Å. De hecho, los 4 candidatos que pasaron el pipeline de validación para HA-PD1 provienen todos de este brazo, lo cual refuerza el hallazgo de que la temperatura variable produce mejores diseños.

---

## Slide 16 · Referencias (~5 s)

Aquí están las referencias. Muchas gracias, estoy abierto a preguntas.

---

**Tiempo total estimado: ~8–9 minutos**
