import * as THREE from 'three';
import type { FrameFinish } from '../color/palette';
import type { FrameMaterial } from './spec';

export interface FrameMaterials {
  /** Material principal del frente (acetato o metal según el spec). */
  frame: THREE.Material;
  /** Lente translúcido con leve reflejo. */
  lens: THREE.Material;
  /** Acento metálico fijo (gunmetal) para armazones combi/browline. */
  accent: THREE.Material;
}

/**
 * Materiales del armazón: el acabado viene del color elegido y el tipo de
 * material del FrameSpec (un spec 'metal' siempre renderiza metálico aunque
 * el color sea de acetato).
 */
export function buildMaterials(
  hex: string,
  finish: FrameFinish,
  material: FrameMaterial,
): FrameMaterials {
  const color = new THREE.Color(hex);

  let frame: THREE.Material;
  if (material === 'metal' || finish === 'metal') {
    frame = new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.9 });
  } else {
    switch (finish) {
      case 'translucent':
        frame = new THREE.MeshPhysicalMaterial({
          color,
          roughness: 0.2,
          clearcoat: 1,
          clearcoatRoughness: 0.15,
          transparent: true,
          opacity: 0.82,
        });
        break;
      case 'matte':
        frame = new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05 });
        break;
      case 'gloss':
      default:
        frame = new THREE.MeshPhysicalMaterial({
          color,
          roughness: 0.22,
          clearcoat: 1,
          clearcoatRoughness: 0.1,
        });
        break;
    }
  }

  const lens = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#9db4c4'),
    transparent: true,
    opacity: 0.14,
    roughness: 0.05,
    depthWrite: false,
  });

  const accent = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#6b7078'),
    roughness: 0.3,
    metalness: 0.9,
  });

  return { frame, lens, accent };
}
