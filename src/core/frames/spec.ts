import type { FrameColor } from '../color/palette';

/** Punto 2D genérico (mm o normalizado según contexto). */
export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Nodo de bezier cúbico del contorno del lente, en coordenadas normalizadas
 * (caja unidad [-0.5, 0.5]²): `p` ancla, `cIn`/`cOut` manijas absolutas.
 */
export interface BezierPoint {
  p: [number, number];
  cIn: [number, number];
  cOut: [number, number];
}

export type BridgeStyle = 'keyhole' | 'saddle' | 'doubleBar';
export type FrameMaterial = 'acetate' | 'metal' | 'combi';

/**
 * Especificación completa de un armazón procedural (SPEC §3.2).
 * `lensPath` es el contorno de UN lente (el derecho de la persona),
 * normalizado; las medidas en mm lo escalan al construir la geometría.
 */
export interface FrameSpec {
  id: string;
  name: string;
  description: string;
  lensPath: BezierPoint[];
  /** Calibre (ancho de lente), mm. Rango de Ana: 50–54. */
  lensWidthMm: number;
  bridgeMm: number;
  lensHeightMm: number;
  /** 0–1, elevación cat-eye de la esquina exterior-superior. */
  outerLift: number;
  rimThicknessMm: number;
  /** Profundidad de extrusión del frente (eje Z), mm. */
  rimDepthMm: number;
  bridgeStyle: BridgeStyle;
  material: FrameMaterial;
  /** Color activo; en runtime lo asigna la selección del ColorPicker. */
  color?: FrameColor;
  templeStyle: 'standard';
  /** Barra superior gruesa estilo browline (aro inferior fino en metal). */
  browline?: boolean;
}

/** Elevación máxima del lift exterior cuando outerLift = 1, en mm. */
export const OUTER_LIFT_MAX_MM = 5;

/** Ancho total del frente (aro a aro), mm. */
export function totalFrontWidth(spec: FrameSpec): number {
  return 2 * spec.lensWidthMm + spec.bridgeMm + 2 * spec.rimThicknessMm;
}
