import { useEffect, useRef, useState } from "react";
import * as $3Dmol from "3dmol";
import {
  chainCA,
  composeRefTargetWithEvalBinder,
  kabsch,
  transformPdb,
  type ChainRoles,
} from "../utils/superpose";

const COLOR_TARGET = "#7fb2e6";
const COLOR_BINDER = "#34d399";
const COLOR_BINDER_STICK = "#10b981";
const COLOR_IF = "#e8590c";

type Repr = "cartoon" | "surface";

/** Modos didácticos para explicar pares de objetivos (slide formulaciones). */
export type MetricMode = "pae_plddt" | "composite_tm" | "ipsae_sc";

type AtomSnap = { atom: any; x: number; y: number; z: number };

function delay(ms: number, cancelled: () => boolean) {
  return new Promise<void>((resolve) => {
    const t0 = performance.now();
    const tick = () => {
      if (cancelled() || performance.now() - t0 >= ms) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function snapshotAtoms(viewer: any, sel: object): AtomSnap[] {
  const atoms = viewer.selectedAtoms(sel) as any[];
  return atoms.map((atom) => ({
    atom,
    x: atom.x as number,
    y: atom.y as number,
    z: atom.z as number,
  }));
}

function restoreAtoms(snap: AtomSnap[]) {
  for (const s of snap) {
    s.atom.x = s.x;
    s.atom.y = s.y;
    s.atom.z = s.z;
  }
}

function offsetAtoms(snap: AtomSnap[], dx: number, dy: number, dz: number) {
  for (const s of snap) {
    s.atom.x = s.x + dx;
    s.atom.y = s.y + dy;
    s.atom.z = s.z + dz;
  }
}

function chainCentroid(viewer: any, chain: string): [number, number, number] {
  const atoms = viewer.selectedAtoms({ chain, atom: "CA" }) as any[];
  if (!atoms.length) {
    const all = viewer.selectedAtoms({ chain }) as any[];
    if (!all.length) return [0, 0, 0];
    let x = 0,
      y = 0,
      z = 0;
    for (const a of all) {
      x += a.x;
      y += a.y;
      z += a.z;
    }
    const n = all.length;
    return [x / n, y / n, z / n];
  }
  let x = 0,
    y = 0,
    z = 0;
  for (const a of atoms) {
    x += a.x;
    y += a.y;
    z += a.z;
  }
  const n = atoms.length;
  return [x / n, y / n, z / n];
}

function normalize3(v: [number, number, number]): [number, number, number] {
  const L = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / L, v[1] / L, v[2] / L];
}

async function clearSurfaces(viewer: any) {
  try {
    viewer.removeAllSurfaces();
  } catch {
    /* ignore */
  }
}

function styleBaseCartoon(
  viewer: any,
  roles: ChainRoles,
  binderSpectrum = false
) {
  const { targetChain, binderChain } = roles;
  viewer.setStyle({}, {});
  viewer.setStyle(
    { chain: targetChain },
    { cartoon: { color: COLOR_TARGET } }
  );
  if (binderChain) {
    viewer.setStyle(
      { chain: binderChain },
      {
        cartoon: {
          color: binderSpectrum ? "spectrum" : COLOR_BINDER,
        },
      }
    );
  }
}

function styleInterfaceSticks(
  viewer: any,
  roles: ChainRoles,
  color = COLOR_IF
) {
  const { targetChain, binderChain } = roles;
  if (!binderChain) return;
  viewer.addStyle(
    {
      chain: binderChain,
      byres: true,
      within: { distance: 5.0, sel: { chain: targetChain } },
    },
    { stick: { radius: 0.2, color } }
  );
  viewer.addStyle(
    {
      chain: targetChain,
      byres: true,
      within: { distance: 5.0, sel: { chain: binderChain } },
    },
    { stick: { radius: 0.14, color } }
  );
}

async function addPairSurfaces(viewer: any, roles: ChainRoles, opacity = 0.9) {
  const { targetChain, binderChain } = roles;
  await clearSurfaces(viewer);
  try {
    await viewer.addSurface(
      $3Dmol.SurfaceType.MS,
      { color: COLOR_TARGET, opacity },
      { chain: targetChain },
      { chain: targetChain }
    );
    if (binderChain) {
      await viewer.addSurface(
        $3Dmol.SurfaceType.MS,
        { color: COLOR_BINDER, opacity },
        { chain: binderChain },
        { chain: binderChain }
      );
    }
  } catch (e) {
    console.warn("addSurface falló:", e);
  }
}

async function animateApproach(
  viewer: any,
  snap: AtomSnap[],
  dir: [number, number, number],
  dist: number,
  frames: number,
  cancelled: () => boolean,
  inward: boolean
) {
  for (let i = 0; i <= frames; i++) {
    if (cancelled()) return;
    const t = i / frames;
    const u = inward ? 1 - t : t;
    const d = dist * u;
    offsetAtoms(snap, dir[0] * d, dir[1] * d, dir[2] * d);
    viewer.render();
    await delay(28, cancelled);
  }
  if (inward) restoreAtoms(snap);
  viewer.render();
}

/**
 * Secuencia didáctica: cada eje hace algo visualmente distinto.
 * onBeat recibe el nombre del eje activo (p. ej. "pLDDT").
 */
async function runMetricAnimation(
  viewer: any,
  mode: MetricMode,
  roles: ChainRoles,
  cancelled: () => boolean,
  onBeat: (beat: string | null) => void
) {
  const { targetChain, binderChain } = roles;
  if (!binderChain) return;

  const binderSnap = snapshotAtoms(viewer, { chain: binderChain });
  const cT = chainCentroid(viewer, targetChain);
  const cB = chainCentroid(viewer, binderChain);
  const dir = normalize3([cB[0] - cT[0], cB[1] - cT[1], cB[2] - cT[2]]);

  const hold = (ms: number) => delay(ms, cancelled);

  while (!cancelled()) {
    await clearSurfaces(viewer);
    restoreAtoms(binderSnap);
    viewer.setStyle({}, {});

    if (mode === "pae_plddt") {
      // Interface-PAE = pose relativa (el péptido se mueve respecto a VEGF-A).
      onBeat("Interface-PAE");
      styleBaseCartoon(viewer, roles, false);
      viewer.zoomTo();
      viewer.zoom(0.9);
      viewer.render();
      await hold(500);
      if (cancelled()) break;
      await animateApproach(viewer, binderSnap, dir, 10, 18, cancelled, false);
      if (cancelled()) break;
      await hold(600);
      if (cancelled()) break;
      await animateApproach(viewer, binderSnap, dir, 10, 18, cancelled, true);
      restoreAtoms(binderSnap);
      styleInterfaceSticks(viewer, roles, COLOR_IF);
      viewer.render();
      await hold(1200);
      if (cancelled()) break;

      // pLDDT = confianza del pliegue (colores), sin mover la pose.
      onBeat("pLDDT");
      restoreAtoms(binderSnap);
      viewer.setStyle({}, {});
      viewer.setStyle(
        { chain: targetChain },
        { cartoon: { color: "spectrum" } }
      );
      viewer.setStyle(
        { chain: binderChain },
        { cartoon: { color: "spectrum" } }
      );
      viewer.zoomTo();
      viewer.zoom(0.9);
      viewer.render();
      await hold(2200);
    } else if (mode === "composite_tm") {
      // Compuesto = solo la zona de contacto.
      onBeat("Compuesto");
      viewer.setStyle(
        { chain: targetChain },
        { cartoon: { color: "#e8eef6" } }
      );
      viewer.setStyle(
        { chain: binderChain },
        { cartoon: { color: "#e8eef6" } }
      );
      styleInterfaceSticks(viewer, roles, COLOR_IF);
      viewer.addStyle(
        {
          chain: binderChain,
          byres: true,
          within: { distance: 5.0, sel: { chain: targetChain } },
        },
        { sphere: { radius: 0.6, color: COLOR_IF } }
      );
      viewer.zoomTo({
        chain: binderChain,
        byres: true,
        within: { distance: 8, sel: { chain: targetChain } },
      });
      viewer.zoom(0.8);
      viewer.render();
      await hold(2000);
      if (cancelled()) break;

      // TM-score = solo el pliegue del péptido (VEGF-A desaparece).
      onBeat("TM-score");
      viewer.setStyle({}, {});
      viewer.setStyle({ chain: targetChain }, {});
      viewer.setStyle(
        { chain: binderChain },
        { cartoon: { color: COLOR_BINDER } }
      );
      viewer.zoomTo({ chain: binderChain });
      viewer.zoom(0.7);
      viewer.render();
      await hold(2000);
    } else {
      // ipSAE = confianza de red en la interfaz (colores + contactos), sin mover.
      onBeat("ipSAE");
      styleBaseCartoon(viewer, roles, true);
      styleInterfaceSticks(viewer, roles, COLOR_BINDER_STICK);
      viewer.zoomTo({
        chain: binderChain,
        byres: true,
        within: { distance: 8, sel: { chain: targetChain } },
      });
      viewer.zoom(0.85);
      viewer.render();
      await hold(2000);
      if (cancelled()) break;

      // SC = encaje de superficies (aleja y vuelve a acoplar).
      onBeat("SC");
      restoreAtoms(binderSnap);
      viewer.setStyle({}, {});
      styleBaseCartoon(viewer, roles, false);
      viewer.zoomTo();
      viewer.zoom(0.9);
      viewer.render();
      await hold(300);
      if (cancelled()) break;
      await animateApproach(viewer, binderSnap, dir, 16, 22, cancelled, false);
      if (cancelled()) break;
      await hold(400);
      if (cancelled()) break;
      await animateApproach(viewer, binderSnap, dir, 16, 22, cancelled, true);
      restoreAtoms(binderSnap);
      viewer.setStyle({}, {});
      await addPairSurfaces(viewer, roles, 0.92);
      viewer.render();
      await hold(1600);
    }

    if (!cancelled()) await hold(350);
  }

  onBeat(null);
}
// Chrome/Electron limitan contextos WebGL. Nunca reclamamos visores que siguen
// claramente en pantalla (evita matar el panel hermano AiD/diseño del mismo slide).
const MAX_LIVE_VIEWERS = 8;
const RECLAIM_MAX_RATIO = 0.12;

type LiveViewerEntry = {
  id: number;
  getRatio: () => number;
  forceDispose: () => void;
};

let nextViewerId = 1;
let liveViewers = 0;
const liveEntries = new Map<number, LiveViewerEntry>();
const viewerWaiters: Array<() => void> = [];

/** Evita createViewer concurrentes: el 2.º contexto a veces nace “muerto”. */
let createViewerChain: Promise<void> = Promise.resolve();

function enqueueCreateViewer<T>(task: () => Promise<T>): Promise<T> {
  const run = createViewerChain.then(task, task);
  createViewerChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function notifyWaiters() {
  while (liveViewers < MAX_LIVE_VIEWERS && viewerWaiters.length > 0) {
    const next = viewerWaiters.shift();
    next?.();
  }
}

function reclaimOffscreenSlots(): number {
  let freed = 0;
  for (const entry of [...liveEntries.values()]) {
    if (entry.getRatio() > RECLAIM_MAX_RATIO) continue;
    entry.forceDispose();
    freed += 1;
  }
  return freed;
}

function acquireViewerSlot(getRatio: () => number): {
  promise: Promise<"acquired" | "cancelled">;
  cancel: () => void;
  register: (forceDispose: () => void) => number;
} {
  let settled = false;
  let waiter: (() => void) | null = null;
  let resolvePromise: ((value: "acquired" | "cancelled") => void) | null =
    null;

  const tryAcquire = () => {
    if (settled) return false;
    if (liveViewers >= MAX_LIVE_VIEWERS) reclaimOffscreenSlots();
    if (liveViewers >= MAX_LIVE_VIEWERS) return false;
    liveViewers += 1;
    settled = true;
    resolvePromise?.("acquired");
    return true;
  };

  const promise = new Promise<"acquired" | "cancelled">((resolve) => {
    resolvePromise = resolve;
    if (tryAcquire()) return;
    waiter = () => {
      if (settled) return;
      if (getRatio() <= 0) {
        viewerWaiters.push(waiter!);
        return;
      }
      if (!tryAcquire()) viewerWaiters.push(waiter!);
    };
    viewerWaiters.push(waiter);
  });

  return {
    promise,
    cancel: () => {
      if (settled) return;
      settled = true;
      if (waiter) {
        const idx = viewerWaiters.indexOf(waiter);
        if (idx >= 0) viewerWaiters.splice(idx, 1);
      }
      resolvePromise?.("cancelled");
    },
    register: (forceDispose) => {
      const entryId = nextViewerId++;
      liveEntries.set(entryId, { id: entryId, getRatio, forceDispose });
      return entryId;
    },
  };
}

function unregisterViewer(entryId: number | null) {
  if (entryId == null) return;
  liveEntries.delete(entryId);
}

function releaseViewerSlot() {
  liveViewers = Math.max(0, liveViewers - 1);
  notifyWaiters();
}

function disposeViewer(viewer: any, container: HTMLDivElement | null) {
  try {
    viewer?.clear?.();
  } catch {
    /* ignore */
  }
  if (container) container.innerHTML = "";
}

function sanitizePdbText(text: string) {
  const lines = text.split(/\r?\n/).filter((line) => {
    const t = line.trimStart();
    return !t.startsWith("MODEL") && !t.startsWith("ENDMDL");
  });
  if (!lines.some((line) => line.trim() === "END")) lines.push("END");
  return `${lines.join("\n")}\n`;
}

function chainIdsFromPdb(pdbText: string) {
  const seen = new Set<string>();
  for (const line of pdbText.split("\n")) {
    if (!line.startsWith("ATOM")) continue;
    const chain = line[21]?.trim();
    if (chain) seen.add(chain);
  }
  return [...seen];
}

function residueCountForChain(pdbText: string, chain: string) {
  const residues = new Set<string>();
  for (const line of pdbText.split("\n")) {
    if (!line.startsWith("ATOM")) continue;
    if (line[21] !== chain) continue;
    residues.add(`${line.substring(22, 26).trim()}${line[26] || ""}`);
  }
  return residues.size;
}

function detectChainRoles(
  pdbText: string,
  refTargetLength: number | null
): ChainRoles {
  const chainIds = chainIdsFromPdb(pdbText);
  if (chainIds.length === 0) {
    return { targetChain: "B", binderChain: "A" };
  }

  const stats = chainIds.map((chain) => {
    const caCount = chainCA(pdbText, chain).length;
    const residueCount = residueCountForChain(pdbText, chain);
    return { chain, caCount, residueCount };
  });

  const target = [...stats].sort((a, b) => {
    if (refTargetLength != null) {
      const da = Math.abs(a.caCount - refTargetLength);
      const db = Math.abs(b.caCount - refTargetLength);
      if (da !== db) return da - db;
    }
    if (a.caCount !== b.caCount) return b.caCount - a.caCount;
    return b.residueCount - a.residueCount;
  })[0];

  const binder = [...stats]
    .filter((item) => item.chain !== target.chain)
    .sort((a, b) => {
      if (a.caCount !== b.caCount) return a.caCount - b.caCount;
      return a.residueCount - b.residueCount;
    })[0];

  return {
    targetChain: target.chain,
    binderChain: binder?.chain ?? null,
  };
}

async function applyRepr(viewer: any, repr: Repr, roles: ChainRoles) {
  const { targetChain, binderChain } = roles;
  viewer.removeAllSurfaces();
  if (repr === "surface") {
    viewer.setStyle({ chain: targetChain }, {});
    if (binderChain) viewer.setStyle({ chain: binderChain }, {});
    viewer.render();
    try {
      await viewer.addSurface(
        $3Dmol.SurfaceType.MS,
        { color: COLOR_TARGET, opacity: 1 },
        { chain: targetChain },
        { chain: targetChain }
      );
      if (binderChain) {
        await viewer.addSurface(
          $3Dmol.SurfaceType.MS,
          { color: COLOR_BINDER, opacity: 1 },
          { chain: binderChain },
          { chain: binderChain }
        );
      }
    } catch (e) {
      console.warn("addSurface falló:", e);
    }
  } else {
    viewer.setStyle(
      { chain: targetChain },
      { cartoon: { color: COLOR_TARGET } }
    );
    if (binderChain) {
      viewer.setStyle(
        { chain: binderChain },
        {
          cartoon: { color: COLOR_BINDER },
          stick: { radius: 0.18, color: COLOR_BINDER_STICK },
        }
      );
    }
  }
  viewer.render();
}

export function ComplexViewer({
  pdbUrl,
  referenceUrl = null,
  fixTargetFromReference = false,
  active,
  metricMode = null,
  onMetricBeat,
}: {
  pdbUrl: string | null;
  referenceUrl?: string | null;
  fixTargetFromReference?: boolean;
  /** Si se define, fuerza el montaje del visor (p. ej. pareja AiD/diseño). */
  active?: boolean;
  /** Si se define, anima estilos didácticos y oculta el toggle cartoon/superficie. */
  metricMode?: MetricMode | null;
  /** Nombre del eje que la animación está ilustrando (p. ej. "pLDDT"). */
  onMetricBeat?: (beat: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);
  const tokenRef = useRef(0);
  const refCARef = useRef<number[][] | null>(null);
  const refPdbTextRef = useRef<string | null>(null);
  const refRolesRef = useRef<ChainRoles>({
    targetChain: "B",
    binderChain: "A",
  });
  const chainRolesRef = useRef<ChainRoles>({
    targetChain: "B",
    binderChain: "A",
  });
  const cameraSetRef = useRef(false);
  const [inView, setInView] = useState(false);
  // active=true/false fuerza el estado; undefined → IntersectionObserver propio.
  const isVisible = active !== undefined ? active : inView;
  const [viewerEpoch, setViewerEpoch] = useState(0);
  const [slotGen, setSlotGen] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refReady, setRefReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repr, setRepr] = useState<Repr>("cartoon");
  const reprRef = useRef<Repr>(repr);
  reprRef.current = repr;
  const metricModeRef = useRef(metricMode);
  metricModeRef.current = metricMode;
  const onBeatRef = useRef(onMetricBeat);
  onBeatRef.current = onMetricBeat;

  const isVisibleRef = useRef(false);
  isVisibleRef.current = isVisible;
  const ratioRef = useRef(0);
  const entryIdRef = useRef<number | null>(null);
  const slotHeldRef = useRef(false);

  const tearDownViewer = () => {
    unregisterViewer(entryIdRef.current);
    entryIdRef.current = null;
    if (viewerRef.current) {
      disposeViewer(viewerRef.current, containerRef.current);
      viewerRef.current = null;
    }
    if (slotHeldRef.current) {
      releaseViewerSlot();
      slotHeldRef.current = false;
    }
    cameraSetRef.current = false;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const ratio = entry.isIntersecting ? entry.intersectionRatio : 0;
        // Con active forzado (pareja de visores), reportamos ratio alto para
        // no ser reclamados como “fuera de pantalla”.
        ratioRef.current = active ? Math.max(ratio, 0.85) : ratio;
        setInView(entry.isIntersecting && entry.intersectionRatio > 0);
      },
      { threshold: [0, 0.05, 0.15, 0.35, 0.55, 0.75, 1], rootMargin: "0px" }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [active]);

  useEffect(() => {
    if (active) {
      ratioRef.current = Math.max(ratioRef.current, 0.85);
    }
  }, [active]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!isVisible) {
      tearDownViewer();
      refCARef.current = null;
      refPdbTextRef.current = null;
      setLoading(false);
      setError(null);
      return;
    }

    if (viewerRef.current) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const slot = acquireViewerSlot(() => ratioRef.current);
    (async () => {
      const result = await slot.promise;
      if (result !== "acquired") return;
      slotHeldRef.current = true;
      if (cancelled || !isVisibleRef.current) {
        releaseViewerSlot();
        slotHeldRef.current = false;
        return;
      }
      const host = containerRef.current;
      if (!host || viewerRef.current) {
        releaseViewerSlot();
        slotHeldRef.current = false;
        return;
      }

      // Esperar layout con tamaño real antes de createViewer (0×0 = canvas vacío).
      for (let i = 0; i < 10; i++) {
        if (cancelled) break;
        const { width, height } = host.getBoundingClientRect();
        if (width >= 32 && height >= 32) break;
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      }
      if (cancelled || !isVisibleRef.current) {
        releaseViewerSlot();
        slotHeldRef.current = false;
        return;
      }

      entryIdRef.current = slot.register(() => {
        unregisterViewer(entryIdRef.current);
        entryIdRef.current = null;
        if (viewerRef.current) {
          disposeViewer(viewerRef.current, containerRef.current);
          viewerRef.current = null;
        }
        if (slotHeldRef.current) {
          releaseViewerSlot();
          slotHeldRef.current = false;
        }
        cameraSetRef.current = false;
        if (isVisibleRef.current) {
          queueMicrotask(() => setSlotGen((n) => n + 1));
        }
      });

      const bg =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--viewer-bg")
          .trim() || "#f4f7fc";

      const tryCreate = async () => {
        reclaimOffscreenSlots();
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        const v = $3Dmol.createViewer(host, {
          backgroundColor: bg,
          backgroundAlpha: 0,
        });
        const canvas = host.querySelector("canvas") as HTMLCanvasElement | null;
        if (!canvas) {
          disposeViewer(v, host);
          return null;
        }
        v.setBackgroundColor(bg, 0);
        try {
          v.resize();
        } catch {
          /* ignore */
        }
        // Un frame de render vacío para validar que el contexto WebGL responde.
        try {
          v.render();
        } catch {
          disposeViewer(v, host);
          return null;
        }
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        return v;
      };

      const viewer = await enqueueCreateViewer(async () => {
        let v = await tryCreate();
        if (!v) {
          await new Promise((r) => setTimeout(r, 80));
          if (!cancelled && isVisibleRef.current) v = await tryCreate();
        }
        return v;
      });

      if (!viewer) {
        tearDownViewer();
        if (!cancelled) {
          setLoading(false);
          setError("No se pudo inicializar el visor 3D (límite WebGL)");
        }
        return;
      }

      viewerRef.current = viewer;
      if (!cancelled) setViewerEpoch((n) => n + 1);
    })();

    const onResize = () => {
      const viewer = viewerRef.current;
      if (!viewer || !container.isConnected) return;
      try {
        viewer.resize();
        if (cameraSetRef.current) {
          viewer.zoomTo();
          viewer.zoom(0.9);
          viewer.render();
        }
      } catch {
        /* ignore */
      }
    };
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(onResize);
    });
    ro.observe(container);

    return () => {
      cancelled = true;
      ro.disconnect();
      slot.cancel();
      tearDownViewer();
    };
  }, [isVisible, slotGen]);

  useEffect(() => {
    if (!isVisible) return;
    if (!referenceUrl) {
      setRefReady(true);
      return;
    }
    let cancelled = false;
    setRefReady(false);
    fetch(referenceUrl)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((raw) => {
        if (cancelled) return;
        const text = sanitizePdbText(raw);
        const roles = detectChainRoles(text, null);
        const ca = chainCA(text, roles.targetChain);
        refRolesRef.current = roles;
        refPdbTextRef.current = text;
        chainRolesRef.current = roles;
        if (ca.length >= 3) refCARef.current = ca;
        setRefReady(true);
      })
      .catch(() => {
        if (!cancelled) setRefReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isVisible, referenceUrl]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!isVisible || !viewer || !refReady) return;
    if (!pdbUrl) {
      viewer.removeAllModels();
      viewer.render();
      setError(null);
      return;
    }
    const token = ++tokenRef.current;
    setLoading(true);
    setError(null);
    fetch(pdbUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`No se pudo cargar ${pdbUrl}`);
        return r.text();
      })
      .then((raw) => {
        if (token !== tokenRef.current) return;
        const trimmed = raw.trimStart().toLowerCase();
        if (trimmed.startsWith("<!doctype") || trimmed.startsWith("<html")) {
          throw new Error(`Se recibió HTML en lugar del PDB (${pdbUrl})`);
        }
        const text = sanitizePdbText(raw);

        let modelText = text;
        let roles = detectChainRoles(text, refCARef.current?.length ?? null);

        if (
          fixTargetFromReference &&
          refPdbTextRef.current &&
          roles.binderChain
        ) {
          const composed = composeRefTargetWithEvalBinder(
            refPdbTextRef.current,
            text,
            refRolesRef.current,
            roles
          );
          modelText = composed.pdb;
          roles = composed.roles;
        } else {
          const ca = chainCA(text, roles.targetChain);
          if (refCARef.current == null) {
            refCARef.current = ca;
          } else if (ca.length === refCARef.current.length && ca.length >= 3) {
            const { R, t } = kabsch(ca, refCARef.current);
            modelText = transformPdb(text, R, t);
          }
        }

        chainRolesRef.current = roles;

        viewer.removeAllModels();
        viewer.removeAllSurfaces();
        viewer.addModel(modelText, "pdb");
        viewer.zoomTo({ chain: roles.targetChain });
        viewer.zoomTo();
        viewer.zoom(0.9);
        cameraSetRef.current = true;
        if (!metricModeRef.current) {
          applyRepr(viewer, reprRef.current, roles);
        } else {
          styleBaseCartoon(viewer, roles, false);
          viewer.render();
        }
        viewer.resize();
        setLoading(false);
      })
      .catch((err) => {
        if (token === tokenRef.current) {
          setLoading(false);
          setError(
            err instanceof Error ? err.message : "Error al cargar el complejo"
          );
        }
      });
  }, [isVisible, pdbUrl, refReady, fixTargetFromReference, viewerEpoch]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !viewerEpoch) return;
    if (metricMode) return; // la animación se encarga
    applyRepr(viewer, repr, chainRolesRef.current);
  }, [repr, metricMode, viewerEpoch]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !viewerEpoch || !metricMode) {
      onBeatRef.current?.(null);
      return;
    }

    let cancelled = false;
    const isCancelled = () => cancelled || !viewerRef.current;

    (async () => {
      // Esperar un frame para que el modelo esté estable.
      await delay(80, isCancelled);
      if (isCancelled()) return;
      await runMetricAnimation(
        viewer,
        metricMode,
        chainRolesRef.current,
        isCancelled,
        (beat) => onBeatRef.current?.(beat)
      );
    })();

    return () => {
      cancelled = true;
      onBeatRef.current?.(null);
    };
  }, [metricMode, viewerEpoch, pdbUrl]);

  return (
    <div className="cv-stage">
      <div className="cv-viewer" ref={containerRef} />
      {!metricMode && (
        <button
          type="button"
          className="cv-toggle"
          onClick={() =>
            setRepr((r) => (r === "cartoon" ? "surface" : "cartoon"))
          }
          title="Cambiar representación"
        >
          {repr === "cartoon" ? "Superficie" : "Cartoon"}
        </button>
      )}
      {loading && <span className="cv-loading">cargando…</span>}
      {error && <span className="cv-loading">{error}</span>}
    </div>
  );
}
