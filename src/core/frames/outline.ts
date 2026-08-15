import type { FrameSpec, OutlineParams, Vec2 } from './spec';

/**
 * Genera el contorno cerrado del lente DERECHO (el de la derecha de la persona,
 * a la izquierda de la imagen) como puntos 2D en mm, centrado en (0,0).
 * Convención: +x hacia la sien derecha de la persona, +y hacia arriba.
 * El contorno se recorre en sentido antihorario (CCW), como exige THREE.Shape.
 */
export function sampleLensOutline(spec: FrameSpec, segments = 96): Vec2[] {
  const a = spec.lensWidth / 2;
  const b = spec.lensHeight / 2;
  const p = spec.outline;
  const pts: Vec2[] = [];

  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2; // 0 = +x (lado exterior), CCW
    const cos = Math.cos(t);
    const sin = Math.sin(t);
    const upper = sin >= 0;

    // Superelipse: |x/a|^n + |y/b|^n = 1, exponente distinto por mitad.
    let n = upper ? p.topSquareness : p.bottomSquareness;
    if (!upper && p.pantoRound > 0) {
      // Panto: el cuadrante inferior tiende a circular (n → 2).
      n = n + (2 - n) * clamp01(p.pantoRound);
    }
    let x = Math.sign(cos) * a * Math.abs(cos) ** (2 / n);
    let y = Math.sign(sin) * b * Math.abs(sin) ** (2 / n);

    // Lift exterior: eleva suavemente la zona superior-exterior (cat-eye sutil).
    if (p.outerLift !== 0 && upper) {
      const w = smoothstep(clamp01(x / a)); // solo del centro hacia afuera
      y += p.outerLift * w;
    }
    // Taper inferior: mete la esquina inferior-exterior (wayfarer/navigator).
    if (p.bottomTaper !== 0 && !upper) {
      const w = smoothstep(clamp01(x / a));
      x -= p.bottomTaper * w;
    }
    pts.push({ x, y });
  }
  return pts;
}

/**
 * Desplaza un contorno cerrado hacia afuera por `distance` mm usando la normal
 * promedio de cada vértice. Suficientemente robusto para contornos convexos
 * suaves como los lentes (no hace falta un offset poligonal general).
 */
export function offsetOutline(points: Vec2[], distance: number): Vec2[] {
  const n = points.length;
  const out: Vec2[] = [];
  const cx = points.reduce((s, q) => s + q.x, 0) / n;
  const cy = points.reduce((s, q) => s + q.y, 0) / n;

  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];
    // Normal perpendicular a la tangente (curva CCW ⇒ (ty, -tx) apunta afuera).
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const len = Math.hypot(tx, ty) || 1;
    let nx = ty / len;
    let ny = -tx / len;
    // Garantiza que la normal apunte lejos del centroide.
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

/** Punto del contorno con x máxima (lado exterior, para la bisagra de la patilla). */
export function outermostPoint(points: Vec2[]): Vec2 {
  return points.reduce((best, q) => (q.x > best.x ? q : best), points[0]);
}

/** Punto del contorno con x mínima (lado interior, para el puente). */
export function innermostPoint(points: Vec2[]): Vec2 {
  return points.reduce((best, q) => (q.x < best.x ? q : best), points[0]);
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

export type { OutlineParams };
