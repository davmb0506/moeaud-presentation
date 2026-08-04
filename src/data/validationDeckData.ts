export const validationDeck = {
  flow: {
    strip: [
      {
        label: "Pool ND consolidado",
        value: "1208",
        note: "Secuencias únicas desde 6 grupos experimentales (60 runs)",
      },
      {
        label: "Rosetta OK",
        value: "1049",
        note: "1× FastRelax + InterfaceAnalyzer; ranking por dG/dSASA×100",
      },
      {
        label: "Top100 + QC",
        value: "96",
        note: "100 top Rosetta; 4 rechazados por complejidad de secuencia",
      },
      {
        label: "Selección final",
        value: "11",
        note: "OmegaFold soft (<5 Å) y ≤3 por grupo; paper-hard n=3",
      },
    ],
    stages: [
      {
        step: "Etapa 1",
        tone: "selection",
        title: "Rosetta FastRelax + InterfaceAnalyzer",
        evidence: "1208 -> 1049 OK",
        summary:
          "Flujo Goudy: 1× relax sobre PDBs AF2 de diseño; métrica dG_separated/dSASA×100.",
        question: "¿Qué complejos tienen la mejor interfaz relajada?",
        limit: "Proxy energético in silico; no es KD experimental.",
      },
      {
        step: "Etapa 2",
        tone: "selection",
        title: "Top 100 + QC de complejidad",
        evidence: "1049 -> 100 -> 96",
        summary:
          "Se conserva el top 100 del paper y se filtran degenerados (A+L, Ala, A+Q).",
        question: "¿Qué diseños priorizar para el gate estructural ortogonal?",
        limit: "El top 100 sigue siendo ranking Rosetta, no evidencia de unión wet-lab.",
      },
      {
        step: "Etapa 3",
        tone: "local",
        title: "OmegaFold soft + diversidad",
        evidence: "96 -> 11 thesis (3 hard)",
        summary:
          "RMSD binder Ω vs AF2: pass <3 Å, marginal <5 Å; ≤3 por grupo. Selección final = soft.",
        question: "¿Qué diseños mantienen acuerdo estructural ortogonal?",
        limit: "Umbral paper-hard es agresivo en este setup; soft está calibrado.",
      },
      {
        step: "Etapa 4",
        tone: "orthogonal",
        title: "Rama docking (aparte del Goudy)",
        evidence: "HADDOCK / CABS-dock exploratorio",
        summary:
          "Docking local y blind son una rama ortogonal distinta del filtro Goudy; no definen la selección final.",
        question: "¿Qué tanto resiste una pose fuera del screening Goudy?",
        limit: "Screening Goudy, HADDOCK y blind docking no son intercambiables.",
      },
    ],
    takeaways: [
      "El filtro oficial del paper es Flujo Goudy (Rosetta → top100 → QC → Ω → diversidad).",
      "Valida el pipeline de screening in silico, no binders experimentales.",
      "Docking/HADDOCK es rama ortogonal; no reemplaza el ranking dG/dSASA×100.",
    ],
    sources: [
      "evopro/validation/unified/runs/moea_pool1208/paper_filter/summary.md",
      "evopro/validation/unified/runs/moea_pool1208/rosetta/rosetta_summary.csv",
      "Goudy et al. 2023 PNAS (Flujo Goudy / EvoPro filter)",
    ],
  },
  panel: {
    strip: [
      {
        label: "Panel principal",
        value: "12/12",
        note: "2 corridas piloto y 10 de la ola primaria completadas",
      },
      {
        label: "Backup wave",
        value: "0/12",
        note: "quedó como contingencia; no hay artefactos de ejecución",
      },
      {
        label: "Control nativo",
        value: "Completado",
        note: "redocking local VEGFA-VEGFR2 para verificar el protocolo",
      },
      {
        label: "Archivo autoritativo",
        value: "Stage 12",
        note: "la reconciliación final manda sobre los manifests históricos",
      },
    ],
    byGroup: [
      {
        group: "Interface-PAE/pLDDT mech",
        repredId: "interface_pae_plddt_mech__000_cand_0037",
        score: "-144.218",
      },
      {
        group: "ipSAE/SC no-mech",
        repredId: "ipsae_sc_nomech__004_cand_0001",
        score: "-124.976",
      },
      {
        group: "Composite/TM-score mech",
        repredId: "composite_tmscore_mech__001_cand_0014",
        score: "-122.207",
      },
      {
        group: "Composite/TM-score no-mech",
        repredId: "composite_tmscore_nomech__001_cand_0004",
        score: "-82.585",
      },
      {
        group: "Interface-PAE/pLDDT no-mech",
        repredId: "interface_pae_plddt_nomech__019_cand_0028",
        score: "-75.357",
      },
      {
        group: "ipSAE/SC mech",
        repredId: "ipsae_sc_mech__007_cand_0005",
        score: "-60.625",
      },
    ],
    topPanel: [
      {
        repredId: "interface_pae_plddt_mech__000_cand_0037",
        group: "Interface-PAE/pLDDT mech",
        score: "-144.218",
      },
      {
        repredId: "ipsae_sc_nomech__004_cand_0001",
        group: "ipSAE/SC no-mech",
        score: "-124.976",
      },
      {
        repredId: "composite_tmscore_mech__001_cand_0014",
        group: "Composite/TM-score mech",
        score: "-122.207",
      },
      {
        repredId: "interface_pae_plddt_mech__013_cand_0017",
        group: "Interface-PAE/pLDDT mech",
        score: "-118.647",
      },
      {
        repredId: "interface_pae_plddt_mech__017_cand_0035",
        group: "Interface-PAE/pLDDT mech",
        score: "-98.978",
      },
    ],
    control: {
      bestScore: "-80.099",
      interfaceRmsd: "3.149 Å",
      alignmentRmsd: "0.582 Å",
      note:
        "Sirve como chequeo interno del protocolo local. No debe leerse como umbral numérico directo para péptidos de 21 aa.",
    },
    notes: [
      "El panel sí quedó completamente ejecutado en el repo, aunque los manifests históricos conservaron el estado ready_not_submitted.",
      "Dentro de este protocolo seed-guided, scores más negativos son comparables entre candidatos del mismo panel.",
    ],
    sources: [
      "evopro/validation/cascade/validation_completion/stage12_validation_completion_summary.md",
      "evopro/validation/cascade/validation_completion/panel_haddock_results.csv",
      "evopro/validation/cascade/haddock3_native_control/native_redocking_summary.md",
    ],
  },
  nonredundant: {
    strip: [
      {
        label: "Estado histórico",
        value: "15/16",
        note: "una falla persistente impedía cerrar la rama original",
      },
      {
        label: "Estado efectivo",
        value: "16/16",
        note: "se documentó un reemplazo del mismo grupo ya corrido en HADDOCK3",
      },
      {
        label: "Slot fallido",
        value: "1",
        note: "ipsae_sc_mech__000_cand_0001 no produjo resultado usable",
      },
      {
        label: "Ranking del reemplazo",
        value: "4to",
        note: "ipsae_sc_mech__011_cand_0005 dentro del panel efectivo",
      },
    ],
    definition:
      "Esta rama salió del universo docking-ready de Stage 7 para mantener diversidad secuencial frente al panel base. No reemplaza al panel principal; lo complementa con una lectura no redundante HD>=5.",
    transition: {
      failedId: "ipsae_sc_mech__000_cand_0001",
      failedStatus: "falla persistente",
      replacementId: "ipsae_sc_mech__011_cand_0005",
      replacementRule: "mismo grupo + distancia de Hamming >= 5 + mejor elegible por rank",
      replacementScore: "-116.541",
      replacementSeq: "MTPLHTALWEFARQENLEYSM",
    },
    topEffective: [
      {
        slot: "2",
        repredId: "interface_pae_plddt_mech__002_cand_0014",
        source: "Histórico",
        score: "-166.797",
      },
      {
        slot: "15",
        repredId: "ipsae_sc_nomech__000_cand_0003",
        source: "Histórico",
        score: "-130.911",
      },
      {
        slot: "16",
        repredId: "interface_pae_plddt_nomech__004_cand_0003",
        source: "Histórico",
        score: "-126.847",
      },
      {
        slot: "1",
        repredId: "ipsae_sc_mech__011_cand_0005",
        source: "Reemplazo",
        score: "-116.541",
      },
      {
        slot: "12",
        repredId: "composite_tmscore_nomech__018_cand_0007",
        source: "Histórico",
        score: "-113.235",
      },
    ],
    notes: [
      "El reemplazo no rescata el mismo ID fallido: supersede ese slot con un candidato nuevo, trazable y ya corrido.",
      "La utilidad de esta rama es mostrar que la señal de docking local no depende solo del panel principal ni de secuencias casi repetidas.",
    ],
    sources: [
      "evopro/validation/cascade/wave_nonredundant_hd5_vs_panel12/effective_panel_16of16/nonredundant_effective_panel_16of16.md",
      "evopro/validation/cascade/wave_nonredundant_hd5_vs_panel12/replacement_for_failed_01/replacement_summary.md",
    ],
  },
  orthogonal: {
    strip: [
      {
        label: "Blind docking panel base",
        value: "12/12",
        note: "todo el panel principal ya fue contrastado sobre VEGFA nativo",
      },
      {
        label: "Rama no redundante",
        value: "16/16",
        note: "también hubo exploración adicional sobre VEGFA nativo fuera del panel principal",
      },
      {
        label: "Backup12",
        value: "12/12",
        note: "cohorte adicional para ampliar la revisión no guiada",
      },
      {
        label: "PyRosetta simple",
        value: "12/12",
        note: "chequeo energético complementario sobre el panel base",
      },
    ],
    phase2: [
      {
        repredId: "interface_pae_plddt_mech__013_cand_0017",
        rmsdToAf2: "59.546 Å",
        rmsdToHaddock: "18.959 Å",
        clusterAf2: "cluster_4",
        clusterHaddock: "cluster_3",
      },
      {
        repredId: "interface_pae_plddt_nomech__019_cand_0028",
        rmsdToAf2: "51.722 Å",
        rmsdToHaddock: "19.550 Å",
        clusterAf2: "cluster_4",
        clusterHaddock: "cluster_3",
      },
      {
        repredId: "ipsae_sc_nomech__007_cand_0008",
        rmsdToAf2: "42.917 Å",
        rmsdToHaddock: "21.203 Å",
        clusterAf2: "cluster_1",
        clusterHaddock: "cluster_9",
      },
      {
        repredId: "ipsae_sc_nomech__004_cand_0001",
        rmsdToAf2: "38.358 Å",
        rmsdToHaddock: "32.005 Å",
        clusterAf2: "cluster_0",
        clusterHaddock: "cluster_0",
      },
    ],
    nativeExtensions: [
      {
        cohort: "Panel principal",
        size: "12",
        note: "blind docking consolidado y comparable con HADDOCK local",
      },
      {
        cohort: "No redundante",
        size: "16",
        note: "exploración adicional sobre VEGFA nativo fuera del panel base",
      },
      {
        cohort: "Backup12",
        size: "12",
        note: "cohorte independiente para ampliar la revisión no guiada",
      },
    ],
    pyrosetta: [
      {
        repredId: "ipsae_sc_nomech__004_cand_0001",
        ddg: "-68.273",
      },
      {
        repredId: "composite_tmscore_mech__001_cand_0014",
        ddg: "-59.985",
      },
      {
        repredId: "interface_pae_plddt_mech__000_cand_0037",
        ddg: "-58.863",
      },
    ],
    supports: [
      "El contraste no guiado ya existe para todo el panel principal sobre VEGFA nativo.",
      "La hipótesis local sí puede refinarse de forma consistente en HADDOCK dentro del panel y en la rama no redundante.",
      "PyRosetta aporta una señal energética complementaria para varios miembros fuertes del panel.",
    ],
    open: [
      "Solo algunos casos se acercan de forma parcial al acomodo local en el blind docking nativo.",
      "No hay recuperación consistente del mismo sitio a lo largo de todo el panel.",
      "Aún no hay evidencia ortogonal fuerte para afirmar descubrimiento espontáneo del sitio ni competencia con VEGFR2.",
      "La conclusión defendible sigue siendo soporte para refinamiento local, no validación final de mecanismo.",
    ],
    sources: [
      "evopro/validation/cascade/validation_completion/panel12_native_blind_pose_agreement_best_clusters.csv",
      "evopro/validation/cascade/cabsdock_phase2_native_vegfa_nonredundant16/phase2_native_pose_agreement_best_clusters.csv",
      "evopro/validation/cascade/cabsdock_phase2_native_vegfa_backup12/phase2_native_pose_agreement_best_clusters.csv",
      "evopro/validation/cascade/validation_completion/pyrosetta_single_panel12_uniqueids/energy_metrics.csv",
    ],
  },
} as const;
