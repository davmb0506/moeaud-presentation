import { useEffect, useRef, useState } from "react";
import * as $3Dmol from "3dmol";

type Vec3 = [number, number, number];

function IconPlay() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

// Colores de la narrativa
const COLOR_VEGFA = "#38bdf8"; // VEGF-A (objetivo)
const COLOR_VEGFA_BB = "#0c4a6e"; // backbone (cartoon) de VEGF-A
const VEGFA_SURF_OPACITY = 0.9; // superficie translúcida para ver el backbone
const COLOR_EPITOPE = "#f43f5e"; // epítopo (zona de unión)
const COLOR_BINDER = "#34d399"; // binder natural (VEGFR-2) -> éxito
const COLOR_FAIL = "#ef4444"; // candidato rechazado

// Candidatos fallidos: cada uno es un PDB distinto (otra proteína / "secuencia").
// Todos llegan desde el mismo lado (el eje natural de unión) con pequeñas
// variaciones: tiltX/tiltY inclinan ligeramente la trayectoria y latX/latY
// desplazan la pose "casi-acoplada" para que no se solapen.
type Candidate = {
  file: string;
  name: string;
  color: string;
  tiltX: number;
  tiltY: number;
  latX: number;
  latY: number;
};
const CANDIDATES: Candidate[] = [
  { file: "/1UBQ.pdb", name: "Ubiquitina", color: "#f59e0b", tiltX: -0.14, tiltY: 0.06, latX: -7, latY: 3 },
  { file: "/1CRN.pdb", name: "Crambina", color: "#a855f7", tiltX: 0.12, tiltY: -0.05, latX: 6, latY: -2 },
  { file: "/2GB1.pdb", name: "Dominio B1 (prot. G)", color: "#22d3ee", tiltX: 0.03, tiltY: 0.15, latX: -2, latY: 7 },
];

// Geometría de la animación
const EPITOPE_CUTOFF = 5; // Å, define el epítopo
const PARATOPE_PAD = 4; // residuos extra a cada lado de un contacto del binder
const PARATOPE_GAP = 8; // rellena huecos <= este tamaño para evitar fragmentación
const CAND_OFFSET = 48; // Å, distancia inicial de cada candidato
const NAT_OFFSET = 70; // Å, distancia inicial del binder natural
const EPI_STANDOFF = 18; // Å, qué tan cerca del epítopo queda un candidato
const APPROACH_FRAMES = 26;
const RETREAT_FRAMES = 16;
const SUCCESS_FRAMES = 30;
const FRAME_MS = 32;

type Step = 0 | 1 | 2 | 3;

export function MoleculeViewer() {
  const viewerRef = useRef<HTMLDivElement | null>(null);

  const glViewerRef = useRef<any>(null);
  const modelARef = useRef<any>(null);
  const modelRRef = useRef<any>(null);
  const candModelsRef = useRef<any[]>([]);
  const surfARef = useRef<any>(null);
  const surfRRef = useRef<any>(null);

  // Geometría base
  const boundRef = useRef<Vec3[]>([]); // pose acoplada del binder natural
  const bindDirRef = useRef<Vec3>([1, 0, 0]);
  const epitopeCenterRef = useRef<Vec3>([0, 0, 0]);
  // Por candidato: coords con su centroide en la pose "casi-acoplada"
  const candBaseRef = useRef<Vec3[][]>([]);

  // Secuencias (código de 1 letra) para el panel
  const vegfaSeqRef = useRef("");
  const binderSeqRef = useRef("");
  const candSeqsRef = useRef<string[]>([]);

  const cancelRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState<Step>(0);
  const [seqInfo, setSeqInfo] = useState<{
    name: string;
    seq: string;
    color: string;
    note?: string;
  } | null>(null);

  // ---- Superficies (limitadas por MODELO para no mezclar cadenas) -----------
  const addSurf = async (style: any, sel: any): Promise<any> => {
    const viewer = glViewerRef.current;
    const surf = viewer.addSurface($3Dmol.SurfaceType.VDW, style, sel, sel);
    await surf;
    return surf.surfid;
  };

  const removeSurf = (ref: { current: any }) => {
    const viewer = glViewerRef.current;
    if (viewer && ref.current != null) {
      viewer.removeSurface(ref.current);
      ref.current = null;
    }
  };

  const selA = () => ({ model: modelARef.current?.getID() });
  const selR = () => ({ model: modelRRef.current?.getID() });

  const showVegfaPlain = async () => {
    removeSurf(surfARef);
    surfARef.current = await addSurf(
      { color: COLOR_VEGFA, opacity: VEGFA_SURF_OPACITY },
      selA()
    );
  };

  const showVegfaWithEpitope = async () => {
    removeSurf(surfARef);
    surfARef.current = await addSurf(
      {
        colorscheme: {
          prop: "epitope",
          map: { 0: COLOR_VEGFA, 1: COLOR_EPITOPE },
        },
        opacity: VEGFA_SURF_OPACITY,
      },
      selA()
    );
  };

  // ---- Animación de un modelo por frames ------------------------------------
  const playFrames = (model: any, n: number) =>
    new Promise<void>((resolve) => {
      const viewer = glViewerRef.current;
      if (!viewer || !model) return resolve();
      let t = 0;
      const tick = () => {
        if (cancelRef.current) return resolve();
        Promise.resolve(model.setFrame(t)).then(() => {
          viewer.render();
          t += 1;
          if (t < n) window.setTimeout(tick, FRAME_MS);
          else resolve();
        });
      };
      tick();
    });

  const runPath = async (model: any, start: Vec3[], end: Vec3[], n: number) => {
    if (!model) return;
    const frames: number[][][] = [];
    for (let t = 0; t < n; t += 1) {
      const f = n === 1 ? 1 : t / (n - 1);
      frames.push(
        start.map((s, i) => [
          s[0] + (end[i][0] - s[0]) * f,
          s[1] + (end[i][1] - s[1]) * f,
          s[2] + (end[i][2] - s[2]) * f,
        ])
      );
    }
    model.setCoordinates(frames as any, "array");
    await playFrames(model, n);
  };

  // Rebote amortiguado al chocar contra el epítopo.
  const runBounce = async (model: any, base: Vec3[], dir: Vec3) => {
    if (!model) return;
    const amp = 8;
    const n = 16;
    const frames: number[][][] = [];
    for (let t = 0; t < n; t += 1) {
      const f = t / (n - 1);
      const o = amp * Math.exp(-3 * f) * Math.sin(2 * Math.PI * 2 * f);
      frames.push(
        base.map((p) => [p[0] + dir[0] * o, p[1] + dir[1] * o, p[2] + dir[2] * o])
      );
    }
    model.setCoordinates(frames as any, "array");
    await playFrames(model, n);
  };

  const delay = (ms: number) =>
    new Promise<void>((resolve) => window.setTimeout(resolve, ms));

  // ---- Secuencia narrada ----------------------------------------------------
  const play = async () => {
    const viewer = glViewerRef.current;
    if (!viewer || !ready || playing) return;

    cancelRef.current = false;
    setPlaying(true);

    const bound = boundRef.current;
    const bindDir = bindDirRef.current;
    const idA = modelARef.current?.getID();
    const idR = modelRRef.current?.getID();

    // Paso 1: revelar el epítopo
    setStep(1);
    setSeqInfo({
      name: "VEGF-A (objetivo)",
      seq: vegfaSeqRef.current,
      color: COLOR_EPITOPE,
    });
    await showVegfaWithEpitope();
    if (cancelRef.current) return;
    viewer.zoomTo({ model: idA }, 600);
    viewer.zoom(0.7, 400);
    viewer.render();
    await delay(1500);
    if (cancelRef.current) return;

    // Paso 2: candidatos (otros PDBs) que NO encajan. Todos entran desde el
    // mismo lado (bindDir) con una leve inclinación distinta.
    setStep(2);
    const [p1, p2] = perpBasis(bindDir);
    for (let i = 0; i < CANDIDATES.length; i += 1) {
      if (cancelRef.current) return;
      const cand = CANDIDATES[i];
      const model = candModelsRef.current[i];
      const base = candBaseRef.current[i];
      if (!model || !base) continue;

      const dir = normalize([
        bindDir[0] + p1[0] * cand.tiltX + p2[0] * cand.tiltY,
        bindDir[1] + p1[1] * cand.tiltX + p2[1] * cand.tiltY,
        bindDir[2] + p1[2] * cand.tiltX + p2[2] * cand.tiltY,
      ]);
      const start = base.map(
        (p) =>
          [
            p[0] + dir[0] * CAND_OFFSET,
            p[1] + dir[1] * CAND_OFFSET,
            p[2] + dir[2] * CAND_OFFSET,
          ] as Vec3
      );

      setSeqInfo({
        name: cand.name,
        seq: candSeqsRef.current[i] || "",
        color: cand.color,
      });
      model.setStyle({}, { cartoon: { color: cand.color } });
      await runPath(model, start, base, APPROACH_FRAMES);
      if (cancelRef.current) return;

      // No encaja: rechazado (rojo), rebota y se retira
      model.setStyle({}, { cartoon: { color: COLOR_FAIL } });
      viewer.render();
      await runBounce(model, base, dir);
      if (cancelRef.current) return;
      await delay(600);
      if (cancelRef.current) return;
      await runPath(model, base, start, RETREAT_FRAMES);
      model.setStyle({}, {});
      viewer.render();
    }

    // Paso 3: el binder natural encaja
    if (cancelRef.current) return;
    setSeqInfo({
      name: "Binder natural (VEGFR-2)",
      seq: binderSeqRef.current,
      color: COLOR_BINDER,
    });
    const successStart = bound.map(
      (p) =>
        [
          p[0] + bindDir[0] * NAT_OFFSET,
          p[1] + bindDir[1] * NAT_OFFSET,
          p[2] + bindDir[2] * NAT_OFFSET,
        ] as Vec3
    );
    modelRRef.current?.setStyle({}, { cartoon: { color: COLOR_BINDER } });
    await runPath(modelRRef.current, successStart, bound, SUCCESS_FRAMES);
    if (cancelRef.current) return;

    setStep(3);
    modelRRef.current?.setStyle({}, {});
    surfRRef.current = await addSurf({ color: COLOR_BINDER, opacity: 0.92 }, selR());
    if (cancelRef.current) return;
    viewer.zoomTo({ model: [idA, idR] }, 800);
    viewer.render();
    setPlaying(false);
  };

  const reset = async () => {
    const viewer = glViewerRef.current;
    if (!viewer) return;
    cancelRef.current = true;
    setPlaying(false);
    setStep(0);
    setSeqInfo(null);
    removeSurf(surfRRef);
    modelRRef.current?.setStyle({}, {});
    candModelsRef.current.forEach((m) => m?.setStyle({}, {}));
    await showVegfaPlain();
    viewer.zoomTo({ model: modelARef.current?.getID() }, 600);
    viewer.render();
  };

  // ---- Carga del modelo ------------------------------------------------------
  useEffect(() => {
    const container = viewerRef.current;
    if (!container) return;

    cancelRef.current = false;
    // Fondo transparente: alpha 0. Usamos el color de la tarjeta del tema para
    // que la niebla (fog) de 3Dmol combine con el fondo y no se vea blanca.
    const viewerBg =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--viewer-bg")
        .trim() || "#f4f7fc";
    const viewer = $3Dmol.createViewer(container, {
      backgroundColor: viewerBg,
      backgroundAlpha: 0,
    });
    viewer.setBackgroundColor(viewerBg, 0);
    glViewerRef.current = viewer;

    const loadText = (url: string) =>
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(`No se pudo cargar ${url}`);
        return r.text();
      });

    Promise.all([
      loadText("/3V2A.pdb"),
      ...CANDIDATES.map((c) => loadText(c.file)),
    ])
      .then(async ([complexText, ...candTexts]) => {
        if (
          complexText.startsWith("<!doctype") ||
          complexText.startsWith("<html")
        ) {
          throw new Error("Se cargó HTML en lugar del PDB (revisa public/).");
        }

        // VEGF-A (cadena A) y binder natural (cadena R) del complejo 3V2A.
        const lines = complexText.split("\n");
        const isAtom = (l: string) =>
          l.startsWith("ATOM") || l.startsWith("HETATM");
        const chainA = lines.filter((l) => isAtom(l) && l[21] === "A").join("\n");
        const chainR = lines.filter((l) => isAtom(l) && l[21] === "R").join("\n");

        const modelA = viewer.addModel(chainA, "pdb");
        const modelR = viewer.addModel(chainR, "pdb");
        modelARef.current = modelA;
        modelRRef.current = modelR;

        const aAtoms = modelA.selectedAtoms({}) as any[];
        const rAtoms = modelR.selectedAtoms({}) as any[];

        vegfaSeqRef.current = sequenceOf(aAtoms);
        binderSeqRef.current = sequenceOf(rAtoms);

        // Epítopo = residuos de VEGF-A a <= EPITOPE_CUTOFF Å del binder.
        const cutoff2 = EPITOPE_CUTOFF * EPITOPE_CUTOFF;
        const epitope = new Set<number>();
        for (const a of aAtoms) {
          if (a.resi == null || epitope.has(a.resi)) continue;
          for (const r of rAtoms) {
            const dx = a.x - r.x;
            const dy = a.y - r.y;
            const dz = a.z - r.z;
            if (dx * dx + dy * dy + dz * dz <= cutoff2) {
              epitope.add(a.resi);
              break;
            }
          }
        }
        const epiAtoms: any[] = [];
        for (const a of aAtoms) {
          a.properties = a.properties || {};
          const isEpi = epitope.has(a.resi);
          a.properties.epitope = isEpi ? 1 : 0;
          if (isEpi) epiAtoms.push(a);
        }

        const cA = centroid(aAtoms);
        const cR = centroid(rAtoms);
        const epiCenter = centroid(epiAtoms.length ? epiAtoms : aAtoms);
        epitopeCenterRef.current = epiCenter;
        const bindDir = normalize([
          cR[0] - cA[0],
          cR[1] - cA[1],
          cR[2] - cA[2],
        ]);
        bindDirRef.current = bindDir;

        // Paratopo: solo los residuos de VEGFR-2 que contactan a VEGF-A
        // (a <= EPITOPE_CUTOFF Å). Mostramos únicamente esa porción del binder.
        const paratope = new Set<number>();
        for (const r of rAtoms) {
          if (r.resi == null || paratope.has(r.resi)) continue;
          for (const a of aAtoms) {
            const dx = r.x - a.x;
            const dy = r.y - a.y;
            const dz = r.z - a.z;
            if (dx * dx + dy * dy + dz * dz <= cutoff2) {
              paratope.add(r.resi);
              break;
            }
          }
        }
        // Para que el binder no se vea fragmentado: añade un margen de residuos
        // a cada lado de cada contacto y rellena los huecos cortos entre ellos.
        const contacts = [...paratope].sort((a, b) => a - b);
        const keepResi = new Set<number>();
        for (const ri of contacts) {
          for (let k = ri - PARATOPE_PAD; k <= ri + PARATOPE_PAD; k += 1) {
            keepResi.add(k);
          }
        }
        for (let i = 1; i < contacts.length; i += 1) {
          const gap = contacts[i] - contacts[i - 1];
          if (gap > 1 && gap <= PARATOPE_GAP + 1) {
            for (let k = contacts[i - 1] + 1; k < contacts[i]; k += 1) {
              keepResi.add(k);
            }
          }
        }
        const chainRBind = lines
          .filter(
            (l) =>
              isAtom(l) &&
              l[21] === "R" &&
              keepResi.has(parseInt(l.slice(22, 26), 10))
          )
          .join("\n");
        // Reemplaza el binder completo por solo su porción de unión.
        viewer.removeModel(modelR);
        const modelRBind = viewer.addModel(chainRBind, "pdb");
        modelRRef.current = modelRBind;
        const rBindAtoms = modelRBind.selectedAtoms({}) as any[];
        binderSeqRef.current = sequenceOf(rBindAtoms);
        boundRef.current = rBindAtoms.map((a) => [a.x, a.y, a.z] as Vec3);

        // VEGF-A: backbone (cartoon) visible bajo la superficie translúcida.
        modelA.setStyle({}, { cartoon: { color: COLOR_VEGFA_BB } });
        modelRBind.setStyle({}, {}); // binder natural oculto

        // Carga cada candidato como modelo independiente y calcula su pose
        // "casi-acoplada": su centroide cerca del epítopo (con hueco), más una
        // desalineación lateral distinta por candidato.
        const [pb1, pb2] = perpBasis(bindDir);
        const candModels: any[] = [];
        const candBase: Vec3[][] = [];
        const candSeqs: string[] = [];
        candTexts.forEach((text, i) => {
          const single = firstModel(text);
          const model = viewer.addModel(single, "pdb");
          model.setStyle({}, {});
          const atoms = model.selectedAtoms({}) as any[];
          candSeqs[i] = sequenceOf(atoms);
          const c = centroid(atoms);
          const cfg = CANDIDATES[i];
          const target: Vec3 = [
            epiCenter[0] + bindDir[0] * EPI_STANDOFF + pb1[0] * cfg.latX + pb2[0] * cfg.latY,
            epiCenter[1] + bindDir[1] * EPI_STANDOFF + pb1[1] * cfg.latX + pb2[1] * cfg.latY,
            epiCenter[2] + bindDir[2] * EPI_STANDOFF + pb1[2] * cfg.latX + pb2[2] * cfg.latY,
          ];
          const shift: Vec3 = [
            target[0] - c[0],
            target[1] - c[1],
            target[2] - c[2],
          ];
          candBase.push(
            atoms.map((a) => [a.x + shift[0], a.y + shift[1], a.z + shift[2]])
          );
          candModels.push(model);
        });
        candModelsRef.current = candModels;
        candBaseRef.current = candBase;
        candSeqsRef.current = candSeqs;

        await showVegfaPlain();
        if (cancelRef.current) return;
        viewer.zoomTo({ model: modelA.getID() });
        viewer.render();
        viewer.resize();
        setReady(true);
      })
      .catch((error) => {
        console.error("Error cargando/renderizando el PDB:", error);
      });

    return () => {
      cancelRef.current = true;
      viewer.clear();
      if (container) container.innerHTML = "";
      glViewerRef.current = null;
      modelARef.current = null;
      modelRRef.current = null;
      candModelsRef.current = [];
      surfARef.current = null;
      surfRRef.current = null;
    };
  }, []);

  const buttonLabel = playing
    ? "Diseñando…"
    : step === 0
    ? <IconPlay />
    : "Reiniciar";

  const onButton = () => (step === 0 ? play() : reset());

  return (
    <div className="molecule-block">
      <div className="molecule-stage">
        <div className="molecule-viewer" ref={viewerRef} />
        {seqInfo && seqInfo.seq && (
          <div className="molecule-seq">
            {seqInfo.note && (
              <p className="molecule-seq-note" style={{ color: seqInfo.color }}>
                {seqInfo.note}
              </p>
            )}
            <code
              className="molecule-seq-text"
              style={{ color: seqInfo.color }}
            >
              {seqInfo.seq}
            </code>
          </div>
        )}
      </div>
      <div className="molecule-controls">
        <button
          className="molecule-button"
          onClick={onButton}
          disabled={!ready || playing}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

// ---- Utilidades --------------------------------------------------------------
const THREE_TO_ONE: Record<string, string> = {
  ALA: "A", ARG: "R", ASN: "N", ASP: "D", CYS: "C", GLN: "Q", GLU: "E",
  GLY: "G", HIS: "H", ILE: "I", LEU: "L", LYS: "K", MET: "M", PHE: "F",
  PRO: "P", SER: "S", THR: "T", TRP: "W", TYR: "Y", VAL: "V",
  MSE: "M", SEC: "U", PYL: "O",
};

// Secuencia en código de 1 letra a partir de los carbonos alfa (orden de archivo).
function sequenceOf(atoms: any[]): string {
  let seq = "";
  for (const a of atoms) {
    if (a.atom === "CA" && a.resn && THREE_TO_ONE[a.resn] !== undefined) {
      seq += THREE_TO_ONE[a.resn];
    }
  }
  return seq;
}

// Conserva solo el primer modelo de un PDB (relevante para ensambles NMR).
function firstModel(pdbText: string): string {
  const out: string[] = [];
  for (const l of pdbText.split("\n")) {
    if (l.startsWith("ENDMDL")) break;
    out.push(l);
  }
  return out.join("\n");
}

function centroid(atoms: any[]): Vec3 {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const a of atoms) {
    x += a.x;
    y += a.y;
    z += a.z;
  }
  const n = Math.max(atoms.length, 1);
  return [x / n, y / n, z / n];
}

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

// Dos vectores ortonormales perpendiculares a d (plano de aproximación común).
function perpBasis(d: Vec3): [Vec3, Vec3] {
  const ref: Vec3 = Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const p1 = normalize(cross(d, ref));
  const p2 = normalize(cross(d, p1));
  return [p1, p2];
}
