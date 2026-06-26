// Reglas de actualización fieles al código (operator_selection.py).

export function ensurePmin(p: number[], pmin = 0.05): number[] {
  const q = p.map((x) => Math.max(x, pmin));
  const s = q.reduce((a, b) => a + b, 0);
  return s > 0 ? q.map((x) => x / s) : q.map(() => 1 / q.length);
}

// Actualización de proporciones de operadores tras una ventana de HV.
export function operatorUpdate(
  prop: number[],
  usage: number[],
  angle: number,
  sigma: number,
  opt: { alpha?: number; beta?: number; sigmaBar?: number; pmin?: number } = {}
): number[] {
  const { alpha = 0.1, beta = 0.1, sigmaBar = 0.01, pmin = 0.05 } = opt;
  let p = ensurePmin(prop, pmin);
  if (angle > 0 && sigma >= sigmaBar) {
    p = p.map((x, i) => x + 2 * alpha * usage[i]);
  } else if (angle > 0) {
    p = p.map((x, i) => x + alpha * usage[i]);
  } else {
    p = p.map((x, i) => x * (1 - beta * usage[i]));
    const under = usage.map((u) => u < 1 / usage.length);
    const nUnder = under.filter(Boolean).length;
    if (nUnder > 0) p = p.map((x, i) => (under[i] ? x + beta / nUnder : x));
  }
  return ensurePmin(p, pmin);
}

// reset_after_injection: +0.05 a operadores exploratorios (mpnn, disruptive, localized).
export function resetAfterInjection(prop: number[], pmin = 0.05): number[] {
  const p = [...prop];
  [0, 3, 4].forEach((i) => (p[i] += 0.05));
  return ensurePmin(p, pmin);
}

// Normalización por fila de la matriz de Markov (injection selector, p_min=0.10).
export function clampNormRow(row: number[], pmin = 0.1): number[] {
  const q = row.map((x) => Math.max(x, pmin));
  const s = q.reduce((a, b) => a + b, 0);
  return s > 0 ? q.map((x) => x / s) : q.map(() => 1 / q.length);
}

// Refuerzo/penalización de una transición Markov (evaluate()).
export function markovUpdate(
  T: number[][],
  i: number,
  j: number,
  kind: "reward" | "rewardStrong" | "penalty",
  opt: { alpha?: number; beta?: number; pmin?: number } = {}
): number[][] {
  const { alpha = 0.1, beta = 0.1, pmin = 0.1 } = opt;
  const M = T.map((r) => [...r]);
  if (kind === "rewardStrong") M[i][j] += 2 * alpha;
  else if (kind === "reward") M[i][j] += alpha;
  else M[i][j] = Math.max(0, M[i][j] - beta);
  return M.map((r) => clampNormRow(r, pmin));
}

export function roulette(row: number[]): number {
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < row.length; i++) {
    acc += row[i];
    if (r <= acc) return i;
  }
  return row.length - 1;
}

export function sampleIndex(probs: number[]): number {
  return roulette(probs);
}

export const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));
