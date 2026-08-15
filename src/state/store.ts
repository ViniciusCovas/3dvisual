import { create } from 'zustand';
import framesSeed from '../data/frames.seed.json';
import colorsSeed from '../data/colors.seed.json';
import type { FrameSpec } from '../core/frames/spec';
import type { FrameColor } from '../core/color/palette';

export const FRAMES = framesSeed as FrameSpec[];
export const COLORS = colorsSeed as FrameColor[];

export type SourceKind = 'photo' | 'webcam';

export interface FitAdjust {
  /** Escala global (1 = calculada desde los landmarks). */
  scale: number;
  /** Desplazamiento vertical en mm (positivo = arriba). */
  offsetY: number;
  /** Estirado horizontal del frente (1 = según spec). */
  width: number;
}

export const DEFAULT_FIT: FitAdjust = { scale: 1, offsetY: -2, width: 1 };

interface AppState {
  sourceKind: SourceKind;
  frameId: string;
  colorId: string;
  fit: FitAdjust;
  faceDetected: boolean;
  trackerStatus: 'loading' | 'ready' | 'error';
  setSourceKind: (kind: SourceKind) => void;
  setFrameId: (id: string) => void;
  setColorId: (id: string) => void;
  setFit: (fit: Partial<FitAdjust>) => void;
  resetFit: () => void;
  setFaceDetected: (v: boolean) => void;
  setTrackerStatus: (s: AppState['trackerStatus']) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sourceKind: 'photo',
  frameId: FRAMES[0].id,
  colorId: COLORS[0].id,
  fit: { ...DEFAULT_FIT },
  faceDetected: false,
  trackerStatus: 'loading',
  setSourceKind: (sourceKind) => set({ sourceKind }),
  setFrameId: (frameId) => set({ frameId }),
  setColorId: (colorId) => set({ colorId }),
  setFit: (fit) => set((s) => ({ fit: { ...s.fit, ...fit } })),
  resetFit: () => set({ fit: { ...DEFAULT_FIT } }),
  setFaceDetected: (faceDetected) => set({ faceDetected }),
  setTrackerStatus: (trackerStatus) => set({ trackerStatus }),
}));

export function selectedFrame(frameId: string): FrameSpec {
  return FRAMES.find((f) => f.id === frameId) ?? FRAMES[0];
}

export function selectedColor(colorId: string): FrameColor {
  return COLORS.find((c) => c.id === colorId) ?? COLORS[0];
}
