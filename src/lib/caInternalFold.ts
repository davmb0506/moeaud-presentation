import * as THREE from "three";

export type CaInternals = {
  bonds: Float64Array;
  angles: Float64Array;
  dihedrals: Float64Array;
};

const TMP_A = new THREE.Vector3();
const TMP_B = new THREE.Vector3();
const TMP_C = new THREE.Vector3();
const TMP_N = new THREE.Vector3();
const TMP_M = new THREE.Vector3();
const TMP_BC = new THREE.Vector3();
const TMP_AB = new THREE.Vector3();
const TMP_U = new THREE.Vector3();
const TMP_PERP = new THREE.Vector3();
const TMP_W = new THREE.Vector3();

function dihedral(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3,
): number {
  TMP_A.subVectors(p1, p0);
  TMP_B.subVectors(p2, p1);
  TMP_C.subVectors(p3, p2);
  TMP_N.crossVectors(TMP_A, TMP_B).normalize();
  TMP_M.crossVectors(TMP_B, TMP_C).normalize();
  TMP_BC.copy(TMP_B).normalize();
  TMP_A.crossVectors(TMP_N, TMP_BC);
  return Math.atan2(TMP_A.dot(TMP_M), TMP_N.dot(TMP_M));
}

export function measureInternals(pts: THREE.Vector3[]): CaInternals {
  const n = pts.length;
  const bonds = new Float64Array(n - 1);
  const angles = new Float64Array(n - 2);
  const dihedrals = new Float64Array(n - 3);

  for (let i = 0; i < n - 1; i += 1) {
    bonds[i] = pts[i].distanceTo(pts[i + 1]);
  }
  for (let i = 1; i < n - 1; i += 1) {
    TMP_A.subVectors(pts[i - 1], pts[i]).normalize();
    TMP_B.subVectors(pts[i + 1], pts[i]).normalize();
    angles[i - 1] = Math.acos(THREE.MathUtils.clamp(TMP_A.dot(TMP_B), -1, 1));
  }
  for (let i = 0; i < n - 3; i += 1) {
    dihedrals[i] = dihedral(pts[i], pts[i + 1], pts[i + 2], pts[i + 3]);
  }
  return { bonds, angles, dihedrals };
}

function nerfPlace(
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  length: number,
  theta: number,
  chi: number,
  out: THREE.Vector3,
): void {
  TMP_AB.subVectors(b, a);
  TMP_BC.subVectors(c, b).normalize();
  TMP_N.crossVectors(TMP_AB, TMP_BC);
  if (TMP_N.lengthSq() < 1e-12) {
    const tip =
      Math.abs(TMP_BC.x) < 0.9 ? TMP_A.set(1, 0, 0) : TMP_A.set(0, 1, 0);
    TMP_N.crossVectors(TMP_BC, tip);
  }
  TMP_N.normalize();
  TMP_M.crossVectors(TMP_N, TMP_BC);

  const st = Math.sin(theta);
  const lx = -length * Math.cos(theta);
  const ly = length * st * Math.cos(chi);
  const lz = -length * st * Math.sin(chi);

  out
    .copy(c)
    .addScaledVector(TMP_BC, lx)
    .addScaledVector(TMP_M, ly)
    .addScaledVector(TMP_N, lz);
}

/**
 * Reconstruye la cadena fijando p0,p1 al seed nativo y p2 en el mismo
 * plano local — así el plegado queda orientado hacia la estructura final
 * sin Kabsch.
 */
export function rebuildSeeded(
  seed: THREE.Vector3[],
  bonds: Float64Array,
  angles: Float64Array,
  dihedrals: Float64Array,
  out: THREE.Vector3[],
): void {
  const n = bonds.length + 1;
  out[0].copy(seed[0]);
  out[1].copy(seed[1]);

  TMP_U.subVectors(seed[0], seed[1]).normalize();
  TMP_W.subVectors(seed[2], seed[1]);
  TMP_PERP.crossVectors(TMP_U, TMP_W).cross(TMP_U);
  if (TMP_PERP.lengthSq() < 1e-12) {
    TMP_PERP.set(0, 1, 0);
  } else {
    TMP_PERP.normalize();
  }
  if (TMP_PERP.dot(TMP_W) < 0) TMP_PERP.negate();

  const ang0 = angles[0];
  const bond1 = bonds[1];
  out[2]
    .copy(seed[1])
    .addScaledVector(TMP_U, bond1 * Math.cos(ang0))
    .addScaledVector(TMP_PERP, bond1 * Math.sin(ang0));

  for (let i = 3; i < n; i += 1) {
    nerfPlace(
      out[i - 3],
      out[i - 2],
      out[i - 1],
      bonds[i - 1],
      angles[i - 2],
      dihedrals[i - 3],
      out[i],
    );
  }
}

export function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function smoothstep(t: number): number {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

/** Empuje suave entre Cα no enlazados + restauración de distancias de enlace. */
function relaxClashes(
  pts: THREE.Vector3[],
  bonds: Float64Array,
  minDist: number,
  iterations: number,
): void {
  const n = pts.length;
  for (let iter = 0; iter < iterations; iter += 1) {
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 3; j < n; j += 1) {
        TMP_A.subVectors(pts[j], pts[i]);
        const d = TMP_A.length();
        if (d > 1e-6 && d < minDist) {
          const push = ((minDist - d) / d) * 0.35;
          TMP_A.multiplyScalar(push);
          pts[i].addScaledVector(TMP_A, -0.5);
          pts[j].addScaledVector(TMP_A, 0.5);
        }
      }
    }
    for (let i = 0; i < n - 1; i += 1) {
      TMP_A.subVectors(pts[i + 1], pts[i]);
      const d = TMP_A.length();
      if (d < 1e-8) continue;
      const corr = (bonds[i] - d) * 0.5;
      TMP_A.multiplyScalar(corr / d);
      pts[i].addScaledVector(TMP_A, -1);
      pts[i + 1].addScaledVector(TMP_A, 1);
    }
  }
}

function centerOn(pts: THREE.Vector3[], targetCenter: THREE.Vector3): void {
  TMP_A.set(0, 0, 0);
  for (let i = 0; i < pts.length; i += 1) TMP_A.add(pts[i]);
  TMP_A.multiplyScalar(1 / pts.length);
  TMP_B.subVectors(targetCenter, TMP_A);
  for (let i = 0; i < pts.length; i += 1) pts[i].add(TMP_B);
}

/**
 * Pose t∈[0,1]: extendida → nativa interpolando diedros Cα (y ángulos
 * suavemente), con ola N→C. Conserva distancias de enlace.
 */
export function foldPoseAt(
  t: number,
  native: THREE.Vector3[],
  nativeInt: CaInternals,
  out: THREE.Vector3[],
  nativeCenter: THREE.Vector3,
): void {
  const n = native.length;
  const te = smoothstep(t);

  if (te >= 0.999) {
    for (let i = 0; i < n; i += 1) out[i].copy(native[i]);
    return;
  }

  const { bonds, angles: natAng, dihedrals: natDih } = nativeInt;
  const angles = new Float64Array(natAng.length);
  const dihedrals = new Float64Array(natDih.length);
  const EXT_ANGLE = THREE.MathUtils.degToRad(148);

  for (let i = 0; i < angles.length; i += 1) {
    const u = (i + 0.5) / angles.length;
    const local = smoothstep(
      THREE.MathUtils.clamp((te - 0.16 * u) / 0.84, 0, 1),
    );
    // Conservar más la geometría local nativa → menos choques
    angles[i] = (1 - local) * (0.35 * EXT_ANGLE + 0.65 * natAng[i]) + local * natAng[i];
  }
  for (let i = 0; i < dihedrals.length; i += 1) {
    const u = (i + 0.5) / dihedrals.length;
    const local = smoothstep(
      THREE.MathUtils.clamp((te - 0.2 * u) / 0.8, 0, 1),
    );
    dihedrals[i] = lerpAngle(Math.PI, natDih[i], local);
  }

  rebuildSeeded(native, bonds, angles, dihedrals, out);

  // Relajar solo en la fase media, donde suelen aparecer acercamientos
  if (te > 0.35 && te < 0.92) {
    const strength = Math.sin(((te - 0.35) / 0.57) * Math.PI);
    const minDist = 2.6 + 0.6 * (1 - strength);
    relaxClashes(out, bonds, minDist, 4 + Math.round(strength * 6));
  }

  centerOn(out, nativeCenter);
}
