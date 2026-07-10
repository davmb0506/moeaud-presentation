import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Html, Line, OrbitControls, RoundedBox } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

export type DockingMode = "guided" | "blind";

type DockingScene3DProps = {
  mode: DockingMode;
  paused: boolean;
  activeStep: number;
};

type Tuple3 = [number, number, number];
type FallbackPoint = readonly [number, number];

const POCKET_POS = new THREE.Vector3(0.783, 0.46, -0.831);
const POCKET_NORMAL = POCKET_POS.clone().normalize();
const POCKET_QUATERNION = new THREE.Quaternion().setFromUnitVectors(
  new THREE.Vector3(0, 0, 1),
  POCKET_NORMAL,
);
const POCKET_SURFACE_POS: Tuple3 = [
  POCKET_POS.x + POCKET_NORMAL.x * 0.06,
  POCKET_POS.y + POCKET_NORMAL.y * 0.06,
  POCKET_POS.z + POCKET_NORMAL.z * 0.06,
];
const BIND_PEPTIDE_OFFSET = 0.11;
const BIND_PEPTIDE_POS: Tuple3 = [
  POCKET_POS.x + POCKET_NORMAL.x * BIND_PEPTIDE_OFFSET,
  POCKET_POS.y + POCKET_NORMAL.y * BIND_PEPTIDE_OFFSET,
  POCKET_POS.z + POCKET_NORMAL.z * BIND_PEPTIDE_OFFSET,
];
const PEPTIDE_GUIDED_CONTACT_OFFSET: Tuple3 = [-0.16, 0, 0.04];
const GUIDED_CONTACT_OFFSETS: readonly Tuple3[] = [
  [0, 0, 0.04],
  [-0.04, 0, 0.05],
  [-0.1, 0, 0.05],
  PEPTIDE_GUIDED_CONTACT_OFFSET,
];
const PEPTIDE_BLIND_CONTACT_OFFSET: Tuple3 = [0, 0, 0.1];
const PEPTIDE_SURFACE_ROTATION: Tuple3 = [0.64, 0.1, 0.28];
const POCKET_TANGENT_X = new THREE.Vector3()
  .crossVectors(new THREE.Vector3(0, 1, 0), POCKET_NORMAL)
  .normalize();
const POCKET_TANGENT_Y = new THREE.Vector3()
  .crossVectors(POCKET_NORMAL, POCKET_TANGENT_X)
  .normalize();


function shellProbe(direction: Tuple3, radius = 1.82): Tuple3 {
  const pos = new THREE.Vector3(...direction).normalize().multiplyScalar(radius);
  return [pos.x, pos.y, pos.z];
}

function probeControl(start: THREE.Vector3, end: THREE.Vector3, bulge = 0.42): THREE.Vector3 {
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  return midpoint
    .clone()
    .normalize()
    .multiplyScalar(midpoint.length() + bulge);
}
const PROTEIN_ROTATION: Tuple3 = [0.28, -0.72, 0.14];
const CAMERA_POS: Tuple3 = [0, 0.1, 6.9];
const CAMERA_TARGET: Tuple3 = [0.18, 0.04, 0.22];

const GUIDED_GHOSTS = [
  {
    position: [-0.08, -0.05, 0.1] as Tuple3,
    rotation: [0.42, 0.1, 0.28] as Tuple3,
    scale: 0.88,
  },
  {
    position: [0.09, 0.04, 0.09] as Tuple3,
    rotation: [0.46, -0.06, 0.22] as Tuple3,
    scale: 0.9,
  },
  {
    position: [-0.04, 0.08, 0.1] as Tuple3,
    rotation: [0.4, 0.1, 0.32] as Tuple3,
    scale: 0.86,
  },
];

const BLIND_PROBE_DIRECTIONS: Tuple3[] = [
  [-0.92, 0.58, 0.62],
  [-1.02, -0.12, 0.48],
  [-0.58, -0.88, 0.68],
  [0.22, 1.02, 0.52],
  [0.96, 0.52, 0.34],
  [0.78, -0.78, 0.58],
];

const BLIND_PROBES = BLIND_PROBE_DIRECTIONS.map((direction, index) => ({
  position: shellProbe(direction, 1.84),
  rotation: [
    0.18 + index * 0.04,
    -0.22 + index * 0.08,
    0.42 - index * 0.06,
  ] as Tuple3,
  scale: 0.84,
}));

const PROBE_CURVES = BLIND_PROBE_DIRECTIONS.map((direction) => {
  const start = new THREE.Vector3(...shellProbe(direction, 1.84));
  const end = new THREE.Vector3(...BIND_PEPTIDE_POS);
  return {
    start,
    control: probeControl(start, end),
    end,
  };
});

const VEGFA_SURFACE_POINTS: Tuple3[] = [
  [-0.445, 0.806, 1.605],
  [-0.421, 0.58, 1.654],
  [-0.498, 0.418, 1.508],
  [-0.657, 0.265, 1.575],
  [-0.747, 0.267, 1.55],
  [-0.612, 0.038, 1.569],
  [-0.764, -0.055, 1.422],
  [-0.713, 0.127, 1.287],
  [-0.488, 0.073, 1.275],
  [-0.554, -0.144, 1.232],
  [-0.686, -0.103, 1.046],
  [-0.552, 0.07, 0.972],
  [-0.379, -0.084, 0.969],
  [-0.336, -0.086, 1.051],
  [-0.456, -0.288, 0.891],
  [-0.382, -0.393, 0.698],
  [-0.488, -0.263, 0.537],
  [-0.444, -0.147, 0.34],
  [-0.333, 0.046, 0.403],
  [-0.26, 0.216, 0.261],
  [-0.031, 0.2, 0.229],
  [0.132, 0.329, 0.127],
  [0.169, 0.406, 0.164],
  [0.117, 0.483, 0.157],
  [0.249, 0.188, -0.017],
  [0.439, 0.234, -0.14],
  [0.407, 0.201, -0.366],
  [0.614, 0.104, -0.393],
  [0.539, -0.041, -0.23],
  [0.385, -0.109, -0.388],
  [0.507, -0.083, -0.582],
  [0.728, -0.127, -0.521],
  [0.744, -0.206, -0.474],
  [0.68, -0.263, -0.504],
  [0.804, -0.155, -0.738],
  [0.749, 0.055, -0.817],
  [0.954, 0.139, -0.747],
  [0.973, 0.261, -0.944],
  [0.795, 0.398, -0.892],
  [0.737, 0.522, -0.709],
  [0.521, 0.561, -0.634],
  [0.406, 0.744, -0.553],
  [0.436, 0.829, -0.578],
  [0.512, 0.855, -0.534],
  [0.316, 0.718, -0.408],
  [0.467, 0.557, -0.339],
  [0.314, 0.444, -0.206],
  [0.087, 0.399, -0.192],
  [-0.084, 0.366, -0.037],
  [-0.162, 0.148, -0.041],
  [-0.299, 0.017, 0.09],
  [-0.17, -0.151, 0.178],
  [-0.078, -0.138, 0.177],
  [-0.044, -0.116, 0.094],
  [-0.217, -0.307, 0.34],
  [-0.163, -0.202, 0.537],
  [-0.198, -0.226, 0.764],
  [-0.161, -0.409, 0.899],
  [-0.251, -0.616, 0.951],
  [-0.326, -0.696, 1.154],
  [-0.177, -0.871, 1.156],
  [0.052, -0.893, 1.135],
  [0.103, -0.939, 1.197],
  [0.193, -0.931, 1.185],
  [0.021, -1.066, 0.984],
  [-0.102, -0.937, 0.837],
  [-0.05, -0.782, 0.672],
  [-0.174, -0.613, 0.574],
  [-0.191, -0.675, 0.352],
  [-0.32, -0.607, 0.171],
  [-0.494, -0.736, 0.092],
  [-0.555, -0.588, -0.074],
  [-0.64, -0.553, -0.061],
  [-0.704, -0.617, -0.043],
  [-0.415, -0.465, -0.213],
  [-0.45, -0.308, -0.38],
  [-0.304, -0.176, -0.502],
  [-0.364, 0.047, -0.511],
  [-0.298, 0.21, -0.661],
  [-0.199, 0.416, -0.629],
  [-0.101, 0.583, -0.756],
  [0.129, 0.58, -0.731],
  [0.171, 0.502, -0.702],
  [0.294, 0.701, -0.837],
  [0.452, 0.561, -0.932],
  [0.654, 0.667, -0.968],
  [0.832, 0.594, -1.094],
  [0.999, 0.738, -1.017],
  [1.072, 0.877, -1.188],
  [0.939, 0.775, -1.348],
  [0.722, 0.834, -1.292],
  [0.534, 0.793, -1.161],
  [0.305, 0.767, -1.164],
  [0.128, 0.719, -1.024],
  [0.042, 0.507, -1.049],
  [-0.101, 0.366, -0.937],
  [0.001, 0.215, -0.793],
  [-0.11, 0.037, -0.697],
  [-0.066, -0.018, -0.478],
  [0.014, 0.112, -0.46],
  [-0.131, -0.198, -0.347],
  [-0.282, -0.166, -0.174],
  [-0.37, -0.293, -0.003],
  [-0.6, -0.298, 0.023],
  [-0.64, -0.46, 0.18],
  [-0.489, -0.513, 0.347],
  [-0.483, -0.702, 0.48],
  [-0.363, -0.788, 0.66],
  [-0.38, -0.774, 0.75],
  [-0.28, -0.994, 0.6],
  [-0.133, -1.159, 0.673],
  [0.089, -1.118, 0.625],
];

const VEGFA_CENTER = new THREE.Vector3(
  VEGFA_SURFACE_POINTS.reduce((sum, [x]) => sum + x, 0) / VEGFA_SURFACE_POINTS.length,
  VEGFA_SURFACE_POINTS.reduce((sum, [, y]) => sum + y, 0) / VEGFA_SURFACE_POINTS.length,
  VEGFA_SURFACE_POINTS.reduce((sum, [, , z]) => sum + z, 0) / VEGFA_SURFACE_POINTS.length,
);

const VEGFA_RADIAL_PROFILE = VEGFA_SURFACE_POINTS.map(([x, y, z]) => {
  const centered = new THREE.Vector3(x, y, z).sub(VEGFA_CENTER);
  return {
    direction: centered.clone().normalize(),
    radius: centered.length(),
  };
});

const GUIDED_STAGE_POSES = [
  {
    position: [0.03, 0.02, 0.14] as Tuple3,
    rotation: [0.5, 0.1, 0.3] as Tuple3,
    scale: 0.94,
  },
  {
    position: [0.03, 0.02, 0.12] as Tuple3,
    rotation: [0.44, 0.11, 0.34] as Tuple3,
    scale: 0.88,
  },
  {
    position: [0.01, 0.01, 0.07] as Tuple3,
    rotation: [0.54, 0.1, 0.3] as Tuple3,
    scale: 0.92,
  },
  {
    position: [0, 0, 0.04] as Tuple3,
    rotation: PEPTIDE_SURFACE_ROTATION,
    scale: 0.96,
  },
] as const;

const SVG_PROTEIN_PATH =
  "M86 113 C96 62 144 34 203 46 C248 36 307 49 337 84 C366 118 360 178 322 205 " +
  "C290 229 242 225 206 214 C165 225 114 214 84 183 C62 160 57 134 86 113 Z";
const SVG_POCKET_PATH =
  "M257 92 C276 88 291 95 300 109 C308 123 305 141 289 150 C275 158 258 153 248 141 " +
  "C238 128 240 101 257 92 Z";

const BASE_CHAIN_POINTS: Tuple3[] = [
  [-0.56, -0.1, -0.14],
  [-0.34, 0.06, 0.02],
  [-0.12, 0.18, 0.12],
  [0.12, 0.02, 0.08],
  [0.32, -0.12, -0.04],
  [0.56, 0.04, -0.14],
];

function ellipsePoints(radiusX: number, radiusY: number, z = 0) {
  const points: Tuple3[] = [];
  const segments = 40;
  for (let i = 0; i <= segments; i += 1) {
    const theta = (i / segments) * Math.PI * 2;
    points.push([Math.cos(theta) * radiusX, Math.sin(theta) * radiusY, z]);
  }
  return points;
}

const BLIND_SITE_OUTLINE = ellipsePoints(0.66, 0.44, 0.03);

function canUseWebGL() {
  if (typeof window === "undefined") return true;
  const canvas = document.createElement("canvas");
  return Boolean(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
}

function chainCurve(points: readonly Tuple3[]) {
  return new THREE.CatmullRomCurve3(
    points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    false,
    "catmullrom",
    0.5,
  );
}

function PeptideModel({
  color = "#35d7a2",
  opacity = 1,
  scale = 1,
}: {
  color?: string;
  opacity?: number;
  scale?: number;
}) {
  const curve = useMemo(() => chainCurve(BASE_CHAIN_POINTS), []);
  const beadPoints = useMemo(() => curve.getSpacedPoints(5), [curve]);

  return (
    <group scale={scale}>
      <mesh>
        <tubeGeometry args={[curve, 64, 0.075, 14, false]} />
        <meshStandardMaterial
          color={color}
          roughness={0.24}
          metalness={0.02}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
      {beadPoints.map((point, index) => (
        <mesh key={index} position={point}>
          <sphereGeometry args={[0.1, 18, 18]} />
          <meshStandardMaterial
            color="#98ffda"
            emissive={color}
            emissiveIntensity={0.24}
            roughness={0.18}
            transparent={opacity < 1}
            opacity={opacity}
          />
        </mesh>
      ))}
    </group>
  );
}

function ProteinBlob() {
  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1, 5);
    const position = geo.attributes.position;
    const vertex = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const pocketDir = POCKET_NORMAL.clone().normalize();

    for (let i = 0; i < position.count; i += 1) {
      vertex.fromBufferAttribute(position, i);
      direction.copy(vertex).normalize();

      let weightedRadius = 0;
      let weightSum = 0;

      for (const sample of VEGFA_RADIAL_PROFILE) {
        const alignment = THREE.MathUtils.clamp(direction.dot(sample.direction), -1, 1);
        const weight = Math.exp((alignment - 1) * 10.4);
        weightedRadius += sample.radius * weight;
        weightSum += weight;
      }

      const smoothRadius = weightedRadius / Math.max(weightSum, 1e-6);
      const softRipple =
        1 +
        0.018 * Math.sin(direction.x * 4.8 + direction.y * 2.1) +
        0.016 * Math.cos(direction.z * 4.2 - direction.x * 1.4);
      const pocketBias = Math.max(0, direction.dot(pocketDir));
      const pocketIndent = 0.17 * Math.pow(pocketBias, 4.6);
      const neckTaper = 1 - Math.max(0, -direction.y - 0.52) * 0.06;
      const radius = smoothRadius * 1.02 * softRipple * neckTaper - pocketIndent;

      vertex.copy(direction.multiplyScalar(radius));
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    position.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshPhysicalMaterial
        color="#9fc9f1"
        roughness={0.34}
        metalness={0.02}
        clearcoat={0.72}
        clearcoatRoughness={0.34}
        transparent
        opacity={0.97}
      />
    </mesh>
  );
}

function PocketHighlight({
  paused,
  tone,
  activeStep,
}: {
  paused: boolean;
  tone: DockingMode;
  activeStep: number;
}) {
  const haloRef = useRef<THREE.Mesh>(null);
  const focusRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (paused) return;
    const t = clock.elapsedTime;
    if (tone === "guided") {
      const pulse = 1 + Math.sin(t * 1.4) * 0.08;
      if (haloRef.current) {
        haloRef.current.scale.setScalar(pulse);
      }
      if (ringRef.current) {
        ringRef.current.rotation.z += 0.008;
      }
      return;
    }

    const pulse = 1 + Math.sin(t * 1.18) * (activeStep >= 2 ? 0.055 : 0.018);
    const focusPulse = 1 + Math.sin(t * 1.42 + 0.7) * (activeStep >= 3 ? 0.05 : 0.022);

    if (haloRef.current) {
      haloRef.current.scale.set(1.16 * pulse, 0.92 * pulse, 1);
    }
    if (focusRef.current) {
      focusRef.current.scale.set(0.92 * focusPulse, 0.64 * focusPulse, 1);
    }
  });

  const glowColor = tone === "guided" ? "#8dc6ff" : "#ffc772";
  const guidedHaloOpacity = activeStep >= 2 ? 0.18 : 0.12;
  const guidedRingOpacity = activeStep >= 3 ? 0.9 : 0.68;
  const blindHaloOpacity = [0.015, 0.028, 0.14, 0.26][activeStep] ?? 0.26;
  const blindRegionOpacity = [0, 0.018, 0.1, 0.18][activeStep] ?? 0.18;
  const blindCoreOpacity = [0, 0, 0.065, 0.16][activeStep] ?? 0.16;
  const blindOutlineOpacity = [0, 0.03, 0.14, 0.36][activeStep] ?? 0.36;
  const blindLabelOpacity = [0, 0, 0.42, 0.94][activeStep] ?? 0.94;

  if (tone === "guided") {
    return (
      <group position={POCKET_POS} quaternion={POCKET_QUATERNION}>
        <mesh ref={haloRef}>
          <sphereGeometry args={[0.46, 24, 24]} />
          <meshBasicMaterial color={glowColor} transparent opacity={guidedHaloOpacity} />
        </mesh>
        <mesh ref={ringRef}>
          <torusGeometry args={[0.54, 0.028, 18, 72]} />
          <meshBasicMaterial color={glowColor} transparent opacity={guidedRingOpacity} />
        </mesh>
        <mesh position={[0, 0, -0.08]}>
          <circleGeometry args={[0.24, 32]} />
          <meshBasicMaterial color="#b4f6ff" transparent opacity={0.32} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={POCKET_SURFACE_POS} quaternion={POCKET_QUATERNION}>
      <mesh ref={haloRef} position={[0, 0, 0.02]} scale={[1.16, 0.92, 1]} renderOrder={3}>
        <circleGeometry args={[0.62, 42]} />
        <meshBasicMaterial
          color="#ffc86f"
          transparent
          opacity={blindHaloOpacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0.03, -0.01, 0.028]} scale={[1.08, 0.8, 1]} renderOrder={4}>
        <circleGeometry args={[0.42, 40]} />
        <meshBasicMaterial
          color="#ffe5b2"
          transparent
          opacity={blindRegionOpacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={focusRef} position={[-0.04, 0.02, 0.036]} scale={[0.92, 0.64, 1]} renderOrder={5}>
        <circleGeometry args={[0.24, 36]} />
        <meshBasicMaterial
          color="#fff4d2"
          transparent
          opacity={blindCoreOpacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Line
        points={BLIND_SITE_OUTLINE}
        color="#f1bd69"
        transparent
        opacity={blindOutlineOpacity}
        lineWidth={1}
      />
      <Html
        position={[0.88, 0.24, 0.09]}
        style={{ opacity: blindLabelOpacity, pointerEvents: "none", transition: "opacity 180ms ease" }}
      >
        <div
          style={{
            padding: "4px 8px",
            borderRadius: "999px",
            border: "1px solid rgba(239, 186, 98, 0.58)",
            background: "rgba(255, 251, 243, 0.92)",
            boxShadow: "0 10px 22px rgba(151, 103, 35, 0.12)",
            color: "#7f5015",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.01em",
            whiteSpace: "nowrap",
          }}
        >
          convergencia de poses
        </div>
      </Html>
    </group>
  );
}

function GuidedPeptide({
  paused,
  activeStep,
}: {
  paused: boolean;
  activeStep: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const pose = GUIDED_STAGE_POSES[activeStep] ?? GUIDED_STAGE_POSES[0];
  const contactOffset = GUIDED_CONTACT_OFFSETS[activeStep] ?? GUIDED_CONTACT_OFFSETS[0];

  useEffect(() => {
    if (!paused || !ref.current) return;
    ref.current.position.set(...pose.position);
    ref.current.rotation.set(...pose.rotation);
    ref.current.scale.setScalar(pose.scale);
  }, [paused, pose]);

  useFrame(({ clock }) => {
    if (!ref.current || paused) return;
    const t = clock.elapsedTime;
    const wobble =
      activeStep === 0 ? 0.018 : activeStep === 1 ? 0.038 : activeStep === 2 ? 0.062 : 0.022;
    const targetX = pose.position[0] + Math.sin(t * 0.8) * wobble;
    const targetY = pose.position[1] + Math.cos(t * 1.05) * wobble;
    const targetZ = pose.position[2] + Math.sin(t * 0.92) * wobble * 0.85;

    ref.current.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.12);
    ref.current.rotation.x = THREE.MathUtils.lerp(
      ref.current.rotation.x,
      pose.rotation[0] + Math.sin(t * 0.82) * wobble * 1.6,
      0.12,
    );
    ref.current.rotation.y = THREE.MathUtils.lerp(
      ref.current.rotation.y,
      pose.rotation[1] + Math.cos(t * 0.68) * wobble * 1.9,
      0.12,
    );
    ref.current.rotation.z = THREE.MathUtils.lerp(
      ref.current.rotation.z,
      pose.rotation[2] + Math.sin(t * 1.12) * wobble * 2.4,
      0.12,
    );
    const targetScale = pose.scale + Math.sin(t * 0.7) * wobble * 0.16;
    const nextScale = THREE.MathUtils.lerp(ref.current.scale.x, targetScale, 0.12);
    ref.current.scale.setScalar(nextScale);
  });

  return (
    <group position={POCKET_POS.toArray()} quaternion={POCKET_QUATERNION}>
      <group
        ref={ref}
        position={pose.position}
        rotation={pose.rotation}
        scale={pose.scale}
        renderOrder={10}
      >
        <group position={contactOffset}>
          <PeptideModel opacity={1} />
        </group>
      </group>
    </group>
  );
}

function GuidedGhostPeptides({
  activeStep,
}: {
  activeStep: number;
}) {
  const ghostOpacity = activeStep === 0 ? 0.02 : activeStep === 1 ? 0.08 : activeStep === 2 ? 0.18 : 0.1;

  return (
    <group position={POCKET_POS.toArray()} quaternion={POCKET_QUATERNION}>
      {GUIDED_GHOSTS.map((ghost, index) => (
        <Float
          key={index}
          speed={0.48 + index * 0.08}
          rotationIntensity={0.12}
          floatIntensity={0.12}
        >
          <group
            position={ghost.position}
            rotation={ghost.rotation}
            scale={ghost.scale}
          >
            <group position={GUIDED_CONTACT_OFFSETS[1]}>
              <PeptideModel color="#4fe0b2" opacity={ghostOpacity} />
            </group>
          </group>
        </Float>
      ))}
    </group>
  );
}

function GuidedRegion({
  activeStep,
}: {
  activeStep: number;
}) {
  const boxOpacity =
    activeStep === 0 ? 0.04 : activeStep === 1 ? 0.1 : activeStep === 2 ? 0.14 : 0.08;
  const lineOpacity =
    activeStep === 0 ? 0.24 : activeStep === 1 ? 0.62 : activeStep === 2 ? 0.78 : 0.42;

  return (
    <group position={POCKET_POS.toArray()} quaternion={POCKET_QUATERNION}>
      <RoundedBox args={[1.55, 1.2, 0.82]} radius={0.12} smoothness={4}>
        <meshBasicMaterial color="#85bdf1" transparent opacity={boxOpacity} />
      </RoundedBox>
      <Line
        points={[
          [-0.78, 0.6, 0.41],
          [0.78, 0.6, 0.41],
          [0.78, -0.6, 0.41],
          [-0.78, -0.6, 0.41],
          [-0.78, 0.6, 0.41],
        ]}
        color="#6ba8e3"
        transparent
        opacity={lineOpacity}
        lineWidth={1.2}
      />
    </group>
  );
}

function ProbeTrail({
  curve,
  paused,
  delay = 0,
  activeStep,
}: {
  curve: THREE.QuadraticBezierCurve3;
  paused: boolean;
  delay?: number;
  activeStep: number;
}) {
  const dotRef = useRef<THREE.Mesh>(null);
  const points = useMemo(() => curve.getPoints(48), [curve]);
  const lineOpacity = activeStep === 0 ? 0.04 : activeStep === 1 ? 0.32 : activeStep === 2 ? 0.28 : 0.18;
  const dotOpacity = activeStep === 0 ? 0.08 : activeStep === 1 ? 0.78 : activeStep === 2 ? 0.64 : 0.26;

  useFrame(({ clock }) => {
    if (!dotRef.current || paused) return;
    const t = (clock.elapsedTime * 0.12 + delay) % 1;
    const position = curve.getPointAt((Math.sin(t * Math.PI * 2 - Math.PI / 2) + 1) / 2);
    dotRef.current.position.copy(position);
  });

  return (
    <group>
      <Line points={points} color="#e09537" transparent opacity={lineOpacity} lineWidth={1.1} />
      <mesh ref={dotRef}>
        <sphereGeometry args={[0.065, 16, 16]} />
        <meshBasicMaterial color="#ffcf87" transparent opacity={dotOpacity} />
      </mesh>
    </group>
  );
}

function BlindPeptide({
  paused,
  activeStep,
}: {
  paused: boolean;
  activeStep: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const curve = useMemo(() => {
    const start = new THREE.Vector3(...shellProbe([-0.95, 0.52, 0.66], 1.96));
    const end = new THREE.Vector3(...BIND_PEPTIDE_POS);
    const controlOne = start.clone().lerp(end, 0.34).add(POCKET_TANGENT_X.clone().multiplyScalar(0.28));
    const controlTwo = start.clone().lerp(end, 0.68).add(POCKET_TANGENT_Y.clone().multiplyScalar(0.18));
    return new THREE.CubicBezierCurve3(start, controlOne, controlTwo, end);
  }, []);
  const bindPosition = useMemo(() => new THREE.Vector3(...BIND_PEPTIDE_POS), []);
  const bindQuaternion = useMemo(() => {
    const euler = new THREE.Euler(...PEPTIDE_SURFACE_ROTATION);
    return POCKET_QUATERNION.clone().multiply(new THREE.Quaternion().setFromEuler(euler));
  }, []);
  const travelObject = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    if (!ref.current || paused) return;
    const loop = (clock.elapsedTime * 0.08) % 1;
    const oscillation = (Math.sin(loop * Math.PI * 2 - Math.PI / 2) + 1) / 2;
    const stageT =
      activeStep === 0 ? 0 :
      activeStep === 1 ? Math.min(0.34, oscillation * 0.42) :
      activeStep === 2 ? 0.3 + oscillation * 0.4 :
      0.92;
    const t = stageT;
    const pos = curve.getPointAt(t);
    const lookAhead = curve.getPointAt(Math.min(0.99, t + 0.015));

    travelObject.position.copy(pos);
    travelObject.lookAt(lookAhead);
    travelObject.rotateZ(Math.PI / 2);

    if (t >= 0.72) {
      const blend = THREE.MathUtils.smoothstep(t, 0.72, 0.95);
      ref.current.position.lerpVectors(pos, bindPosition, blend);
      ref.current.quaternion.copy(travelObject.quaternion).slerp(bindQuaternion, blend);
      return;
    }

    ref.current.position.copy(pos);
    ref.current.quaternion.copy(travelObject.quaternion);
  });

  return (
    <group ref={ref}>
      <group position={PEPTIDE_BLIND_CONTACT_OFFSET}>
        <PeptideModel opacity={activeStep === 0 ? 0.88 : 1} />
      </group>
    </group>
  );
}

function BlindGhostPeptides({
  activeStep,
}: {
  activeStep: number;
}) {
  const ghostOpacity =
    activeStep === 0 ? 0.06 : activeStep === 1 ? 0.18 : activeStep === 2 ? 0.12 : 0.08;

  return (
    <>
      {BLIND_PROBES.map((probe, index) => (
        <Float
          key={index}
          speed={0.38 + index * 0.05}
          rotationIntensity={0.18}
          floatIntensity={0.2}
        >
          <group
            position={probe.position}
            rotation={probe.rotation}
            scale={probe.scale}
          >
            <PeptideModel color="#4cdcab" opacity={ghostOpacity} />
          </group>
        </Float>
      ))}
    </>
  );
}

function SceneStage({
  tone,
}: {
  tone: DockingMode;
}) {
  return (
    <>
      <mesh position={[0, 0, -3.2]} scale={[7.4, 7.4, 1]}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial
          color={tone === "guided" ? "#d8ebff" : "#fff0d9"}
          transparent
          opacity={0.16}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.25, 0]} scale={[1.45, 1, 1]}>
        <circleGeometry args={[2.55, 48]} />
        <meshBasicMaterial
          color={tone === "guided" ? "#e8f2ff" : "#fff4e6"}
          transparent
          opacity={0.42}
        />
      </mesh>
    </>
  );
}

function DockingSceneContents({
  mode,
  paused,
  activeStep,
}: {
  mode: DockingMode;
  paused: boolean;
  activeStep: number;
}) {
  const proteinRef = useRef<THREE.Group>(null);
  const probeCurves = useMemo(
    () =>
      PROBE_CURVES.map(
        ({ start, control, end }) => new THREE.QuadraticBezierCurve3(start, control, end),
      ),
    [],
  );

  useFrame(({ clock }) => {
    if (!proteinRef.current || paused) return;
    const t = clock.elapsedTime;
    proteinRef.current.rotation.x = PROTEIN_ROTATION[0] + Math.cos(t * 0.24) * 0.05;
    proteinRef.current.rotation.y = PROTEIN_ROTATION[1] + Math.sin(t * 0.22) * 0.12;
    proteinRef.current.rotation.z = PROTEIN_ROTATION[2] + Math.cos(t * 0.16) * 0.04;
  });

  return (
    <>
      <SceneStage tone={mode} />
      <ambientLight intensity={0.95} />
      <directionalLight position={[3, 4, 5]} intensity={1.8} color="#ffffff" />
      <directionalLight
        position={[-4, 1.5, 4]}
        intensity={1.25}
        color={mode === "guided" ? "#dbeeff" : "#fff1dd"}
      />
      <pointLight
        position={[0, -1.8, 3]}
        intensity={1.3}
        color={mode === "guided" ? "#b7d9ff" : "#ffd599"}
      />

      {mode === "blind" &&
        probeCurves.map((curve, index) => (
          <ProbeTrail
            key={index}
            curve={curve}
            paused={paused}
            delay={index * 0.14}
            activeStep={activeStep}
          />
        ))}

      <group ref={proteinRef}>
        <ProteinBlob />
        <PocketHighlight paused={paused} tone={mode} activeStep={activeStep} />

        {mode === "guided" ? (
          <>
            <GuidedRegion activeStep={activeStep} />
            <GuidedGhostPeptides activeStep={activeStep} />
            <GuidedPeptide paused={paused} activeStep={activeStep} />
          </>
        ) : (
          <>
            <BlindGhostPeptides activeStep={activeStep} />
            <BlindPeptide paused={paused} activeStep={activeStep} />
          </>
        )}
      </group>
    </>
  );
}

function FallbackPeptide({
  points,
  ghost = false,
}: {
  points: readonly FallbackPoint[];
  ghost?: boolean;
}) {
  const path = points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ");

  return (
    <g className={ghost ? "dock3-fallback-chain ghost" : "dock3-fallback-chain"}>
      <path d={path} />
      {points.map(([x, y], index) => (
        <circle key={index} cx={x} cy={y} r={4.4} />
      ))}
    </g>
  );
}

function svgChain(x: number, y: number, rotDeg: number, scale = 1): FallbackPoint[] {
  const base: FallbackPoint[] = [
    [-26, -7],
    [-16, -1],
    [-7, 5],
    [3, 0],
    [13, 6],
    [25, 1],
  ];
  const angle = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return base.map(([px, py]) => {
    const sx = px * scale;
    const sy = py * scale;
    return [x + sx * cos - sy * sin, y + sx * sin + sy * cos] as FallbackPoint;
  });
}

function DockingSceneFallback({
  mode,
}: {
  mode: DockingMode;
}) {
  const guidedGhosts = [
    svgChain(248, 98, -32, 0.88),
    svgChain(286, 112, -8, 0.86),
    svgChain(268, 140, -18, 0.82),
  ];
  const blindGhosts = [
    svgChain(112, 70, 16, 0.84),
    svgChain(86, 128, 74, 0.82),
    svgChain(124, 188, -10, 0.84),
    svgChain(214, 54, 38, 0.82),
    svgChain(326, 84, 124, 0.82),
    svgChain(330, 168, -54, 0.84),
  ];

  return (
    <svg
      viewBox="0 0 420 260"
      className="dock3-fallback-svg"
      role="img"
      aria-label={
        mode === "guided"
          ? "Version estatica del docking local guiado"
          : "Version estatica del docking a ciegas"
      }
    >
      <defs>
        <linearGradient id={`dock3ProteinFallback-${mode}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f4f8fd" />
          <stop offset="60%" stopColor="#d7e7f5" />
          <stop offset="100%" stopColor="#c6d9ec" />
        </linearGradient>
      </defs>

      <rect x={8} y={14} width={404} height={232} rx={28} className="dock3-fallback-bg" />
      <ellipse
        cx={210}
        cy={224}
        rx={118}
        ry={28}
        className={mode === "guided" ? "dock3-fallback-stage guided" : "dock3-fallback-stage blind"}
      />
      <path
        d={SVG_PROTEIN_PATH}
        fill={`url(#dock3ProteinFallback-${mode})`}
        className="dock3-fallback-protein"
      />
      <path d={SVG_POCKET_PATH} className="dock3-fallback-pocket" />
      <ellipse
        cx={273}
        cy={121}
        rx={32}
        ry={22}
        transform="rotate(-18 273 121)"
        className={mode === "guided" ? "dock3-fallback-halo guided" : "dock3-fallback-halo blind"}
      />

      {mode === "guided" ? (
        <>
          <rect x={214} y={74} width={108} height={88} rx={18} className="dock3-fallback-region" />
          {guidedGhosts.map((points, index) => (
            <FallbackPeptide key={index} points={points} ghost />
          ))}
          <FallbackPeptide points={svgChain(222, 88, 8, 0.8)} />
        </>
      ) : (
        <>
          <path d="M118 72 Q162 86 205 95 Q232 101 248 110" className="dock3-fallback-trail" />
          <path d="M96 128 Q158 132 208 124 Q226 120 240 118" className="dock3-fallback-trail" />
          <path d="M132 188 Q184 166 228 142 Q244 132 255 126" className="dock3-fallback-trail" />
          <path d="M214 56 Q238 81 252 101 Q258 109 262 114" className="dock3-fallback-trail" />
          <path d="M322 88 Q298 96 282 106 Q274 111 268 115" className="dock3-fallback-trail" />
          {blindGhosts.map((points, index) => (
            <FallbackPeptide key={index} points={points} ghost />
          ))}
          <FallbackPeptide points={svgChain(274, 118, -18, 0.96)} />
        </>
      )}
    </svg>
  );
}

export function DockingScene3D({
  mode,
  paused,
  activeStep,
}: DockingScene3DProps) {
  const [supportsWebGL] = useState(canUseWebGL);

  return (
    <div className={`dock3-scene dock3-scene-${mode}`}>
      {supportsWebGL ? (
        <Canvas
          className="dock3-canvas"
          dpr={[1, 1.5]}
          camera={{ position: CAMERA_POS, fov: 34 }}
          gl={{ antialias: true, alpha: true }}
          frameloop={paused ? "demand" : "always"}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
          }}
          fallback={<DockingSceneFallback mode={mode} />}
        >
          <OrbitControls
            makeDefault
            target={CAMERA_TARGET}
            enablePan={false}
            enableZoom={false}
            enableDamping
            dampingFactor={0.08}
            rotateSpeed={0.72}
            minPolarAngle={0.85}
            maxPolarAngle={2.25}
          />
          <DockingSceneContents mode={mode} paused={paused} activeStep={activeStep} />
        </Canvas>
      ) : (
        <DockingSceneFallback mode={mode} />
      )}
    </div>
  );
}
