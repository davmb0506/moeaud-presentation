/** Paleta distinguible por aminoácido (20 estándar). */
export const AA_COLOR: Record<string, string> = {
  A: "#e6194b",
  R: "#3cb44b",
  N: "#ffe119",
  D: "#4363d8",
  C: "#f58231",
  Q: "#911eb4",
  E: "#42d4f4",
  G: "#f032e6",
  H: "#bfef45",
  I: "#fabed4",
  L: "#469990",
  K: "#dcbeff",
  M: "#9a6324",
  F: "#d4b106",
  P: "#800000",
  S: "#aaffc3",
  T: "#808000",
  W: "#ffa472",
  Y: "#000075",
  V: "#a9a9a9",
};

export function aaColor(aa: string): string {
  return AA_COLOR[aa] ?? "#94a3b8";
}
