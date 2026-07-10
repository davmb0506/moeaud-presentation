export const validationDeck = {
  flow: {
    strip: [
      {
        label: "Pool consolidado",
        value: "1208",
        note: "1208 secuencias únicas reunidas desde 6 grupos experimentales",
      },
      {
        label: "Panel principal",
        value: "12",
        note: "12 candidatos del panel final corridos con HADDOCK local guiado por AF2",
      },
      {
        label: "Panel complementario",
        value: "16",
        note: "16 candidatos adicionales, distintos del panel principal; 1 slot se cerró con reemplazo trazable",
      },
      {
        label: "Blind docking nativo",
        value: "12/12",
        note: "el panel principal ya quedó contrastado sobre VEGFA nativo; además hay cohortes adicionales fuera del panel",
      },
    ],
    stages: [
      {
        step: "Etapa 1",
        tone: "selection",
        title: "Cribado fisicoquímico",
        evidence: "1208 -> 739",
        summary:
          "ProtParam descartó secuencias con developability pobre antes de invertir cómputo estructural adicional.",
        question: "¿Qué secuencias vale la pena conservar?",
        limit: "No compara poses ni informa afinidad estructural.",
      },
      {
        step: "Etapa 2",
        tone: "selection",
        title: "Interfaz mínima y ranking externo",
        evidence: "739 -> 736 -> 150",
        summary:
          "La geometría mínima casi no recortó; el recorte fuerte posterior vino de PRODIGY y de la comparación contra el control nativo.",
        question: "¿Qué complejos merecen repredicción independiente?",
        limit: "Sigue siendo priorización, no evidencia de descubrimiento de sitio.",
      },
      {
        step: "Etapa 3",
        tone: "local",
        title: "Repredicción y panel local",
        evidence: "150 -> 150 -> 12",
        summary:
          "La repredicción AF2 fue una capa de robustez estructural y terminó fijando un panel final de 12 candidatos para docking local.",
        question: "¿Qué diseños sostienen una hipótesis estructural comparable?",
        limit: "Todavía no prueba recuperación espontánea sobre VEGFA.",
      },
      {
        step: "Etapa 4",
        tone: "orthogonal",
        title: "Refinamiento y contraste no guiado",
        evidence: "12/12 + 16/16 + blind docking nativo",
        summary:
          "El panel base cerró en HADDOCK, la rama no redundante quedó completa de forma efectiva y el contraste no guiado relevante se concentró sobre VEGFA nativo.",
        question: "¿Qué tanto resiste la conclusión fuera del panel principal?",
        limit: "Las métricas de screening, HADDOCK y blind docking no son intercambiables.",
      },
    ],
    takeaways: [
      "La validación no fue un solo docking: combinó cribado, repredicción, refinamiento local y pruebas ortogonales.",
      "La lectura correcta separa tres preguntas: priorización, refinamiento de una pose sugerida y recuperación no guiada del sitio.",
    ],
    sources: [
      "evopro/validation/cascade/validation_completion/stage12_validation_completion_summary.md",
      "evopro/validation/cascade/wave_nonredundant_hd5_vs_panel12/effective_panel_16of16/nonredundant_effective_panel_16of16.md",
      "evopro/validation/cascade/validation_completion/panel12_native_blind_pose_agreement_overview.csv",
      "evopro/validation/cascade/cabsdock_phase2_native_vegfa_nonredundant16/phase2_native_pose_agreement_best_clusters.csv",
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
