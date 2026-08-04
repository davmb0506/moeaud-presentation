/** Etiquetas de variantes experimentales (UI). Los ids de carpeta no cambian. */

export type ExperimentArmMeta = {
  /** Nombre completo en selectores, leyendas y ejes. */
  label: string;
  /** Forma corta en chips y listas densas. */
  short: string;
  color: string;
};

/** Tres condiciones experimentales, independientes del nombre de carpeta. */
export const VARIANT_KIND = {
  soloMutacion: {
    label: "Solo mutación",
    short: "Mutación",
    color: "#3b6fb0",
  },
  mutacionYCruce: {
    label: "Mutación y cruce",
    short: "Mut. + cruce",
    color: "#d1622b",
  },
  tempVariable: {
    label: "Temperatura variable",
    short: "T variable",
    color: "#1d8a7a",
  },
} as const satisfies Record<string, ExperimentArmMeta>;

/**
 * HA-PD1 mono-60:
 * - mutation_* → solo mutación
 * - base_* → mutación y cruce
 * - temp_* → temperatura variable
 */
export const HAPD1_ARMS = {
  mutation: VARIANT_KIND.soloMutacion,
  base: VARIANT_KIND.mutacionYCruce,
  temp: VARIANT_KIND.tempVariable,
} as const;

/**
 * VEGF / EvoPro histórico:
 * - base → solo mutación (EvoPro base)
 * - both → mutación y cruce
 * - temp → temperatura variable
 */
export const VEGF_ARMS = {
  base: VARIANT_KIND.soloMutacion,
  both: VARIANT_KIND.mutacionYCruce,
  temp: VARIANT_KIND.tempVariable,
} as const;

/** Alias usado en slides HA-PD1. */
export const EXPERIMENT_ARMS = HAPD1_ARMS;

export function formatDesignLabel(
  id: string,
  arm?: keyof typeof HAPD1_ARMS | string,
  replica?: number | null
): string {
  const armKey = (arm ?? id.split("_")[0] ?? "") as keyof typeof HAPD1_ARMS;
  const meta = HAPD1_ARMS[armKey];
  const m = id.match(/_(\d+)$/);
  const rep =
    replica != null && !Number.isNaN(replica)
      ? String(replica).padStart(2, "0")
      : m
        ? m[1]
        : null;
  const short = meta?.short ?? id;
  return rep ? `${short} · ${rep}` : short;
}

export function vegfArmLabel(arm: keyof typeof VEGF_ARMS | string): string {
  const meta = VEGF_ARMS[arm as keyof typeof VEGF_ARMS];
  return meta?.label ?? arm;
}

/** Condiciones de ablación MOEA-UD (con / sin mecanismos adaptativos). */
export const ABLATION_CONDS = {
  con: {
    label: "Con mecanismos",
    short: "Con MA",
    color: "#2b6ef2",
  },
  sin: {
    label: "Sin mecanismos",
    short: "Sin MA",
    color: "#d6455a",
  },
} as const;

export function ablationCondLabel(cond: "con" | "sin" | string): string {
  if (cond === "con" || cond === "sin") return ABLATION_CONDS[cond].label;
  return cond;
}
