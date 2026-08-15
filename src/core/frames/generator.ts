import * as THREE from 'three';
import type { FrameSpec, Vec2 } from './spec';
import { innermostPoint, offsetOutline, outermostPoint, sampleLensPathMm } from './outline';

export interface FrameGeometries {
  /** Aros izquierdo y derecho (con hueco para el lente). */
  rims: THREE.BufferGeometry[];
  /** Lentes translúcidos. */
  lenses: THREE.BufferGeometry[];
  /** Puente(s), según bridgeStyle. */
  bridges: THREE.BufferGeometry[];
  /** Patillas (matrices ya aplicadas). */
  temples: THREE.BufferGeometry[];
  /** Barras browline (vacío si el spec no las lleva). */
  browBars: THREE.BufferGeometry[];
}

const TEMPLE_LENGTH = 110; // mm hacia atrás
const TEMPLE_HEIGHT = 4;
const LENS_DEPTH = 1.2;

function shapeFromPoints(points: Vec2[]): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i].x, points[i].y);
  shape.closePath();
  return shape;
}

function pathFromPoints(points: Vec2[]): THREE.Path {
  const path = new THREE.Path();
  path.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) path.lineTo(points[i].x, points[i].y);
  path.closePath();
  return path;
}

function mirrorX(points: Vec2[]): Vec2[] {
  // Espeja y revierte el orden para conservar el sentido CCW.
  return points.map((p) => ({ x: -p.x, y: p.y })).reverse();
}

function translate(points: Vec2[], dx: number): Vec2[] {
  return points.map((p) => ({ x: p.x + dx, y: p.y }));
}

/**
 * Construye todas las geometrías de un armazón a partir de su FrameSpec.
 * Unidades: milímetros. Origen del grupo: centro del puente, a la altura del
 * centro vertical de los lentes. +x = sien derecha de la persona, +y = arriba,
 * +z = hacia la cámara (las patillas van en -z).
 */
export function buildFrameGeometries(spec: FrameSpec): FrameGeometries {
  const inner = sampleLensPathMm(spec);
  const outer = offsetOutline(inner, spec.rimThicknessMm);
  const rightCenterX = spec.bridgeMm / 2 + spec.rimThicknessMm + spec.lensWidthMm / 2;
  const depth = spec.rimDepthMm;

  const rims: THREE.BufferGeometry[] = [];
  const lenses: THREE.BufferGeometry[] = [];
  const temples: THREE.BufferGeometry[] = [];
  const browBars: THREE.BufferGeometry[] = [];

  const bevel = Math.min(0.4, spec.rimThicknessMm * 0.3);
  const extrudeOpts: THREE.ExtrudeGeometryOptions = {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    steps: 1,
  };

  // Punto superior del contorno interior, para asentar browline y puente alto.
  const topY = inner.reduce((m, q) => Math.max(m, q.y), -Infinity);

  for (const side of [1, -1] as const) {
    const innerSide = side === 1 ? translate(inner, rightCenterX) : translate(mirrorX(inner), -rightCenterX);
    const outerSide = side === 1 ? translate(outer, rightCenterX) : translate(mirrorX(outer), -rightCenterX);

    const rimShape = shapeFromPoints(outerSide);
    rimShape.holes.push(pathFromPoints([...innerSide].reverse()));
    const rim = new THREE.ExtrudeGeometry(rimShape, extrudeOpts);
    rim.translate(0, 0, -depth / 2);
    rims.push(rim);

    const lens = new THREE.ExtrudeGeometry(shapeFromPoints(innerSide), {
      depth: LENS_DEPTH,
      bevelEnabled: false,
    });
    lens.translate(0, 0, -LENS_DEPTH / 2);
    lenses.push(lens);

    // Patilla: caja desde la bisagra (punto exterior del aro) hacia atrás (-z).
    const hinge = outermostPoint(outerSide.map((p) => ({ x: side === 1 ? p.x : -p.x, y: p.y })));
    const hingeX = side * hinge.x;
    const hingeY = Math.min(hinge.y + 4, spec.lensHeightMm * 0.35);
    const temple = new THREE.BoxGeometry(Math.max(spec.rimThicknessMm * 0.9, 1.6), TEMPLE_HEIGHT, TEMPLE_LENGTH);
    const m = new THREE.Matrix4()
      .makeRotationY(side * THREE.MathUtils.degToRad(-4)) // leve apertura
      .setPosition(hingeX, hingeY, -TEMPLE_LENGTH / 2 - depth / 2);
    temple.applyMatrix4(m);
    temples.push(temple);

    // Browline: barra gruesa asentada sobre el borde superior de cada lente.
    if (spec.browline) {
      const barLen = spec.lensWidthMm + spec.rimThicknessMm * 2 + 2;
      const bar = new THREE.BoxGeometry(barLen, 5, depth + 1);
      bar.translate(side * rightCenterX, topY + 1.5, 0);
      browBars.push(bar);
    }
  }

  // Puente(s) según estilo, conectando los bordes interiores.
  const innerRight = translate(inner, rightCenterX);
  const innerEdge = innermostPoint(innerRight);
  const bridgeSpan = innerEdge.x * 2 + 2; // solape de 1 mm por lado dentro de cada aro
  const bridges: THREE.BufferGeometry[] = [];

  switch (spec.bridgeStyle) {
    case 'keyhole': {
      // Ojo de cerradura: barra alta + dos apoyos que bajan junto a cada aro.
      const bar = new THREE.BoxGeometry(bridgeSpan, 3.2, depth * 0.9);
      bar.translate(0, spec.lensHeightMm * 0.3, 0);
      bridges.push(bar);
      for (const side of [1, -1]) {
        const post = new THREE.BoxGeometry(2, 6, depth * 0.9);
        post.translate(side * (bridgeSpan / 2 - 1), spec.lensHeightMm * 0.3 - 4, 0);
        bridges.push(post);
      }
      break;
    }
    case 'doubleBar': {
      const mainBar = new THREE.BoxGeometry(bridgeSpan, 3.5, depth * 0.9);
      mainBar.translate(0, spec.lensHeightMm * 0.22, 0);
      bridges.push(mainBar);
      const upperBar = new THREE.BoxGeometry(bridgeSpan + 6, 2.2, depth * 0.6);
      upperBar.translate(0, topY + 0.5, 0);
      bridges.push(upperBar);
      break;
    }
    case 'saddle':
    default: {
      const bar = new THREE.BoxGeometry(bridgeSpan, 4.5, depth * 0.9);
      bar.translate(0, spec.lensHeightMm * 0.28, 0);
      bridges.push(bar);
      break;
    }
  }

  return { rims, lenses, bridges, temples, browBars };
}
