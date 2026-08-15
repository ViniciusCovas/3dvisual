import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { FaceFrame } from '../core/face/types';
import { LM } from '../core/face/types';
import { buildFrameGeometries } from '../core/frames/generator';
import { buildMaterials } from '../core/frames/materials';
import type { FrameSpec } from '../core/frames/spec';
import type { FrameColor } from '../core/color/palette';
import type { FitAdjust } from '../state/store';

/** Distancia sien-a-sien (landmarks 127/356) de una cabeza adulta, en mm. */
const HEAD_TEMPLE_WIDTH_MM = 140;

interface GlassesProps {
  faceRef: MutableRefObject<FaceFrame | null>;
  spec: FrameSpec;
  color: FrameColor;
  fit: FitAdjust;
  /** 1 = sin suavizado (foto); <1 = interpolación temporal (webcam). */
  smoothing: number;
}

const tmpMatrix = new THREE.Matrix4();
const tmpQuat = new THREE.Quaternion();
const tmpPos = new THREE.Vector3();

/**
 * Extrae la rotación de la facialTransformationMatrix. MediaPipe entrega la
 * matriz como array plano; detectamos el layout (row/column-major) mirando en
 * qué ranuras cae la traslación (la cabeza está a decenas de cm de la cámara,
 * así que la traslación domina claramente).
 */
function quaternionFromFaceMatrix(data: number[], out: THREE.Quaternion): void {
  tmpMatrix.fromArray(data); // asume column-major
  const colT = Math.abs(data[12]) + Math.abs(data[13]) + Math.abs(data[14]);
  const rowT = Math.abs(data[3]) + Math.abs(data[7]) + Math.abs(data[11]);
  if (rowT > colT) tmpMatrix.transpose();
  out.setFromRotationMatrix(tmpMatrix);
}

/**
 * Lentes procedurales anclados a la cabeza:
 *  - rotación: facialTransformationMatrix (pose de cabeza)
 *  - posición: landmark 168 (puente nasal), en px del overlay
 *  - escala: distancia 3D entre sienes (127/356) → px por mm
 * El grupo exterior lleva pose y escala global; el interior, los ajustes
 * finos del usuario en coordenadas locales de la cabeza (mm).
 */
export function Glasses({ faceRef, spec, color, fit, smoothing }: GlassesProps) {
  const outer = useRef<THREE.Group>(null);
  const { size } = useThree();

  const geos = useMemo(() => buildFrameGeometries(spec), [spec]);
  const mats = useMemo(() => buildMaterials(color.hex, color.finish), [color.hex, color.finish]);

  useEffect(() => {
    return () => {
      [...geos.rims, ...geos.lenses, ...geos.bridges, ...geos.temples].forEach((g) => g.dispose());
    };
  }, [geos]);
  useEffect(() => {
    return () => {
      mats.frame.dispose();
      mats.lens.dispose();
    };
  }, [mats]);

  useFrame(() => {
    const g = outer.current;
    if (!g) return;
    const face = faceRef.current;
    if (!face) {
      g.visible = false;
      return;
    }
    g.visible = true;

    const W = size.width;
    const H = size.height;
    const lm = face.landmarks;
    const anchor = lm[LM.NOSE_BRIDGE];
    const tR = lm[LM.RIGHT_TEMPLE];
    const tL = lm[LM.LEFT_TEMPLE];

    // Posición del puente nasal en px del overlay (origen al centro, +y arriba).
    tmpPos.set((anchor.x - 0.5) * W, (0.5 - anchor.y) * H, 0);

    // Escala: distancia 3D entre sienes (z viene normalizado por el ancho de
    // imagen, igual que x), robusta frente a giros de cabeza.
    const dx = (tR.x - tL.x) * W;
    const dy = (tR.y - tL.y) * H;
    const dz = (tR.z - tL.z) * W;
    const templeDistPx = Math.hypot(dx, dy, dz);
    const pxPerMm = templeDistPx / HEAD_TEMPLE_WIDTH_MM;
    const s = pxPerMm * fit.scale;

    if (face.matrix) {
      quaternionFromFaceMatrix(face.matrix, tmpQuat);
    } else {
      tmpQuat.identity();
    }

    if (smoothing >= 1) {
      g.position.copy(tmpPos);
      g.quaternion.copy(tmpQuat);
      g.scale.setScalar(s);
    } else {
      const a = 1 - smoothing;
      g.position.lerp(tmpPos, a);
      g.quaternion.slerp(tmpQuat, a);
      g.scale.lerp(new THREE.Vector3(s, s, s), a);
    }
  });

  return (
    <group ref={outer} visible={false}>
      {/* Ajustes finos en el espacio local de la cabeza (mm). */}
      <group position={[0, fit.offsetY, 0]} scale={[fit.width, 1, 1]}>
        {geos.rims.map((geo, i) => (
          <mesh key={`rim-${i}`} geometry={geo} material={mats.frame} />
        ))}
        {geos.bridges.map((geo, i) => (
          <mesh key={`bridge-${i}`} geometry={geo} material={mats.frame} />
        ))}
        {geos.temples.map((geo, i) => (
          <mesh key={`temple-${i}`} geometry={geo} material={mats.frame} />
        ))}
        {geos.lenses.map((geo, i) => (
          <mesh key={`lens-${i}`} geometry={geo} material={mats.lens} />
        ))}
      </group>
    </group>
  );
}
