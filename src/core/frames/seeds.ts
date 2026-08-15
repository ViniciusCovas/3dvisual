import framesSeed from '../../data/frames.seed.json';
import { buildLensPath, type OutlineParams } from './outline';
import type { BridgeStyle, FrameMaterial, FrameSpec } from './spec';

export type FrameGroup = 'recomendada' | 'control' | 'rayban';

/** Entrada del seed JSON: parámetros de autoría en lugar de bezier crudos. */
interface SeedFrame {
  id: string;
  name: string;
  description: string;
  group: FrameGroup;
  lensWidthMm: number;
  bridgeMm: number;
  lensHeightMm: number;
  outerLift: number;
  rimThicknessMm: number;
  rimDepthMm: number;
  bridgeStyle: BridgeStyle;
  material: FrameMaterial;
  browline?: boolean;
  outline: OutlineParams;
}

export interface SeedGroupedFrame extends FrameSpec {
  group: FrameGroup;
}

/**
 * Materializa los seeds como FrameSpec (SPEC §3.2): el contorno paramétrico
 * del JSON se convierte en `lensPath` (bezier cúbicos) una sola vez al cargar.
 */
export const FRAMES: SeedGroupedFrame[] = (framesSeed as SeedFrame[]).map((seed) => ({
  id: seed.id,
  name: seed.name,
  description: seed.description,
  group: seed.group,
  lensPath: buildLensPath(seed.outline),
  lensWidthMm: seed.lensWidthMm,
  bridgeMm: seed.bridgeMm,
  lensHeightMm: seed.lensHeightMm,
  outerLift: seed.outerLift,
  rimThicknessMm: seed.rimThicknessMm,
  rimDepthMm: seed.rimDepthMm,
  bridgeStyle: seed.bridgeStyle,
  material: seed.material,
  templeStyle: 'standard',
  browline: seed.browline,
}));
