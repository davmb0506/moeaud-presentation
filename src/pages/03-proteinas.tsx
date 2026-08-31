import { useEffect, useRef, type MutableRefObject } from "react";
import {
  motion,
  type Variants,
  useInView,
  useReducedMotion,
} from "framer-motion";
import * as THREE from "three";
import * as $3Dmol from "3dmol";
import { UBIQUITIN_CA, UBIQUITIN_SEQUENCE } from "../data/ubiquitinCa";
import { aaColor } from "../data/aminoAcidColors";
import {
  foldPoseAt,
  measureInternals,
} from "../lib/caInternalFold";
import { EnergyLandscapeJourney } from "../components/EnergyLandscapeJourney";

const fade: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

function smootherstep(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function residueColor(i: number): THREE.Color {
  return new THREE.Color(aaColor(UBIQUITIN_SEQUENCE[i] ?? "X"));
}

function makeNcSprite(text: string): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 128, 64);
  ctx.font = "700 36px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "rgba(51, 65, 85, 0.92)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 64, 32);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
  });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(7, 3.5, 1);
  return spr;
}

function placeSegment(
  mesh: THREE.Mesh,
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
  yAxis: THREE.Vector3,
  dir: THREE.Vector3,
) {
  dir.subVectors(b, a);
  const len = dir.length();
  if (len < 1e-6) {
    mesh.visible = false;
    return;
  }
  mesh.visible = true;
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.scale.set(radius, len, radius);
  mesh.quaternion.setFromUnitVectors(yAxis, dir.normalize());
}

/** Eje principal (PCA) de un conjunto de puntos. */
function principalAxis(pts: THREE.Vector3[]): THREE.Vector3 {
  const c = new THREE.Vector3();
  for (const p of pts) c.add(p);
  c.multiplyScalar(1 / pts.length);
  let cxx = 0;
  let cxy = 0;
  let cxz = 0;
  let cyy = 0;
  let cyz = 0;
  let czz = 0;
  for (const p of pts) {
    const x = p.x - c.x;
    const y = p.y - c.y;
    const z = p.z - c.z;
    cxx += x * x;
    cxy += x * y;
    cxz += x * z;
    cyy += y * y;
    cyz += y * z;
    czz += z * z;
  }
  const v = new THREE.Vector3(1, 0.15, 0.07);
  for (let i = 0; i < 24; i += 1) {
    v.set(
      cxx * v.x + cxy * v.y + cxz * v.z,
      cxy * v.x + cyy * v.y + cyz * v.z,
      cxz * v.x + cyz * v.y + czz * v.z,
    ).normalize();
  }
  if (v.dot(tmpSub(pts[pts.length - 1], pts[0])) < 0) v.negate();
  return v;
}

function tmpSub(a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3().subVectors(a, b);
}

/**
 * Orienta la cadena desplegada de canto: eje largo → X, plano del arco → XZ
 * (vista lateral horizontal desde +Z).
 */
function lateralQuaternion(unfolded: THREE.Vector3[]): THREE.Quaternion {
  const xTarget = new THREE.Vector3(1, 0, 0);
  const zTarget = new THREE.Vector3(0, 0, 1);
  const a1 = principalAxis(unfolded);
  const q1 = new THREE.Quaternion().setFromUnitVectors(a1, xTarget);

  const c = new THREE.Vector3();
  for (const p of unfolded) c.add(p);
  c.multiplyScalar(1 / unfolded.length);

  // Segundo eje: dirección media de las desviaciones ortogonales a a1.
  const ortho = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  for (const p of unfolded) {
    tmp.copy(p).sub(c);
    tmp.addScaledVector(a1, -tmp.dot(a1));
    if (tmp.lengthSq() > 1e-6) ortho.add(tmp.normalize());
  }
  if (ortho.lengthSq() < 1e-8) ortho.set(0, 1, 0);
  else ortho.normalize();
  ortho.applyQuaternion(q1);
  // Tras q1, a1≈X; alineamos el segundo eje a Z (plano XZ).
  ortho.x = 0;
  if (ortho.lengthSq() < 1e-8) ortho.set(0, 0, 1);
  else ortho.normalize();
  const q2 = new THREE.Quaternion().setFromUnitVectors(ortho, zTarget);
  return q2.multiply(q1);
}

function FoldingAnimation({
  progressRef,
}: {
  progressRef: MutableRefObject<number>;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const nativeRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(hostRef, { amount: 0.2 });
  const inViewRef = useRef(inView);
  inViewRef.current = inView;
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    const host = hostRef.current;
    const frame = frameRef.current;
    const nativeEl = nativeRef.current;
    if (!host || !frame || !nativeEl) return;

    const n = UBIQUITIN_CA.length;
    const native = UBIQUITIN_CA.map(
      ([x, y, z]) => new THREE.Vector3(x, y, z),
    );
    const internals = measureInternals(native);
    const nativeCenter = new THREE.Vector3();
    for (const p of native) nativeCenter.add(p);
    nativeCenter.multiplyScalar(1 / n);
    const yAxis = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3();
    const tmp = new THREE.Vector3();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 800);
    const camDir = new THREE.Vector3(18, 10, 78).normalize();
    camera.position.copy(camDir).multiplyScalar(120);
    camera.lookAt(0, 0, 0);

    // Radios de encuadre: desplegada (lejos) → nativa (cerca).
    const unfoldedProbe = native.map((p) => p.clone());
    foldPoseAt(0, native, internals, unfoldedProbe, nativeCenter);
    const qLay = lateralQuaternion(unfoldedProbe);
    let radiusUnfold = 0;
    let radiusNative = 0;
    const laid = new THREE.Vector3();
    for (const p of unfoldedProbe) {
      laid.copy(p).applyQuaternion(qLay);
      radiusUnfold = Math.max(radiusUnfold, laid.length());
    }
    for (const p of native) {
      laid.copy(p).applyQuaternion(qLay);
      radiusNative = Math.max(radiusNative, laid.length());
    }
    radiusUnfold += 4;
    radiusNative += 4;

    const fitDistance = (radius: number) => {
      const vFov = THREE.MathUtils.degToRad(camera.fov);
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
      const byV = radius / Math.sin(vFov / 2);
      const byH = radius / Math.sin(hFov / 2);
      return Math.max(byV, byH) * 1.12;
    };

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = "proteinas-fold-canvas";
    frame.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.72));
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(22, 32, 28);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xdbeafe, 0.4);
    fill.position.set(-24, 10, 12);
    scene.add(fill);

    const mol = new THREE.Group();
    scene.add(mol);

    const ballGeo = new THREE.SphereGeometry(1, 20, 16);
    const linkGeo = new THREE.CylinderGeometry(1, 1, 1, 10);
    const balls: THREE.Mesh[] = [];
    const links: THREE.Mesh[] = [];
    const stickMats: THREE.MeshStandardMaterial[] = [];

    for (let i = 0; i < n; i += 1) {
      const mat = new THREE.MeshStandardMaterial({
        color: residueColor(i),
        roughness: 0.42,
        metalness: 0.08,
        transparent: true,
        depthWrite: true,
      });
      const ball = new THREE.Mesh(ballGeo, mat);
      ball.scale.setScalar(1.35);
      mol.add(ball);
      balls.push(ball);
      if (i < n - 1) {
        const linkMat = new THREE.MeshStandardMaterial({
          color: residueColor(i).clone().lerp(residueColor(i + 1), 0.5),
          roughness: 0.55,
          metalness: 0.05,
          transparent: true,
          depthWrite: true,
        });
        stickMats.push(linkMat);
        const link = new THREE.Mesh(linkGeo, linkMat);
        mol.add(link);
        links.push(link);
      }
    }

    const labelN = makeNcSprite("N");
    const labelC = makeNcSprite("C");
    mol.add(labelN, labelC);

    // Vista nativa real (PDB 1UBQ): cartoon + superficie MS vía 3dmol.
    // Misma orientación que bolas/palos: quaternion = qAlign * Ry(yaw).
    const viewer = $3Dmol.createViewer(nativeEl, {
      backgroundColor: "#f4f7fb",
      antialias: true,
      disableMouse: true,
    });
    let nativeReady = false;
    let cancelled = false;
    let baseView: number[] | null = null;
    const yawRate = 0.009; // rad/s (antes 0.028; más lento al plegar)
    const qAlign = new THREE.Quaternion();
    {
      const alignCam = new THREE.PerspectiveCamera(34, 1, 0.1, 800);
      alignCam.position.copy(camDir);
      alignCam.up.set(0, 1, 0);
      alignCam.lookAt(0, 0, 0);
      alignCam.updateMatrixWorld(true);
      qAlign.setFromRotationMatrix(alignCam.matrixWorldInverse);
    }
    const qYaw = new THREE.Quaternion();
    const qView = new THREE.Quaternion();
    const yUp = new THREE.Vector3(0, 1, 0);

    const syncNativeView = (yaw: number) => {
      if (!nativeReady || !baseView) return;
      qYaw.setFromAxisAngle(yUp, yaw);
      // Misma base lateral que bolas/palos: Rcam · Ry · Rlay
      qView.copy(qAlign).multiply(qYaw).multiply(qLay);
      viewer.setView(
        [
          baseView[0],
          baseView[1],
          baseView[2],
          baseView[3],
          qView.x,
          qView.y,
          qView.z,
          qView.w,
        ],
        true,
      );
    };

    fetch("/1UBQ.pdb")
      .then((r) => {
        if (!r.ok) throw new Error(`1UBQ.pdb HTTP ${r.status}`);
        return r.text();
      })
      .then(async (pdbText) => {
        if (cancelled) return;
        viewer.addModel(pdbText, "pdb");
        for (let i = 0; i < UBIQUITIN_SEQUENCE.length; i += 1) {
          viewer.setStyle(
            { resi: i + 1 },
            {
              cartoon: {
                color: aaColor(UBIQUITIN_SEQUENCE[i]),
                arrows: true,
                thickness: 0.3,
                width: 0.6,
              },
            },
          );
        }
        if (typeof (viewer as any).setCartoonQuality === "function") {
          (viewer as any).setCartoonQuality(6);
        }
        viewer.zoomTo();
        viewer.zoom(1.08);
        viewer.render();
        try {
          await viewer.addSurface(
            ($3Dmol as any).SurfaceType.MS,
            { color: "#c5d4e3", opacity: 0.78 },
          );
        } catch (e) {
          console.warn("Superficie 1UBQ no disponible:", e);
        }
        if (cancelled) return;
        // Re-encuadrar tras la superficie y fijar la vista base (sin rotación).
        viewer.zoomTo();
        viewer.zoom(1.08);
        const v = viewer.getView() as number[];
        baseView = [v[0], v[1], v[2], v[3], 0, 0, 0, 1];
        viewer.setView(baseView, true);
        nativeReady = true;
        syncNativeView(prefersReduced ? 0.15 : 0);
      })
      .catch((e) => console.warn("No se pudo cargar 1UBQ.pdb:", e));

    const pose = native.map((p) => p.clone());
    let raf = 0;
    let lastNow = performance.now();
    let elapsed = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      const r = frame.getBoundingClientRect();
      w = Math.max(1, Math.floor(r.width));
      h = Math.max(1, Math.floor(r.height));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      viewer.resize();
      if (nativeReady) viewer.render();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(frame);

    /** Plegado en bucle: pausa en nativa (superficie) antes de reiniciar. */
    const FOLD_SECS = 14;
    const HOLD_SECS = 8;
    const foldProgress = (tSec: number) => {
      const cycle = FOLD_SECS + HOLD_SECS;
      const t = tSec % cycle;
      if (t >= FOLD_SECS) return 1;
      return t / FOLD_SECS;
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - lastNow) / 1000);
      lastNow = now;

      if (!inViewRef.current) {
        renderer.render(scene, camera);
        return;
      }

      elapsed += dt;
      const progress = prefersReduced ? 1 : foldProgress(elapsed);
      progressRef.current = progress;

      foldPoseAt(progress, native, internals, pose, nativeCenter);

      // Crossfade bolas/palos (Three) → cartoon+superficie real (3dmol).
      const nativeAmt = smootherstep((progress - 0.84) / 0.16);
      const stickAmt = 1 - nativeAmt;
      renderer.domElement.style.opacity = String(stickAmt);
      nativeEl.style.opacity = String(nativeReady ? nativeAmt : 0);
      nativeEl.style.pointerEvents = "none";

      for (let i = 0; i < n; i += 1) {
        const bm = balls[i].material as THREE.MeshStandardMaterial;
        bm.opacity = stickAmt;
        bm.depthWrite = stickAmt > 0.5;
        balls[i].visible = stickAmt > 0.02;
        balls[i].position.copy(pose[i]);
        if (i < n - 1) {
          stickMats[i].opacity = stickAmt;
          stickMats[i].depthWrite = stickAmt > 0.5;
          links[i].visible = stickAmt > 0.02;
          if (stickAmt > 0.02) {
            placeSegment(links[i], pose[i], pose[i + 1], 0.42, yAxis, dir);
          }
        }
      }
      labelN.visible = stickAmt > 0.25;
      labelC.visible = stickAmt > 0.25;
      labelN.material.opacity = stickAmt;
      labelC.material.opacity = stickAmt;
      if (stickAmt > 0.02) {
        tmp.copy(pose[0]).sub(pose[1]).normalize().multiplyScalar(2.8);
        labelN.position.copy(pose[0]).add(tmp);
        tmp.copy(pose[n - 1]).sub(pose[n - 2]).normalize().multiplyScalar(2.8);
        labelC.position.copy(pose[n - 1]).add(tmp);
      }

      const yaw = prefersReduced ? 0.15 : elapsed * yawRate;
      qYaw.setFromAxisAngle(yUp, yaw);
      mol.quaternion.copy(qYaw).multiply(qLay);

      // Zoom out al inicio para ver toda la cadena; acerca al plegar.
      const zoomT = smootherstep(progress);
      const radius = THREE.MathUtils.lerp(radiusUnfold, radiusNative, zoomT);
      camera.position.copy(camDir).multiplyScalar(fitDistance(radius));
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);

      // Misma rotación/orientación que bolas-palos en el crossfade y en nativo.
      if (nativeAmt > 0.02) syncNativeView(yaw);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      ballGeo.dispose();
      linkGeo.dispose();
      balls.forEach((b) => (b.material as THREE.Material).dispose());
      stickMats.forEach((m) => m.dispose());
      [labelN, labelC].forEach((s) => {
        (s.material as THREE.SpriteMaterial).map?.dispose();
        (s.material as THREE.Material).dispose();
      });
      if (renderer.domElement.parentElement === frame) {
        frame.removeChild(renderer.domElement);
      }
      try {
        viewer.clear();
      } catch {
        /* ignore */
      }
      nativeEl.innerHTML = "";
    };
  }, [prefersReduced, progressRef]);

  return (
    <div ref={hostRef} className="proteinas-fold">
      <div ref={frameRef} className="proteinas-fold-frame">
        <div ref={nativeRef} className="proteinas-native-view" />
        <EnergyLandscapeJourney progressRef={progressRef} />
      </div>
      <p className="proteinas-caption">Ubiquitina (PDB 1UBQ)</p>
    </div>
  );
}

export function Proteinas() {
  const progressRef = useRef(0);

  return (
    <motion.div
      className="proteinas"
      variants={fade}
      initial="hidden"
      animate="visible"
    >
      <div className="showcase-grid proteinas-grid">
        <div className="objective">
          <h2 className="objective-title">¿Qué son las proteínas?</h2>
          <p className="objective-text">
            Cadenas de aminoácidos que, en condiciones fisiológicas, se pliegan
            en conformaciones tridimensionales. Según la hipótesis termodinámica de Anfinsen
            (1972), esa conformación es la de mínima energía libre y la determina la
            secuencia —el <strong>estado nativo</strong>.
          </p>
          <p className="objective-text" style={{ marginTop: "0.9em" }}>
            Al plegarse se forman contactos que limitan las rotaciones de los
            residuos y hacen la proteína más estable termodinámicamente: baja la{" "}
            <strong>entropía conformacional</strong> y el paisaje se estrecha en
            un <strong>embudo</strong> hacia el estado nativo.
          </p>
          <p className="proteinas-cite">
            Alberts et al., 2014 · Anfinsen, <em>Science</em>, 1973 · Onuchic
            et al., 1997.
          </p>
        </div>

        <div className="showcase-card proteinas-card">
          <FoldingAnimation progressRef={progressRef} />
        </div>
      </div>
    </motion.div>
  );
}
