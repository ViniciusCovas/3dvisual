import * as THREE from 'three';
import type { FrameSpec, Vec2 } from './spec';
import { innermostPoint, offsetOutline, outermostPoint, sampleLensOutline } from './outline';

export interface FrameGeometries {
  /** Aros izquierdo y derecho (con hueco para el lente). */
  rims: THREE.BufferGeometry[];
  /** Lentes translúcidos. */
  lenses: THREE.BufferGeometry[];
  /** Puente(s). */
  bridges: THREE.BufferGeometry[];
  /** Patillas (se posicionan/rotan vía sus propias matrices ya aplicadas). */
  temples: THREE.BufferGeometry[];
  /** Centro del lente derecho en x (mm), útil para depurar. */
  rightLensCenterX: number;
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
  const inner = sampleLensOutline(spec);
  const outer = offsetOutline(inner, spec.rimThickness);
  const rightCenterX = spec.bridge / 2 + spec.rimThickness + spec.lensWidth / 2;

  const rims: THREE.BufferGeometry[] = [];
  const lenses: THREE.BufferGeometry[] = [];
  const temples: THREE.BufferGeometry[] = [];

  const extrudeOpts: THREE.ExtrudeGeometryOptions = {
    depth: spec.depth,
    bevelEnabled: true,
    bevelThickness: 0.4,
    bevelSize: 0.35,
    bevelSegments: 2,
    steps: 1,
  };

  for (const side of [1, -1] as const) {
    const innerSide = side === 1 ? translate(inner, rightCenterX) : translate(mirrorX(inner), -rightCenterX);
    const outerSide = side === 1 ? translate(outer, rightCenterX) : translate(mirrorX(outer), -rightCenterX);

    const rimShape = shapeFromPoints(outerSide);
    rimShape.holes.push(pathFromPoints([...innerSide].reverse()));
    const rim = new THREE.ExtrudeGeometry(rimShape, extrudeOpts);
    rim.translate(0, 0, -spec.depth / 2);
    rims.push(rim);

    const lens = new THREE.ExtrudeGeometry(shapeFromPoints(innerSide), {
      depth: LENS_DEPTH,
      bevelEnabled: false,
    });
    lens.translate(0, 0, -LENS_DEPTH / 2);
    lenses.push(lens);

    // Patilla: caja desde la bisagra (punto exterior del aro) hacia atrás (-z),
    // con una leve apertura hacia afuera.
    const hinge = outermostPoint(outerSide.map((p) => ({ x: side === 1 ? p.x : -p.x, y: p.y })));
    const hingeX = side * hinge.x;
    const hingeY = Math.min(hinge.y + 4, spec.lensHeight * 0.35);
    const temple = new THREE.BoxGeometry(spec.rimThickness * 0.9, TEMPLE_HEIGHT, TEMPLE_LENGTH);
    const m = new THREE.Matrix4()
      .makeRotationY(side * THREE.MathUtils.degToRad(-4)) // leve apertura
      .setPosition(hingeX, hingeY, -TEMPLE_LENGTH / 2 - spec.depth / 2);
    temple.applyMatrix4(m);
    temples.push(temple);
  }

  // Puente: conecta los bordes interiores en la zona alta de los lentes.
  const innerRight = translate(inner, rightCenterX);
  const innerEdge = innermostPoint(innerRight);
  const bridgeSpan = innerEdge.x * 2 + 2; // solape de 1 mm por lado dentro de cada aro
  const bridgeY = spec.lensHeight * 0.28;
  const bridges: THREE.BufferGeometry[] = [];

  const mainBridge = new THREE.BoxGeometry(bridgeSpan, 4, spec.depth * 0.9);
  mainBridge.translate(0, bridgeY, 0);
  bridges.push(mainBridge);

  if (spec.doubleBridge) {
    const upperBar = new THREE.BoxGeometry(bridgeSpan + 6, 2.2, spec.depth * 0.6);
    upperBar.translate(0, bridgeY + 6, 0);
    bridges.push(upperBar);
  }

  return { rims, lenses, bridges, temples, rightLensCenterX: rightCenterX };
}
