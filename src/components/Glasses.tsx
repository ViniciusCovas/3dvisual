import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { FaceFrame } from '../core/face/types';
import { LM } from '../core/face/types';
import { pxPerMm } from '../core/face/measures';
import { buildFrameGeometries } from '../core/frames/generator';
import { buildMaterials } from '../core/frames/materials';
import type { FrameSpec } from '../core/frames/spec';
import type { FrameColor } from '../core/color/palette';
import { useAppStore, type FitAdjust } from '../state/store';

const tmpMatrix = new THREE.Matrix4();
const tmpQuat = new THREE.Quaternion();
const tmpPos = new THREE.Vector3();
const tmpScale = new THREE.Vector3();

/**
 * Modelo del armazón en mm con los ajustes finos del usuario aplicados en el
 * espacio local de la cabeza (altura, ancho, inclinación pantoscópica).
 * Es compartido por el rig de foto/webcam y por el montaje sobre GLB (M4).
 */
export function GlassesModel({
  spec,
  color,
  fit,
}: {
  spec: FrameSpec;
  color: FrameColor;
  fit: FitAdjust;
}) {
  const geos = useMemo(() => buildFrameGeometries(spec), [spec]);
  const mats = useMemo(
    () => buildMaterials(color.hex, color.finish, spec.material),
    [color.hex, color.finish, spec.material],
  );

  useEffect(() => {
    return () => {
      [...geos.rims, ...geos.lenses, ...geos.bridges, ...geos.temples, ...geos.browBars].forEach(
        (g) => g.dispose(),
      );
    };
  }, [geos]);
  useEffect(() => {
    return () => {
      mats.frame.dispose();
      mats.lens.dispose();
      mats.accent.dispose();
    };
  }, [mats]);

  // Asignación de materiales: combi usa el acento metálico en aros (browline)
  // o en puente/patillas (navigator); metal y acetato usan el material frame.
  const combi = spec.material === 'combi';
  const rimMat = combi && spec.browline ? mats.accent : mats.frame;
  const bridgeMat = combi ? mats.accent : mats.frame;
  const templeMat = combi && !spec.browline ? mats.accent : mats.frame;

  return (
    <group
      position={[0, fit.offsetY, 0]}
      scale={[fit.width, 1, 1]}
      rotation={[-THREE.MathUtils.degToRad(fit.tiltDeg), 0, 0]}
    >
      {geos.rims.map((geo, i) => (
        <mesh key={`rim-${i}`} geometry={geo} material={rimMat} />
      ))}
      {geos.bridges.map((geo, i) => (
        <mesh key={`bridge-${i}`} geometry={geo} material={bridgeMat} />
      ))}
      {geos.temples.map((geo, i) => (
        <mesh key={`temple-${i}`} geometry={geo} material={templeMat} />
      ))}
      {geos.browBars.map((geo, i) => (
        <mesh key={`brow-${i}`} geometry={geo} material={mats.frame} />
      ))}
      {geos.lenses.map((geo, i) => (
        <mesh key={`lens-${i}`} geometry={geo} material={mats.lens} />
      ))}
    </group>
  );
}

interface GlassesProps {
  faceRef: MutableRefObject<FaceFrame | null>;
  spec: FrameSpec;
  color: FrameColor;
  fit: FitAdjust;
  /** 1 = sin suavizado (foto); <1 = interpolación temporal (webcam). */
  smoothing: number;
}

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
 * Rig de foto/webcam: lentes anclados a la cabeza detectada.
 *  - rotación: facialTransformationMatrix (pose de cabeza)
 *  - posición: landmark 168 (raíz nasal), en px del overlay
 *  - escala px→mm: DIP calibrada (iris 468/473) o ancho bitemporal asumido
 */
export function Glasses({ faceRef, spec, color, fit, smoothing }: GlassesProps) {
  const outer = useRef<THREE.Group>(null);
  const { size } = useThree();

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

    // Posición de la raíz nasal en px del overlay (origen al centro, +y arriba).
    tmpPos.set((anchor.x - 0.5) * W, (0.5 - anchor.y) * H, 0);

    const dipMm = useAppStore.getState().dipMm;
    const s = pxPerMm(lm, W, H, dipMm) * fit.scale;

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
      g.scale.lerp(tmpScale.set(s, s, s), a);
    }
  });

  return (
    <group ref={outer} visible={false}>
      <GlassesModel spec={spec} color={color} fit={fit} />
    </group>
  );
}
