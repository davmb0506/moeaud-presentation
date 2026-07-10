import { useEffect, useRef, useState } from "react";
import * as $3Dmol from "3dmol";
import { chainCA, composeRefTargetWithEvalBinder, kabsch, transformPdb, type ChainRoles } from "../utils/superpose";

const COLOR_TARGET = "#7fb2e6"; // VEGF-A
const COLOR_BINDER = "#34d399"; // binder diseñado
const COLOR_BINDER_STICK = "#10b981";

type Repr = "cartoon" | "surface";

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

function detectChainRoles(pdbText: string, refTargetLength: number | null): ChainRoles {
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

// Aplica la representación actual al modelo cargado. El binder detectado se
// muestra siempre en cartoon+stick; VEGF-A como cartoon o superficie.
// Aplica la representación actual. En "surface" se genera la superficie
// molecular (lisa) de ambas cadenas con su color; en "cartoon", listones.
// La superficie se calcula con selección por cadena (sin id de modelo) para
// evitar el bug de getAtomsFromSel con modelos obsoletos.
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
    viewer.setStyle({ chain: targetChain }, { cartoon: { color: COLOR_TARGET } });
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

// Visor de un complejo binder–VEGF-A. Carga el PDB indicado bajo demanda
// (al cambiar pdbUrl) reutilizando el mismo contexto WebGL. Cada complejo se
// superpone sobre VEGF-A para que el objetivo quede fijo entre estructuras y
// solo varíe la pose del binder. La orientación de referencia se fija con
// referenceUrl (estructura canónica), independiente del orden de hover.
export function ComplexViewer({
  pdbUrl,
  referenceUrl = null,
  fixTargetFromReference = false,
}: {
  pdbUrl: string | null;
  referenceUrl?: string | null;
  fixTargetFromReference?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);
  const tokenRef = useRef(0);
  const refCARef = useRef<number[][] | null>(null); // Cα de VEGF-A de referencia
  const refPdbTextRef = useRef<string | null>(null);
  const refRolesRef = useRef<ChainRoles>({ targetChain: "B", binderChain: "A" });
  const chainRolesRef = useRef<ChainRoles>({ targetChain: "B", binderChain: "A" });
  const cameraSetRef = useRef(false);
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refReady, setRefReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repr, setRepr] = useState<Repr>("cartoon");
  const reprRef = useRef<Repr>(repr);
  reprRef.current = repr;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.05, rootMargin: "240px 0px" }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isVisible || viewerRef.current) return;
    const bg =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--viewer-bg")
        .trim() || "#f4f7fc";
    const viewer = $3Dmol.createViewer(container, {
      backgroundColor: bg,
      backgroundAlpha: 0,
    });
    viewer.setBackgroundColor(bg, 0);
    viewerRef.current = viewer;
    return () => {
      if (!isVisible) return;
      viewer.clear();
      container.innerHTML = "";
      viewerRef.current = null;
    };
  }, [isVisible]);

  useEffect(() => {
    if (isVisible) return;
    const viewer = viewerRef.current;
    const container = containerRef.current;
    if (viewer) viewer.clear();
    if (container) container.innerHTML = "";
    viewerRef.current = null;
    cameraSetRef.current = false;
    refCARef.current = null;
    refPdbTextRef.current = null;
    setLoading(false);
  }, [isVisible]);

  // Fija el marco de referencia (Cα de VEGF-A) desde una estructura canónica.
  useEffect(() => {
    if (!isVisible) return;
    if (!referenceUrl) {
      setRefReady(true); // sin referencia: la primera estructura define el marco
      return;
    }
    let cancelled = false;
    setRefReady(false);
    fetch(referenceUrl)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((text) => {
        if (cancelled) return;
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
      .then((text) => {
        if (token !== tokenRef.current) return; // hover más reciente

        // Superponer sobre VEGF-A: la primera estructura fija la referencia;
        // las siguientes se alinean a ella por los Cα de la cadena objetivo.
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
            roles,
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
        // La cámara se fija una sola vez; al estar todo superpuesto sobre el
        // objetivo, VEGF-A permanece en la misma orientación entre puntos.
        if (!cameraSetRef.current) {
          viewer.zoomTo({ chain: roles.targetChain });
          viewer.zoomTo();
          viewer.zoom(0.9);
          cameraSetRef.current = true;
        }
        applyRepr(viewer, reprRef.current, roles);
        viewer.resize();
        setLoading(false);
      })
      .catch((err) => {
        if (token === tokenRef.current) {
          setLoading(false);
          setError(err instanceof Error ? err.message : "Error al cargar el complejo");
        }
      });
  }, [isVisible, pdbUrl, refReady, fixTargetFromReference]);

  // Re-aplica la representación al alternar cartoon/superficie (sin recargar).
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    applyRepr(viewer, repr, chainRolesRef.current);
  }, [repr]);

  return (
    <div className="cv-stage">
      <div className="cv-viewer" ref={containerRef} />
      <button
        type="button"
        className="cv-toggle"
        onClick={() => setRepr((r) => (r === "cartoon" ? "surface" : "cartoon"))}
        title="Cambiar representación"
      >
        {repr === "cartoon" ? "Superficie" : "Cartoon"}
      </button>
      {loading && <span className="cv-loading">cargando…</span>}
      {error && <span className="cv-loading">{error}</span>}
    </div>
  );
}
