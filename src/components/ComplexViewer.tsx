import { useEffect, useRef, useState } from "react";
import * as $3Dmol from "3dmol";
import { chainCA, kabsch, transformPdb } from "../utils/superpose";

const COLOR_TARGET = "#7fb2e6"; // VEGF-A (cadena B)
const COLOR_BINDER = "#34d399"; // binder diseñado (cadena A)
const COLOR_BINDER_STICK = "#10b981";
const TARGET_CHAIN = "B"; // VEGF-A (objetivo fijo)

type Repr = "cartoon" | "surface";

// Aplica la representación actual al modelo cargado. El binder (cadena A) se
// muestra siempre en cartoon+stick; VEGF-A (cadena B) como cartoon o superficie.
// Aplica la representación actual. En "surface" se genera la superficie
// molecular (lisa) de ambas cadenas con su color; en "cartoon", listones.
// La superficie se calcula con selección por cadena (sin id de modelo) para
// evitar el bug de getAtomsFromSel con modelos obsoletos.
async function applyRepr(viewer: any, repr: Repr) {
  viewer.removeAllSurfaces();
  if (repr === "surface") {
    viewer.setStyle({ chain: TARGET_CHAIN }, {});
    viewer.setStyle({ chain: "A" }, {});
    viewer.render();
    try {
      await viewer.addSurface(
        $3Dmol.SurfaceType.MS,
        { color: COLOR_TARGET, opacity: 1 },
        { chain: TARGET_CHAIN },
        { chain: TARGET_CHAIN }
      );
      await viewer.addSurface(
        $3Dmol.SurfaceType.MS,
        { color: COLOR_BINDER, opacity: 1 },
        { chain: "A" },
        { chain: "A" }
      );
    } catch (e) {
      console.warn("addSurface falló:", e);
    }
  } else {
    viewer.setStyle({ chain: TARGET_CHAIN }, { cartoon: { color: COLOR_TARGET } });
    viewer.setStyle(
      { chain: "A" },
      {
        cartoon: { color: COLOR_BINDER },
        stick: { radius: 0.18, color: COLOR_BINDER_STICK },
      }
    );
  }
  viewer.render();
}

// Visor de un complejo binder–VEGF-A. Carga el PDB indicado bajo demanda
// (al cambiar pdbUrl) reutilizando el mismo contexto WebGL. Cada complejo se
// superpone sobre VEGF-A (cadena B) para que el objetivo quede fijo entre
// estructuras y solo varíe la pose del binder. La orientación de referencia se
// fija con referenceUrl (estructura canónica), independiente del orden de hover.
export function ComplexViewer({
  pdbUrl,
  referenceUrl = null,
}: {
  pdbUrl: string | null;
  referenceUrl?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);
  const tokenRef = useRef(0);
  const refCARef = useRef<number[][] | null>(null); // Cα de VEGF-A de referencia
  const cameraSetRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [refReady, setRefReady] = useState(false);
  const [repr, setRepr] = useState<Repr>("cartoon");
  const reprRef = useRef<Repr>(repr);
  reprRef.current = repr;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
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
      viewer.clear();
      if (container) container.innerHTML = "";
      viewerRef.current = null;
    };
  }, []);

  // Fija el marco de referencia (Cα de VEGF-A) desde una estructura canónica.
  useEffect(() => {
    if (!referenceUrl) {
      setRefReady(true); // sin referencia: la primera estructura define el marco
      return;
    }
    let cancelled = false;
    fetch(referenceUrl)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((text) => {
        if (cancelled) return;
        const ca = chainCA(text, TARGET_CHAIN);
        if (ca.length >= 3) refCARef.current = ca;
        setRefReady(true);
      })
      .catch(() => {
        if (!cancelled) setRefReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [referenceUrl]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !refReady) return;
    if (!pdbUrl) {
      viewer.removeAllModels();
      viewer.render();
      return;
    }
    const token = ++tokenRef.current;
    setLoading(true);
    fetch(pdbUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`No se pudo cargar ${pdbUrl}`);
        return r.text();
      })
      .then((text) => {
        if (token !== tokenRef.current) return; // hover más reciente

        // Superponer sobre VEGF-A: la primera estructura fija la referencia;
        // las siguientes se alinean a ella por los Cα de la cadena B.
        let modelText = text;
        const ca = chainCA(text, TARGET_CHAIN);
        if (refCARef.current == null) {
          refCARef.current = ca;
        } else if (ca.length === refCARef.current.length && ca.length >= 3) {
          const { R, t } = kabsch(ca, refCARef.current);
          modelText = transformPdb(text, R, t);
        }

        viewer.removeAllModels();
        viewer.removeAllSurfaces();
        viewer.addModel(modelText, "pdb");
        // La cámara se fija una sola vez; al estar todo superpuesto sobre el
        // objetivo, VEGF-A permanece en la misma orientación entre puntos.
        if (!cameraSetRef.current) {
          viewer.zoomTo({ chain: TARGET_CHAIN });
          viewer.zoom(0.9);
          cameraSetRef.current = true;
        }
        applyRepr(viewer, reprRef.current);
        viewer.resize();
        setLoading(false);
      })
      .catch(() => {
        if (token === tokenRef.current) setLoading(false);
      });
  }, [pdbUrl, refReady]);

  // Re-aplica la representación al alternar cartoon/superficie (sin recargar).
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    applyRepr(viewer, repr);
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
    </div>
  );
}
