import * as THREE from 'three';
import type { FrameFinish } from './spec';

export interface FrameMaterials {
  frame: THREE.Material;
  lens: THREE.Material;
}

/**
 * Materiales del armazón según el acabado del color elegido.
 * Acetato brillante por defecto; translúcido para careys/cristal; metal para
 * navigator y similares.
 */
export function buildMaterials(hex: string, finish: FrameFinish): FrameMaterials {
  const color = new THREE.Color(hex);
  let frame: THREE.Material;
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
    case 'metal':
      frame = new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.9 });
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

  const lens = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#9db4c4'),
    transparent: true,
    opacity: 0.14,
    roughness: 0.05,
    depthWrite: false,
  });

  return { frame, lens };
}
