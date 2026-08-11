# Guion de presentación — Tercer avance

Cada sección corresponde a un slide. Tiempos sugeridos entre paréntesis.

---

## Slide 01 · Portada (~15 s)

Buenas tardes a todos. Voy a presentar los avances de mi proyecto de diseño de proteínas con algoritmos evolutivos de optimización multiobjetivo.

---

## Slide 02 · Agenda (~20 s)

La agenda del día es la siguiente. Primero una recapitulación del proyecto: el objetivo, el punto de partida con EvoPro y los resultados monoobjetivo previos. Luego los resultados de este periodo: la formulación multiobjetivo, los experimentos de ablación y el cribado de candidatos. Finalmente, la síntesis y el cierre.

---

## Slide 03 · Objetivo general / Importancia biológica (~45 s)

El objetivo general es desarrollar, implementar y validar un marco computacional de diseño de proteínas basado en optimización evolutiva multiobjetivo, aplicándolo al diseño de novo de péptidos binders de VEGF-A.

[Avanzar para revelar importancia biológica]

¿Por qué VEGF-A? VEGF-A promueve la formación de vasos sanguíneos. En patologías que dependen de angiogénesis anómala — cáncer, enfermedades oculares neovasculares — su sobreexpresión favorece la progresión. Fármacos como bevacizumab son anticuerpos de ~150 kDa que se unen a VEGF-A y evitan que active VEGFR-2. Aquí se buscan péptidos de 21 residuos con el mismo propósito: más pequeños, más baratos de sintetizar.

---

## Slide 04 · EvoPro (~60 s)

El proyecto parte de EvoPro, una metodología de diseño computacional basada en deep learning y en un algoritmo genético. EvoPro utiliza AlphaFold 2 para evaluar individuos y ProteinMPNN para generar secuencias que se plieguen en conformaciones específicas.

El flujo es: se inicia con una población de 50 secuencias, se evalúan con AlphaFold, se ordenan por una función escalarizada de tres términos derivados de la predicción — confianza de plegamiento, confianza de interfaz —, se elimina la peor mitad, se genera descendencia a partir de los sobrevivientes y se repite. Cada diez generaciones se usa ProteinMPNN para samplear hijos a partir de los backbones de los padres.

Las áreas de oportunidad que encontramos: solo usaba mutación como operador, no tenía cruza, y la supervivencia era puramente elitista.

---

## Slide 05 · Variantes monoobjetivo HA-PD1 (~40 s)

Para abordar estas limitaciones, propusimos tres variantes y las ejecutamos en diez réplicas de 60 generaciones cada una sobre un dominio autoinhibitorio de HA-PD1.

La primera variante mantiene solo mutación — el baseline del artículo. La segunda agrega cruza. La tercera agrega además temperatura variable en ProteinMPNN: si el algoritmo necesita diversidad se sube la temperatura, si necesita concentrar la búsqueda se baja.

Se encontró diferencia significativa de mutación-sola frente a las variantes con cruza. No se encontró diferencia significativa entre cruza y temperatura variable usando Mann-Whitney unilateral.

---

## Slide 06 · Soluciones representativas HA-PD1 (~20 s)

Aquí se pueden ver algunas soluciones representativas. Los diseños con cruza y temperatura variable presentan mejores valores de la función de aptitud. Esto nos dio pie a incorporar estos cambios en la siguiente fase del algoritmo.

---

## Slide 07 · Actividades pendientes del periodo pasado (~15 s)

Estas eran las actividades pendientes: finalizar los experimentos multiobjetivo, la validación in silico de los diseños, y la redacción de la tesis.

---

## Slide 08 · De monoobjetivo a multiobjetivo (~40 s)

¿Por qué pasar a una formulación multiobjetivo? En diseño de proteínas, la calidad de un diseño depende de varios criterios simultáneamente — por ejemplo, que un péptido se una bien al target y que además sea compacto. Estos criterios suelen estar en conflicto: mejorar uno puede empeorar otro.

Cuando hay conflicto entre objetivos, una formulación multiobjetivo permite explorar los compromisos y obtener un frente de soluciones no dominadas. Lo que se obtiene no es una solución, sino un conjunto de soluciones donde ninguna es mejor que otra en todos los criterios a la vez. Esto es valioso porque para llevar candidatos al laboratorio se necesitan muchos: mientras más opciones, mayor probabilidad de éxito.

---

## Slide 09 · MOEA-UD (~50 s)

El algoritmo multiobjetivo que implementamos es MOEA-UD.

¿Por qué este frente a otros como NSGA-III o MOEA/D? Esos algoritmos usan vectores de referencia fijos para guiar la búsqueda. Si el frente es irregular — como suele ser en diseño de proteínas —, algunos vectores quedan sin representación y las soluciones se sesgan hacia regiones específicas.

MOEA-UD redistribuye los vectores de referencia adaptándose a la forma del frente. Además mantiene un archivo externo que preserva todas las soluciones no dominadas encontradas.

[Avanzar para mecanismos adaptativos]

Sobre esta base se añadieron dos mecanismos: selección adaptativa de operadores e inyección de diversidad, ambos guiados por el hipervolumen.

---

## Slide 10 · Formulaciones multiobjetivo (~20 s)

El diagrama muestra el diseño experimental. Partimos de la semilla de 21 aminoácidos y VEGF-A como target. MOEA-UD se ejecuta con tres pares de objetivos — Interface-PAE / pLDDT, Compuesto / TM-score, ipSAE / SC — cada uno con y sin mecanismos adaptativos. Esto da seis configuraciones, cada una con diez réplicas, y se obtienen seis frentes no dominados.

---

## Slide 11 · Ablación — Convergencia del hipervolumen (~50 s)

[Panel 1: Interface-PAE / pLDDT]
En este par de objetivos se encontró diferencia estadísticamente significativa: los mecanismos adaptativos alcanzan un hipervolumen final mayor.

[Panel 2: Compuesto / TM-score]
En este par no se encontró diferencia significativa. Las medianas finales quedan muy cercanas.

[Panel 3: ipSAE / SC]
Tampoco se encontró diferencia significativa aquí.

[Panel 4: Costo computacional]
El costo adicional de los mecanismos es despreciable. La predicción con AlphaFold toma ~6 minutos por generación; la inyección de diversidad toma 0.15 segundos y la selección de operadores 0.7 milisegundos. Frente a la ganancia en Interface-PAE/pLDDT, vale la pena usarlos.

---

## Slide 12 · Frente Interface-PAE / pLDDT (~30 s)

Aquí vemos los frentes no dominados de una réplica representativa. El frente con mecanismos (azul) domina al frente sin mecanismos (naranja) en la mayor parte del espacio de objetivos. Además, el tamaño del archivo es mayor — 44 soluciones promedio frente a 31 — lo cual da más candidatos para análisis posterior.

Al seleccionar cualquier punto se puede inspeccionar su estructura y propiedades fisicoquímicas.

---

## Slide 13 · Frente Compuesto / TM-score (~15 s)

En Compuesto / TM-score ya no es tan clara la diferencia: algunas soluciones con mecanismos dominan a algunas sin mecanismos y viceversa. Consistente con que no hubo significancia estadística.

---

## Slide 14 · Frente ipSAE / SC (~15 s)

Mismo caso para ipSAE / SC. En esta réplica particular sí se observa cierta dominancia visual, pero no se replicó en todas las ejecuciones.

---

## Slide 15 · Cribado computacional (~45 s)

Una vez obtenidos los frentes, las 1208 secuencias no dominadas pasaron por un pipeline de validación.

Primero, relajación con Rosetta: mueve átomos para minimizar la energía del complejo; si no converge, se descarta. Quedan 1049.

De esas, nos quedamos con las 100 de menor energía de interfaz (ΔG / ΔSASA).

Luego un control de calidad: se eliminan secuencias con sesgos composicionales y se exige ≥20% de cobertura del epítopo VEGFR-2. Quedan 90.

Finalmente, repredicción con AlphaFold 2 y OmegaFold: se pide que ambos modelos coincidan en la estructura del péptido (RMSD < 5 Å). De aquí salen 10 candidatos finales.

---

## Slide 16 · Diseños destacados (~50 s)

De los 10 que pasan el filtro, cuatro resaltan por un criterio distinto cada uno.

El primero supera al nativo en docking: el score HADDOCK de nuestro diseño (−131) es mejor que el del complejo VEGF–VEGFR-2 nativo (−80).

El segundo tiene la mejor energía libre de unión por MM-GBSA (−139), y además cubre el 57% del epítopo.

El tercero tiene la estructura más consistente: los dos predictores coinciden con un error de solo 2.63 Å, el único por debajo de 3 Å.

El cuarto tiene la mayor cobertura del epítopo — 64% — sin que el epítopo haya sido un objetivo de optimización directo.

Algunos puntos de validación adicionales: la identidad entre los finalistas es de 0 a 14%, es decir, son soluciones genuinamente diversas. Y 3 de los 4 muestran oclusión estérica significativa del sitio de VEGFR-2: se posicionan donde iría el receptor natural.

---

## Slide 17 · Síntesis (~30 s)

En resumen:

Uno. La formulación monoobjetivo mostró que cruza y temperatura variable mejoran la aptitud frente a la formulación base.

Dos. En la formulación multiobjetivo, los mecanismos adaptativos mejoran hipervolumen y archivo solo en Interface-PAE / pLDDT.

Tres. Los diseños muestran oclusión estérica significativa del sitio VEGFR-2, posicionándolos como leads computacionales pendientes de validación experimental.

Trabajo pendiente: redacción de tesis, desarrollo de interfaz gráfica, y queda fuera del alcance la validación experimental.

---

## Slide 18 · Referencias (~5 s)

Aquí están las referencias. Muchas gracias, estoy abierto a preguntas.

---

**Tiempo total estimado: ~9–10 minutos**
