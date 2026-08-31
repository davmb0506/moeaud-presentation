import { AE_PROBLEMA_POOL } from "../data/aeProblemaPool";

export type Individual = {
  id: number;
  seq: string;
  pdb: string;
  color: string;
  tiltX: number;
  tiltY: number;
  latX: number;
  latY: number;
  fromA?: boolean[];
  mutatedPos?: number[];
  parentNote?: string;
  generation: number;
};

export const POP_SIZE = 6;
export const KEEP = 3;
export const MAX_GENERATIONS = 10;
export const REF_SEQ = "QDVQYLVTVYNDGELVSSYIY";
export const BIND_THRESH = 0.72;

/** Mínimo de residuos distintos entre sobrevivientes (evita clones en pantalla). */
const MIN_SURVIVOR_DIST = 5;

const AA = "ACDEFGHIKLMNPQRSTVWY";
const KID_COLORS = ["#fbbf24", "#c084fc", "#2dd4bf", "#f472b6", "#60a5fa", "#a3e635"];

let nextId = 1;

function mulberry32(a: number) {
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const evoRnd = mulberry32(24);

export function hamming(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let d = 0;
  for (let i = 0; i < n; i += 1) {
    if (a[i] !== b[i]) d += 1;
  }
  return d + Math.abs(a.length - b.length);
}

export function similarity(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let m = 0;
  for (let i = 0; i < n; i += 1) {
    if (a[i] === b[i]) m += 1;
  }
  return m / n;
}

export function fitness(seq: string): number {
  return similarity(seq, REF_SEQ);
}

export function binds(seq: string): boolean {
  return fitness(seq) >= BIND_THRESH;
}

function seedToIndividual(
  seed: (typeof AE_PROBLEMA_POOL)[number],
  generation: number,
): Individual {
  return {
    id: nextId++,
    seq: seed.seq,
    pdb: seed.pdb,
    color: seed.color,
    tiltX: seed.tiltX,
    tiltY: seed.tiltY,
    latX: seed.latX,
    latY: seed.latY,
    generation,
  };
}

export function initialPopulation(): Individual[] {
  nextId = 1;
  return AE_PROBLEMA_POOL.map((seed) => seedToIndividual(seed, 1));
}

export function rankPopulation(pop: Individual[]): Individual[] {
  return [...pop].sort((a, b) => fitness(b.seq) - fitness(a.seq));
}

/** Top-K con diversidad: elitismo + secuencias claramente distintas. */
export function selectSurvivors(ranked: Individual[]): {
  survivors: Individual[];
  culled: Individual[];
} {
  const survivors: Individual[] = [];
  const usedSeqs = new Set<string>();

  const minDist = (ind: Individual) => {
    if (survivors.length === 0) return Infinity;
    return Math.min(...survivors.map((s) => hamming(s.seq, ind.seq)));
  };

  for (const ind of ranked) {
    if (survivors.length >= KEEP) break;
    if (usedSeqs.has(ind.seq)) continue;
    const dist = minDist(ind);
    const threshold =
      survivors.length === 0 ? 0 : Math.max(3, MIN_SURVIVOR_DIST - survivors.length);
    if (survivors.length > 0 && dist < threshold) continue;
    survivors.push(ind);
    usedSeqs.add(ind.seq);
  }

  for (const ind of ranked) {
    if (survivors.length >= KEEP) break;
    if (usedSeqs.has(ind.seq)) continue;
    survivors.push(ind);
    usedSeqs.add(ind.seq);
  }

  const survIds = new Set(survivors.map((s) => s.id));
  return {
    survivors,
    culled: ranked.filter((ind) => !survIds.has(ind.id)),
  };
}

export function crossover(
  pa: Individual,
  pb: Individual,
  rnd: () => number,
): { seq: string; fromA: boolean[] } {
  const len = pa.seq.length;
  const point = 1 + Math.floor(rnd() * (len - 2));
  const chars = pa.seq.split("");
  const fromA = pa.seq.split("").map((_, i) => i < point);
  for (let i = point; i < len; i += 1) {
    chars[i] = pb.seq[i] ?? pb.seq[pb.seq.length - 1];
    fromA[i] = false;
  }
  return { seq: chars.join(""), fromA };
}

export function mutate(
  seq: string,
  rnd: () => number,
  nMut = 2,
): { seq: string; positions: number[] } {
  const positions = new Set<number>();
  let s = seq;
  const target = Math.max(1, nMut);

  for (let attempt = 0; attempt < target * 4 && positions.size < target; attempt += 1) {
    const pos = Math.floor(rnd() * s.length);
    if (positions.has(pos)) continue;
    let aa = AA[Math.floor(rnd() * AA.length)];
    if (aa === s[pos]) aa = AA[(AA.indexOf(aa) + 5) % AA.length];
    s = s.slice(0, pos) + aa + s.slice(pos + 1);
    positions.add(pos);
  }

  return { seq: s, positions: [...positions] };
}

function divergentPair(
  survivors: Individual[],
  rnd: () => number,
): [number, number] {
  if (survivors.length < 2) return [0, 0];
  let bestI = 0;
  let bestJ = 1;
  let bestD = hamming(survivors[0].seq, survivors[1].seq);
  for (let i = 0; i < survivors.length; i += 1) {
    for (let j = i + 1; j < survivors.length; j += 1) {
      const d = hamming(survivors[i].seq, survivors[j].seq);
      if (d > bestD) {
        bestD = d;
        bestI = i;
        bestJ = j;
      }
    }
  }
  if (bestD >= 3) return [bestI, bestJ];
  let pa = Math.floor(rnd() * survivors.length);
  let pb = Math.floor(rnd() * survivors.length);
  while (pb === pa) pb = Math.floor(rnd() * survivors.length);
  return [pa, pb];
}

function immigrant(generation: number, rnd: () => number): Individual {
  const seed = AE_PROBLEMA_POOL[Math.floor(rnd() * AE_PROBLEMA_POOL.length)];
  const mut = mutate(seed.seq, rnd, 1);
  return {
    ...seedToIndividual(seed, generation),
    seq: mut.seq,
    mutatedPos: mut.positions,
    parentNote: "nuevo",
  };
}

function differsFromAll(seq: string, others: string[], minDist = 2): boolean {
  return others.every((o) => hamming(seq, o) >= minDist);
}

export function breedChildren(
  survivors: Individual[],
  count: number,
  generation: number,
  rnd: () => number,
): Individual[] {
  const kids: Individual[] = [];
  const existing = new Set(survivors.map((s) => s.seq));

  for (let k = 0; k < count; k += 1) {
    let child: Individual;

    if (k === count - 1) {
      let imm = immigrant(generation, rnd);
      let tries = 0;
      while (!differsFromAll(imm.seq, [...existing, ...kids.map((c) => c.seq)]) && tries < 8) {
        imm = immigrant(generation, rnd);
        tries += 1;
      }
      child = {
        ...imm,
        color: KID_COLORS[k % KID_COLORS.length],
        parentNote: "nuevo",
      };
    } else {
      const [pa, pb] = divergentPair(survivors, rnd);
      const parentA = survivors[pa];
      const parentB = survivors[pb];
      const cross = crossover(parentA, parentB, rnd);
      let mut = mutate(cross.seq, rnd, 2 + k);
      let tries = 0;
      while (
        (existing.has(mut.seq) || kids.some((c) => c.seq === mut.seq)) &&
        tries < 6
      ) {
        mut = mutate(cross.seq, rnd, 3);
        tries += 1;
      }
      const template = rnd() < 0.5 ? parentA : parentB;
      child = {
        id: nextId++,
        seq: mut.seq,
        pdb: template.pdb,
        color: KID_COLORS[k % KID_COLORS.length],
        tiltX: template.tiltX,
        tiltY: template.tiltY,
        latX: template.latX + (k - 1) * 2,
        latY: template.latY + (k - 1),
        fromA: cross.fromA,
        mutatedPos: mut.positions,
        parentNote: `P${pa + 1}×P${pb + 1}`,
        generation,
      };
    }

    kids.push(child);
    existing.add(child.seq);
  }

  return kids;
}

export function nextGeneration(
  survivors: Individual[],
  children: Individual[],
): Individual[] {
  return ensurePopulationDiversity([...survivors, ...children], evoRnd);
}

/** Sin secuencias duplicadas; rellena con variantes del pool inicial. */
export function ensurePopulationDiversity(
  pop: Individual[],
  rnd: () => number,
): Individual[] {
  const out: Individual[] = [];
  const seen = new Set<string>();

  for (const ind of pop) {
    if (seen.has(ind.seq)) continue;
    seen.add(ind.seq);
    out.push(ind);
  }

  while (out.length < POP_SIZE) {
    let imm = immigrant(out[0]?.generation ?? 1, rnd);
    let tries = 0;
    while (seen.has(imm.seq) && tries < 10) {
      imm = immigrant(out[0]?.generation ?? 1, rnd);
      tries += 1;
    }
    seen.add(imm.seq);
    out.push(imm);
  }

  return out.slice(0, POP_SIZE);
}

export const SEED_PDBS = [...new Set(AE_PROBLEMA_POOL.map((c) => c.pdb))];
