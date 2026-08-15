import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

/** Landmarks clave para el anclaje (índices del FaceLandmarker de 478 puntos). */
export const LM = {
  NOSE_BRIDGE: 168,
  RIGHT_EYE_OUTER: 33, // derecha de la persona = izquierda de la imagen
  LEFT_EYE_OUTER: 263,
  RIGHT_TEMPLE: 127,
  LEFT_TEMPLE: 356,
} as const;

/**
 * Resultado de una detección, común a foto y webcam.
 * `matrix` es la facialTransformationMatrix (4x4 column-major, unidades en cm)
 * que lleva el modelo canónico de cara al espacio de cámara.
 */
export interface FaceFrame {
  landmarks: NormalizedLandmark[];
  matrix: number[] | null;
  timestampMs: number;
}

/**
 * Abstracción de la fuente de cabeza (Nivel 3-ready): hoy es "media + landmarks",
 * mañana puede ser un GLB escaneado. Los lentes solo dependen de esta interfaz.
 */
export interface HeadModel {
  kind: 'landmarks'; // futuro: 'scanned-mesh'
  frame: FaceFrame | null;
}
