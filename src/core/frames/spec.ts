/** Punto 2D en el plano del lente (mm, origen en el centro del lente derecho). */
export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Parámetros del contorno del lente. El contorno final es una curva cerrada
 * (superelipse asimétrica + modificadores) muestreada como puntos 2D — ver
 * `outline.ts`. Los exponentes controlan cuán "cuadrada" es cada mitad.
 */
export interface OutlineParams {
  /** Exponente superelipse de la mitad superior (2 = elipse, 4+ = cuadrado suavizado). */
  topSquareness: number;
  /** Exponente superelipse de la mitad inferior. */
  bottomSquareness: number;
  /** Elevación de la esquina exterior-superior en mm (cat-eye / lift). */
  outerLift: number;
  /** Caída de la esquina exterior-inferior en mm (wayfarer/navigator: base más angosta). */
  bottomTaper: number;
  /** Redondeo extra del cuadrante inferior (panto). 0 = sin efecto. */
  pantoRound: number;
}

export type FrameFinish = 'gloss' | 'translucent' | 'matte' | 'metal';

/**
 * Especificación completa de un armazón procedural. Todas las medidas en mm,
 * siguiendo la nomenclatura óptica: calibre (ancho de lente), puente, altura.
 */
export interface FrameSpec {
  id: string;
  name: string;
  description: string;
  /** Ancho del lente (calibre), mm. Rango típico de Ana: 50–54. */
  lensWidth: number;
  /** Altura del lente, mm. Rango típico: 40–44. */
  lensHeight: number;
  /** Puente, mm. Rango típico: 16–19. */
  bridge: number;
  /** Grosor del aro alrededor del lente, mm. */
  rimThickness: number;
  /** Profundidad de extrusión del frente, mm. */
  depth: number;
  /** Doble puente estilo navigator/aviator. */
  doubleBridge: boolean;
  outline: OutlineParams;
}

/** Ancho total del frente (aro a aro), mm. */
export function totalFrontWidth(spec: FrameSpec): number {
  return 2 * spec.lensWidth + spec.bridge + 2 * spec.rimThickness;
}
