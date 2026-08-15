import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

/** Landmarks clave para anclaje y medidas (índices del FaceLandmarker de 478 puntos). */
export const LM = {
  /** Raíz nasal: anclaje del puente del armazón. */
  NOSE_BRIDGE: 168,
  /** Dorso nasal, algo más abajo que la raíz. */
  NOSE_DORSUM: 6,
  /** Canthus externos (derecha de la persona = izquierda de la imagen). */
  RIGHT_EYE_OUTER: 33,
  LEFT_EYE_OUTER: 263,
  /** Sienes: ancho bitemporal. */
  RIGHT_TEMPLE: 127,
  LEFT_TEMPLE: 356,
  /** Mentón. */
  CHIN: 152,
  /** Centros de iris (el modelo de 478 puntos incluye iris: 468–477). */
  RIGHT_IRIS: 468,
  LEFT_IRIS: 473,
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
