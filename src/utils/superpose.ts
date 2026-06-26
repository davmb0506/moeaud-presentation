// Superposición rígida (Kabsch) por método del cuaternión de Horn, sin SVD
// externa. Se usa para alinear cada complejo predicho sobre una referencia
// (los Cα de VEGF-A) de modo que el objetivo quede fijo entre estructuras.

type Mat3 = number[][];
type Vec3 = [number, number, number];

// Eigenvector del mayor valor propio de una matriz simétrica 4x4 (Jacobi).
function largestEigenvector(input: number[][]): number[] {
  const n = 4;
  const A = input.map((r) => r.slice());
  const V = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
  for (let iter = 0; iter < 100; iter++) {
    let p = 0;
    let q = 1;
    let max = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(A[i][j]) > max) {
          max = Math.abs(A[i][j]);
          p = i;
          q = j;
        }
      }
    }
    if (max < 1e-12) break;
    const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
    const sign = theta >= 0 ? 1 : -1;
    const t = sign / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
    const c = 1 / Math.sqrt(t * t + 1);
    const s = t * c;
    for (let i = 0; i < n; i++) {
      const aip = A[i][p];
      const aiq = A[i][q];
      A[i][p] = c * aip - s * aiq;
      A[i][q] = s * aip + c * aiq;
    }
    for (let i = 0; i < n; i++) {
      const api = A[p][i];
      const aqi = A[q][i];
      A[p][i] = c * api - s * aqi;
      A[q][i] = s * api + c * aqi;
    }
    for (let i = 0; i < n; i++) {
      const vip = V[i][p];
      const viq = V[i][q];
      V[i][p] = c * vip - s * viq;
      V[i][q] = s * vip + c * viq;
    }
  }
  let best = 0;
  for (let i = 1; i < n; i++) if (A[i][i] > A[best][best]) best = i;
  return [V[0][best], V[1][best], V[2][best], V[3][best]];
}

// Transforma P para superponerlo sobre Q (puntos correspondientes en orden).
// Devuelve la rotación R (3x3) y traslación t tal que p' = R·p + t.
export function kabsch(P: number[][], Q: number[][]): { R: Mat3; t: Vec3 } {
  const n = Math.min(P.length, Q.length);
  const cP: Vec3 = [0, 0, 0];
  const cQ: Vec3 = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 3; k++) {
      cP[k] += P[i][k];
      cQ[k] += Q[i][k];
    }
  }
  for (let k = 0; k < 3; k++) {
    cP[k] /= n;
    cQ[k] /= n;
  }
  const H = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < n; i++) {
    const px = P[i][0] - cP[0];
    const py = P[i][1] - cP[1];
    const pz = P[i][2] - cP[2];
    const qx = Q[i][0] - cQ[0];
    const qy = Q[i][1] - cQ[1];
    const qz = Q[i][2] - cQ[2];
    H[0][0] += px * qx; H[0][1] += px * qy; H[0][2] += px * qz;
    H[1][0] += py * qx; H[1][1] += py * qy; H[1][2] += py * qz;
    H[2][0] += pz * qx; H[2][1] += pz * qy; H[2][2] += pz * qz;
  }
  const Sxx = H[0][0], Sxy = H[0][1], Sxz = H[0][2];
  const Syx = H[1][0], Syy = H[1][1], Syz = H[1][2];
  const Szx = H[2][0], Szy = H[2][1], Szz = H[2][2];
  const N = [
    [Sxx + Syy + Szz, Syz - Szy, Szx - Sxz, Sxy - Syx],
    [Syz - Szy, Sxx - Syy - Szz, Sxy + Syx, Szx + Sxz],
    [Szx - Sxz, Sxy + Syx, -Sxx + Syy - Szz, Syz + Szy],
    [Sxy - Syx, Szx + Sxz, Syz + Szy, -Sxx - Syy + Szz],
  ];
  const [w, x, y, z] = largestEigenvector(N);
  const R: Mat3 = [
    [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
    [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
    [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
  ];
  const t: Vec3 = [
    cQ[0] - (R[0][0] * cP[0] + R[0][1] * cP[1] + R[0][2] * cP[2]),
    cQ[1] - (R[1][0] * cP[0] + R[1][1] * cP[1] + R[1][2] * cP[2]),
    cQ[2] - (R[2][0] * cP[0] + R[2][1] * cP[1] + R[2][2] * cP[2]),
  ];
  return { R, t };
}

// Cα de una cadena dada, en orden de archivo.
export function chainCA(pdbText: string, chain: string): number[][] {
  const out: number[][] = [];
  for (const line of pdbText.split("\n")) {
    if (!line.startsWith("ATOM")) continue;
    if (line.substring(12, 16).trim() !== "CA") continue;
    if (line[21] !== chain) continue;
    out.push([
      parseFloat(line.substring(30, 38)),
      parseFloat(line.substring(38, 46)),
      parseFloat(line.substring(46, 54)),
    ]);
  }
  return out;
}

const fmt8 = (v: number): string => v.toFixed(3).padStart(8);

// Aplica R·p + t a todas las coordenadas atómicas del PDB.
export function transformPdb(pdbText: string, R: Mat3, t: Vec3): string {
  const out: string[] = [];
  for (const line of pdbText.split("\n")) {
    if (line.startsWith("ATOM") || line.startsWith("HETATM")) {
      const x = parseFloat(line.substring(30, 38));
      const y = parseFloat(line.substring(38, 46));
      const z = parseFloat(line.substring(46, 54));
      const nx = R[0][0] * x + R[0][1] * y + R[0][2] * z + t[0];
      const ny = R[1][0] * x + R[1][1] * y + R[1][2] * z + t[1];
      const nz = R[2][0] * x + R[2][1] * y + R[2][2] * z + t[2];
      out.push(line.substring(0, 30) + fmt8(nx) + fmt8(ny) + fmt8(nz) + line.substring(54));
    } else {
      out.push(line);
    }
  }
  return out.join("\n");
}
