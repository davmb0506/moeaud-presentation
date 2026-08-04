# Validación de unión con controles — MOEA-UD / VEGF-A

_Generado 2026-07-16. Datos estructurados en `src/data/bindingValidation.json`._

Blanco: VEGF-A (3V2A, cadena A). Epítopo = residuos de VEGF-A a ≤5 Å de VEGFR-2 (14 residuos).
Controles: **scrambled** (barajado, composición apareada), **random** (composición natural, ≤29 % identidad), **positivo** (VEGFR2 nativo).

---

## 1. El algoritmo MOEA-UD funciona (benchmarks)

Recupera los frentes de Pareto verdaderos (IGD bajo): ZDT1 0.066 · ZDT2 0.019 · ZDT3 0.027 · ZDT4 0.071 · ZDT6 0.003. El hipervolumen crece a lo largo de las generaciones.

## 2. Hallazgo clave: los objetivos NO eran del epítopo

Los paquetes usados (interface_pae_plddt, composite_tmscore, ipsae_sc) optimizan métricas de interfaz **globales** (confianza AF2 / geometría). El epítopo solo entró como **bonus escalar**, no como objetivo de Pareto. Existen paquetes epítopo-específicos (`composite_epitope`, `epitope_tmscore`) que **no se usaron**.

## 3. Confound monómero / dímero

El sitio de VEGFR2 se forma en el **homodímero** de VEGF-A. El diseño se hizo contra un **monómero** → el epítopo no se presenta completo. Control positivo VEGFR2: cobertura de epítopo **0.00 en monómero** vs **0.93 en dímero**.

## 4. Energía de interfaz (pose de diseño) — 2 formulaciones destacan

MM-GBSA + Rosetta ddG vs control estricto (scrambled):

| Formulación | MM-GBSA media | p<scr | ddG media | p<scr |
|---|--:|--:|--:|--:|
| **ipsae_sc_nomech** | −84.8 | **0.011** | −58.3 | 0.061 |
| **interface_pae_plddt_mech** | −82.1 | **0.018** | −55.3 | 0.139 |
| resto (4) | ≥−68 | ns | ≥−49 | ns |

## 5. Competencia estérica con VEGFR2 (posible inhibición por oclusión)

| Formulación | competition media | p>scr | p>rnd |
|---|--:|--:|--:|
| **interface_pae_plddt_mech** | 0.340 | **<0.001** | **<0.001** |
| **ipsae_sc_nomech** | 0.238 | **0.002** | **<0.001** |
| resto (4) | ≤0.10 | ns | ns |

Mismas 2 formulaciones ganadoras → señal consistente.

## 6. Régimen blind (docking independiente) — sin ventaja

- Energía MM-GBSA (poses blind): ninguna formulación supera controles (p>0.69).
- Cobertura de epítopo (blind, clúster dominante): todas ~0, controles ≈ o mayores.
→ La ventaja es **dependiente de la pose de diseño**.

## Conclusión

- MOEA-UD validado como optimizador.
- **interface_pae_plddt_mech** e **ipsae_sc_nomech**: mejor energía de interfaz + mayor competencia estérica con VEGFR2 que controles (pose de diseño) — posible inhibición por oclusión.
- La ventaja **no** se reproduce en docking independiente ni implica cobertura específica del epítopo.
- Interpretación honesta: interfaces predichas favorables, no reconocimiento específico del epítopo. Falta validación experimental.
- Vía a binders funcionales: rediseñar con objetivo epítopo-específico contra el dímero.
