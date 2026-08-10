# Flujo de validación in silico (MOEA-UD VEGF-A)

## Flujo Goudy (filtro computacional — Goudy et al. 2023)

Réplica del cribado del paper EvoPro sobre el pool ND agregado (`moea_pool1208`).

**Claim:** valida el *pipeline de screening in silico*, no binders experimentales ni KD.

| Paso | Descripción | Resultado |
|------|-------------|-----------|
| 0 | Pool ND único (6 grupos, 60 runs) | **1208** |
| 1 | Rosetta 1× FastRelax + InterfaceAnalyzer | **1049** OK / 159 fail |
| 2 | Rank `dG_separated / dSASA × 100` → top 100 | **100** |
| 3 | QC complejidad (A+L≤0.45, Ala≤0.40, A+Q≤0.55) | **96** kept / 4 rej. |
| 4 | OmegaFold soft: linked `target—(GS)×28—binder`; RMSD binder vs AF2 | pass &lt;3 Å, marginal &lt;5 Å |
| 5 | ≤3 por grupo (`diversity_key`) | shortlist tesis **11**; paper-hard **3** |

Fuente: `EvoPro_Mod/evopro/validation/unified/runs/moea_pool1208/paper_filter/summary.md`

PRODIGY / MM-GBSA son **post-hoc opcionales** sobre el shortlist; no definen el ranking Goudy.

Docking (HADDOCK / CABS-dock) es una **rama aparte**; no sustituye el embudo anterior.

---

# Flujo de validación (centrado en INHIBICIÓN de VEGFA–VEGFR2)

_Objetivo declarado: diseñar péptidos que **inhiban** la interacción VEGF-A:VEGFR-2._
_Por tanto, el criterio funcional primario es la **competencia con VEGFR2** (impedir su unión), no la cobertura exacta del epítopo._

Regla transversal: **toda métrica se evalúa contra controles** — negativo (scrambled composición-apareado + random) y positivo (VEGFR2 nativo). Un valor absoluto no significa nada sin sus controles.

> Nota: los tiers siguientes describen el marco de **potencial de inhibición** (competencia / energía vs controles). El **filtro paper** operativo sobre el pool completo es el Flujo Goudy de arriba.

---

## Tier 0 — Validación del método (previo, independiente del blanco)
- MOEA-UD recupera frentes de Pareto en benchmarks (ZDT: IGD 0.003–0.07) y el HV crece por generación.
- **Estado: PASA.**

## Tier 1 — Developability (¿son péptidos viables/testables?)
- ProtParam: `stable` (instability&lt;65) & `soluble` (GRAVY&lt;0.5). Agregación, pI, carga.
- Plegamiento/helicidad esperada (opcional: MD del péptido libre).
- Gate blando: descarta secuencias no manufacturables.
- En Flujo Goudy, el QC de complejidad (A+L / Ala / A+Q) actúa como filtro de degeneración en el top 100.

## Tier 2 — Calidad de interfaz (pose de diseño)
- MM-GBSA (OpenMM/GBn2) + Rosetta InterfaceAnalyzer ddG, **diseños vs controles**.
- Pregunta: ¿forman interfaces energéticamente favorables por encima del azar?
- **Resultado:** `ipsae_sc_nomech` (MM-GBSA p=0.011) e `interface_pae_plddt_mech` (p=0.018) superan al scrambled.

## Tier 3 — Potencial de INHIBICIÓN (criterio funcional PRIMARIO)
- **Competition score** = choque estérico entre el binder y VEGFR2 alineado (mide oclusión del sitio, independiente de la cobertura exacta del epítopo).
- Diseños vs controles (Mann-Whitney, diseños > control).
- **Resultado:** `interface_pae_plddt_mech` (0.340, p&lt;0.001) e `ipsae_sc_nomech` (0.238, p=0.002) → oclusión significativa de VEGFR2. Mismas 2 formulaciones que ganan en energía → señal consistente.

## Tier 4 — Robustez (honestidad sobre el alcance)
- Dependencia de pose: la ventaja se ve en la **pose de diseño** (AF2/Boltz co-fold), NO en docking independiente (blind) → reportar como limitación.
- Multi-semilla para varianza de pose.

## Métrica SECUNDARIA / descriptiva (NO gate) — cobertura de epítopo
- Se **reporta** (dónde se posiciona el péptido respecto al epítopo VEGFR2), pero **no** es el criterio de aprobación, porque el objetivo es inhibición (que admite oclusión sin cobertura exacta).
- Contexto honesto: cobertura baja en monómero/blind; el epítopo se forma en el **dímero** (confound documentado: positivo VEGFR2 0.00 monómero → 0.93 dímero).

## Tier 5 — Validación experimental (definitiva)
- **Ensayo de competencia funcional** (¿reduce la unión VEGFA:VEGFR2? SPR/ELISA) — mide inhibición sin asumir mecanismo.
- Afinidad: SPR / BLI / ITC.

---

## Criterio de priorización de candidatos (in-silico)
Un candidato es **prometedor para inhibición** si pasa, con significancia vs controles:
1. Developability OK (Tier 1), **y**
2. Energía de interfaz mejor que scrambled (Tier 2), **y**
3. Competition score mayor que controles (Tier 3, PRIMARIO).

Bajo este criterio, las formulaciones **interface_pae_plddt_mech** e **ipsae_sc_nomech** son las priorizadas.

Para el **shortlist del paper** (Flujo Goudy), el criterio operativo es Rosetta top100 + QC + Ω soft + diversidad (n=11 en el pool 1208).

## Salvedades que SIEMPRE acompañan el resultado
- Métricas in-silico (competition, MM-GBSA, ddG, dG/dSASA) son **proxies** sobre la pose predicha; sobreestiman y dependen de la pose.
- La señal **no** se reproduce necesariamente en docking independiente → no es unión robusta demostrada.
- No hay dato experimental → conclusiones son de **potencial**, no de inhibición confirmada.
- La cobertura de epítopo se reporta por transparencia, aunque no sea el gate.
