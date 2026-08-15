import { OUTER_LIFT_MAX_MM, type BezierPoint, type FrameSpec, type Vec2 } from './spec';

/**
 * Parámetros de autoría del contorno. Los seeds describen la forma con estos
 * parámetros y `buildLensPath` los materializa como bezier cúbicos
 * (`FrameSpec.lensPath`): una sola fuente de verdad editable a mano en el
 * JSON, y el tipo de FrameSpec que pide SPEC §3.2.
 */
export interface OutlineParams {
  /** Exponente superelipse de la mitad superior (2 = elipse, 4+ = cuadrado suavizado). */
  top: number;
  /** Exponente superelipse de la mitad inferior. */
  bottom: number;
  /** Estrechamiento de la esquina inferior-exterior (fracción del ancho, wayfarer). */
  taper?: number;
  /** Redondeo extra del cuadrante inferior hacia circular (panto), 0–1. */
  panto?: number;
  /** Caída de lágrima estilo aviador (fracción del ancho), 0–0.3. */
  teardrop?: number;
}

const ANCHORS = 20; // nodos bezier del contorno

/** Contorno base normalizado en la caja [-0.5, 0.5]², sin lift (se aplica al muestrear). */
function basePoint(t: number, p: OutlineParams): Vec2 {
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  const upper = sin >= 0;

  let n = upper ? p.top : p.bottom;
  if (!upper && p.panto) n = n + (2 - n) * clamp01(p.panto);

  let x = Math.sign(cos) * 0.5 * Math.abs(cos) ** (2 / n);
  let y = Math.sign(sin) * 0.5 * Math.abs(sin) ** (2 / n);

  if (!upper && p.taper) {
    // Mete la esquina inferior-exterior (base más angosta).
    x -= p.taper * smoothstep(clamp01(x / 0.5));
  }
  if (!upper && p.teardrop) {
    // Lágrima: el cuadrante inferior cae y se estrecha hacia adentro,
    // más en el lado exterior (aviador clásico).
    const d = p.teardrop;
    x -= d * Math.abs(sin) * (0.35 + 0.65 * clamp01(x / 0.5));
    y -= d * 0.55 * (1 - Math.abs(cos)) * Math.abs(sin);
  }
  return { x, y };
}

/**
 * Materializa el contorno como bezier cúbicos: ancla en N muestras del
 * contorno base y manijas estilo Catmull-Rom (tangente entre vecinos / 6),
 * que dan una curva suave que pasa por todas las anclas.
 */
export function buildLensPath(params: OutlineParams): BezierPoint[] {
  const anchors: Vec2[] = [];
  for (let i = 0; i < ANCHORS; i++) {
    anchors.push(basePoint((i / ANCHORS) * Math.PI * 2, params));
  }
  return anchors.map((a, i) => {
    const prev = anchors[(i - 1 + ANCHORS) % ANCHORS];
    const next = anchors[(i + 1) % ANCHORS];
    const tx = (next.x - prev.x) / 6;
    const ty = (next.y - prev.y) / 6;
    return {
      p: [a.x, a.y],
      cIn: [a.x - tx, a.y - ty],
      cOut: [a.x + tx, a.y + ty],
    } satisfies BezierPoint;
  });
}

/**
 * Muestrea `lensPath` a puntos 2D en mm (contorno cerrado CCW), aplicando la
 * escala calibre×altura y el lift exterior del spec.
 */
export function sampleLensPathMm(spec: FrameSpec, stepsPerSegment = 5): Vec2[] {
  const path = spec.lensPath;
  const out: Vec2[] = [];
  const liftMm = spec.outerLift * OUTER_LIFT_MAX_MM;

  for (let i = 0; i < path.length; i++) {
    const a = path[i];
    const b = path[(i + 1) % path.length];
    for (let s = 0; s < stepsPerSegment; s++) {
      const t = s / stepsPerSegment;
      const nx = cubic(a.p[0], a.cOut[0], b.cIn[0], b.p[0], t);
      const ny = cubic(a.p[1], a.cOut[1], b.cIn[1], b.p[1], t);
      let x = nx * spec.lensWidthMm;
      let y = ny * spec.lensHeightMm;
      if (liftMm > 0 && ny >= 0) {
        y += liftMm * smoothstep(clamp01(nx / 0.5));
      }
      out.push({ x, y });
    }
  }
  return out;
}

/**
 * Desplaza un contorno cerrado hacia afuera por `distance` mm usando la normal
 * promedio de cada vértice. Suficiente para contornos convexos suaves de lentes.
 */
export function offsetOutline(points: Vec2[], distance: number): Vec2[] {
  const n = points.length;
  const out: Vec2[] = [];
  const cx = points.reduce((s, q) => s + q.x, 0) / n;
  const cy = points.reduce((s, q) => s + q.y, 0) / n;

  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const len = Math.hypot(tx, ty) || 1;
    let nx = ty / len;
    let ny = -tx / len;
    const px = points[i].x;
    const py = points[i].y;
    if (nx * (px - cx) + ny * (py - cy) < 0) {
      nx = -nx;
      ny = -ny;
    }
    out.push({ x: px + nx * distance, y: py + ny * distance });
  }
  return out;
}

/** Punto del contorno con x máxima (lado exterior, bisagra de la patilla). */
export function outermostPoint(points: Vec2[]): Vec2 {
  return points.reduce((best, q) => (q.x > best.x ? q : best), points[0]);
}

/** Punto del contorno con x mínima (lado interior, para el puente). */
export function innermostPoint(points: Vec2[]): Vec2 {
  return points.reduce((best, q) => (q.x < best.x ? q : best), points[0]);
}

function cubic(p0: number, c1: number, c2: number, p1: number, t: number): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * c1 + 3 * u * t * t * c2 + t * t * t * p1;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}
