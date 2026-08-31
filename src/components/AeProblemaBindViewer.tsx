import { useEffect, useRef, useState } from "react";
import * as $3Dmol from "3dmol";
import { composeRefTargetWithEvalBinder } from "../utils/superpose";
import { SEED_PDBS } from "../lib/aeProblemaEvolution";

type Vec3 = [number, number, number];
type Phase = "pick" | "approach" | "fail" | "success" | "retreat";

const COLOR_VEGFA = "#38bdf8";
const COLOR_VEGFA_BB = "#0c4a6e";
const VEGFA_SURF_OPACITY = 0.9;
const COLOR_EPITOPE = "#f43f5e";
const COLOR_BINDER = "#34d399";
const COLOR_FAIL = "#ef4444";

const EPITOPE_CUTOFF = 5;
const CAND_OFFSET = 44;
const EPI_STANDOFF = 16;
const APPROACH_FRAMES = 12;
const RETREAT_FRAMES = 6;
const SUCCESS_FRAMES = 14;
const FRAME_MS = 20;

const REF_ROLES = { targetChain: "A", binderChain: "R" as const };
const EVAL_ROLES = { targetChain: "B", binderChain: "A" as const };

export type BindEntry = {
  pdb: string;
  color: string;
  tiltX: number;
  tiltY: number;
  latX: number;
  latY: number;
  binds: boolean;
};

type Props = {
  entry: BindEntry | null;
  phase: Phase;
  visible: boolean;
  idle: boolean;
};

function centroid(atoms: { x: number; y: number; z: number }[]): Vec3 {
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

function perpBasis(d: Vec3): [Vec3, Vec3] {
  const ref: Vec3 = Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const p1 = normalize(cross(d, ref));
  const p2 = normalize(cross(d, p1));
  return [p1, p2];
}

function extractChain(pdbText: string, chain: string): string {
  return pdbText
    .split("\n")
    .filter((l) => l.startsWith("ATOM") && l[21] === chain)
    .join("\n");
}

function offsetBound(
  base: Vec3[],
  bindDir: Vec3,
  latX: number,
  latY: number,
): Vec3[] {
  const [pb1, pb2] = perpBasis(bindDir);
  const shift: Vec3 = [
    pb1[0] * latX + pb2[0] * latY,
    pb1[1] * latX + pb2[1] * latY,
    pb1[2] * latX + pb2[2] * latY,
  ];
  return base.map(([x, y, z]) => [x + shift[0], y + shift[1], z + shift[2]]);
}

export function AeProblemaBindViewer({ entry, phase, visible, idle }: Props) {
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const glViewerRef = useRef<any>(null);
  const modelARef = useRef<any>(null);
  const pdbModelsRef = useRef<Map<string, any>>(new Map());
  const boundRef = useRef<Map<string, Vec3[]>>(new Map());
  const surfARef = useRef<any>(null);
  const surfBindRef = useRef<any>(null);
  const bindDirRef = useRef<Vec3>([1, 0, 0]);
  const cancelRef = useRef(false);
  const animTokenRef = useRef(0);
  const activeEntryRef = useRef("");
  const [ready, setReady] = useState(false);

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

  const showVegfaWithEpitope = async () => {
    if (surfARef.current != null) return;
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

  const playFrames = (model: any, n: number) =>
    new Promise<void>((resolve) => {
      const viewer = glViewerRef.current;
      if (!viewer || !model || cancelRef.current) return resolve();
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
    if (!model || cancelRef.current) return;
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

  const hideAllBinders = () => {
    pdbModelsRef.current.forEach((m) => m?.setStyle({}, {}));
  };

  useEffect(() => {
    const container = viewerRef.current;
    if (!container) return;

    if (!visible) {
      cancelRef.current = true;
      if (glViewerRef.current) {
        try {
          glViewerRef.current.clear();
        } catch {
          /* ignore */
        }
        container.innerHTML = "";
        glViewerRef.current = null;
      }
      modelARef.current = null;
      pdbModelsRef.current = new Map();
      boundRef.current = new Map();
      surfARef.current = null;
      surfBindRef.current = null;
      setReady(false);
      return;
    }

    cancelRef.current = false;
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

    Promise.all([loadText("/3V2A.pdb"), ...SEED_PDBS.map((p) => loadText(p))])
      .then(async ([complexText, ...evalTexts]) => {
        const lines = complexText.split("\n");
        const isAtom = (l: string) =>
          l.startsWith("ATOM") || l.startsWith("HETATM");
        const chainA = lines.filter((l) => isAtom(l) && l[21] === "A").join("\n");
        const chainR = lines.filter((l) => isAtom(l) && l[21] === "R").join("\n");

        const modelA = viewer.addModel(chainA, "pdb");
        const modelR = viewer.addModel(chainR, "pdb");
        modelARef.current = modelA;

        const aAtoms = modelA.selectedAtoms({}) as any[];
        const rAtoms = modelR.selectedAtoms({}) as any[];
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
        for (const a of aAtoms) {
          a.properties = a.properties || {};
          a.properties.epitope = epitope.has(a.resi) ? 1 : 0;
        }

        const cA = centroid(aAtoms);
        const cR = centroid(rAtoms);
        const epiAtoms = aAtoms.filter((a) => epitope.has(a.resi));
        const epiCenter = centroid(epiAtoms.length ? epiAtoms : aAtoms);
        bindDirRef.current = normalize([
          cR[0] - cA[0],
          cR[1] - cA[1],
          cR[2] - cA[2],
        ]);

        modelA.setStyle({}, { cartoon: { color: COLOR_VEGFA_BB } });
        modelR.setStyle({}, {});

        const bindDir = bindDirRef.current;
        const pdbModels = new Map<string, any>();
        const boundCoords = new Map<string, Vec3[]>();

        evalTexts.forEach((evalText, i) => {
          const pdb = SEED_PDBS[i];
          const composed = composeRefTargetWithEvalBinder(
            complexText,
            evalText,
            REF_ROLES,
            EVAL_ROLES,
            "P"
          );
          const binderPdb = extractChain(composed.pdb, "P");
          const model = viewer.addModel(binderPdb, "pdb");
          model.setStyle({}, {});
          const atoms = model.selectedAtoms({}) as any[];
          const c = centroid(atoms);
          const target: Vec3 = [
            epiCenter[0] + bindDir[0] * EPI_STANDOFF,
            epiCenter[1] + bindDir[1] * EPI_STANDOFF,
            epiCenter[2] + bindDir[2] * EPI_STANDOFF,
          ];
          const shift: Vec3 = [target[0] - c[0], target[1] - c[1], target[2] - c[2]];
          const bound = atoms.map(
            (a) => [a.x + shift[0], a.y + shift[1], a.z + shift[2]] as Vec3
          );
          model.setCoordinates([bound] as any, "array");
          pdbModels.set(pdb, model);
          boundCoords.set(pdb, bound);
        });

        pdbModelsRef.current = pdbModels;
        boundRef.current = boundCoords;

        await showVegfaWithEpitope();
        if (cancelRef.current) return;
        viewer.zoomTo({ model: modelA.getID() });
        viewer.zoom(0.52);
        viewer.render();
        viewer.resize();
        setReady(true);
      })
      .catch((error) => {
        console.error("AeProblemaBindViewer:", error);
      });

    return () => {
      cancelRef.current = true;
      viewer.clear();
      container.innerHTML = "";
      glViewerRef.current = null;
    };
  }, [visible]);

  useEffect(() => {
    if (!ready || !visible || !entry) return;
    if (idle) return;

    const entrySig = entry.pdb;
    if (activeEntryRef.current !== entrySig) {
      animTokenRef.current += 1;
      activeEntryRef.current = entrySig;
    }

    const token = animTokenRef.current;
    cancelRef.current = false;

    const model = pdbModelsRef.current.get(entry.pdb);
    const baseBound = boundRef.current.get(entry.pdb);
    const viewer = glViewerRef.current;
    if (!model || !baseBound || !viewer) return;

    const bound = offsetBound(
      baseBound,
      bindDirRef.current,
      entry.latX,
      entry.latY
    );

    const stale = () => animTokenRef.current !== token || cancelRef.current;

    const bindDir = bindDirRef.current;
    const [p1, p2] = perpBasis(bindDir);
    const dir = normalize([
      bindDir[0] + p1[0] * entry.tiltX + p2[0] * entry.tiltY,
      bindDir[1] + p1[1] * entry.tiltX + p2[1] * entry.tiltY,
      bindDir[2] + p1[2] * entry.tiltX + p2[2] * entry.tiltY,
    ]);
    const start = bound.map(
      (p) =>
        [p[0] + dir[0] * CAND_OFFSET, p[1] + dir[1] * CAND_OFFSET, p[2] + dir[2] * CAND_OFFSET] as Vec3
    );

    const run = async () => {
      hideAllBinders();

      if (phase === "pick") {
        removeSurf(surfBindRef);
        model.setStyle({}, {});
        if (stale()) return;
        viewer.render();
        return;
      }

      if (phase === "approach") {
        removeSurf(surfBindRef);
        if (stale()) return;
        model.setStyle({}, { cartoon: { color: entry.color } });
        model.setCoordinates([start] as any, "array");
        viewer.render();
        const frames = entry.binds ? SUCCESS_FRAMES : APPROACH_FRAMES;
        await runPath(model, start, bound, frames);
        if (stale()) return;
        viewer.render();
        return;
      }

      if (phase === "fail") {
        model.setStyle({}, { cartoon: { color: COLOR_FAIL } });
        viewer.render();
        return;
      }

      if (phase === "retreat") {
        await runPath(model, bound, start, RETREAT_FRAMES);
        if (stale()) return;
        model.setStyle({}, {});
        viewer.render();
        return;
      }

      if (phase === "success") {
        model.setStyle({}, { cartoon: { color: COLOR_BINDER } });
        if (stale()) return;
        removeSurf(surfBindRef);
        surfBindRef.current = await addSurf(
          { color: COLOR_BINDER, opacity: 0.9 },
          { model: model.getID() }
        );
        if (stale()) return;
        viewer.render();
      }
    };

    void run();
    return () => {
      /* dejar terminar el frame actual; no invalidar mid-path */
    };
  }, [phase, entry, ready, visible, idle]);

  useEffect(() => {
    if (!ready || !visible || !idle) return;
    removeSurf(surfBindRef);
    hideAllBinders();
    glViewerRef.current?.render();
  }, [idle, ready, visible]);

  return <div className="ae-prob-bind-viewer" ref={viewerRef} aria-hidden={!visible} />;
}
