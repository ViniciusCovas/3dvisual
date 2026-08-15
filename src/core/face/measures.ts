import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { LM } from './types';

/**
 * Distancia 3D entre dos landmarks en px del media mostrado. La z de MediaPipe
 * viene normalizada por el ancho de imagen (igual que x), así que la medida es
 * estable frente a giros de cabeza (yaw no la encoge).
 */
export function dist3Px(
  landmarks: NormalizedLandmark[],
  i: number,
  j: number,
  width: number,
  height: number,
): number {
  const a = landmarks[i];
  const b = landmarks[j];
  const dx = (a.x - b.x) * width;
  const dy = (a.y - b.y) * height;
  const dz = (a.z - b.z) * width;
  return Math.hypot(dx, dy, dz);
}

/** Ancho interpupilar en px (centros de iris 468/473). */
export function interpupillaryPx(
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
): number {
  return dist3Px(landmarks, LM.RIGHT_IRIS, LM.LEFT_IRIS, width, height);
}

/** Ancho bitemporal en px (sienes 127/356). */
export function bitemporalPx(
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
): number {
  return dist3Px(landmarks, LM.RIGHT_TEMPLE, LM.LEFT_TEMPLE, width, height);
}

/** Ancho bitemporal asumido cuando no hay DIP calibrada, mm (cabeza adulta). */
export const DEFAULT_BITEMPORAL_MM = 140;

/**
 * Factor px→mm: con DIP calibrada usa el ancho interpupilar real; sin ella,
 * asume un ancho bitemporal típico (aproximado — la UI debe comunicarlo).
 */
export function pxPerMm(
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  dipMm: number | null,
): number {
  if (dipMm && dipMm > 40 && dipMm < 85) {
    return interpupillaryPx(landmarks, width, height) / dipMm;
  }
  return bitemporalPx(landmarks, width, height) / DEFAULT_BITEMPORAL_MM;
}
