import { create } from 'zustand';
import colorsSeed from '../data/colors.seed.json';
import { FRAMES } from '../core/frames/seeds';
import type { FrameSpec } from '../core/frames/spec';
import type { FrameColor } from '../core/color/palette';

export { FRAMES };
export const COLORS = colorsSeed as FrameColor[];

export type SourceKind = 'photo' | 'webcam' | 'head3d';

/** Armazón desde imagen PNG real (subida por el usuario, nunca sale del navegador). */
export interface CustomFrameImage {
  id: string;
  name: string;
  url: string;
}

export interface FitAdjust {
  /** Escala global ±10% (1 = calculada desde los landmarks). */
  scale: number;
  /** Desplazamiento vertical en mm (positivo = arriba). */
  offsetY: number;
  /** Estirado horizontal del frente (1 = según spec). */
  width: number;
  /** Inclinación pantoscópica en grados (el frente rota hacia las mejillas). */
  tiltDeg: number;
}

export const DEFAULT_FIT: FitAdjust = { scale: 1, offsetY: -2, width: 1, tiltDeg: 6 };

/** Medidas faciales de la última detección, para calibración px→mm. */
export interface FaceMeasures {
  interpupillaryPx: number;
  bitemporalPx: number;
}

interface AppState {
  sourceKind: SourceKind;
  frameId: string;
  colorId: string;
  customFrames: CustomFrameImage[];
  /** Si está seteado, se renderiza la imagen PNG en lugar del armazón procedural. */
  selectedCustomId: string | null;
  fit: FitAdjust;
  /** DIP real de la usuaria en mm (opcional, calibra px→mm). */
  dipMm: number | null;
  /** Malla de landmarks superpuesta (debug, tecla D). */
  debugMesh: boolean;
  faceDetected: boolean;
  measures: FaceMeasures | null;
  trackerStatus: 'loading' | 'ready' | 'error';
  setSourceKind: (kind: SourceKind) => void;
  setFrameId: (id: string) => void;
  setColorId: (id: string) => void;
  addCustomFrame: (frame: CustomFrameImage) => void;
  selectCustomFrame: (id: string) => void;
  setFit: (fit: Partial<FitAdjust>) => void;
  resetFit: () => void;
  setDipMm: (mm: number | null) => void;
  toggleDebugMesh: () => void;
  setFaceDetected: (v: boolean) => void;
  setMeasures: (m: FaceMeasures | null) => void;
  setTrackerStatus: (s: AppState['trackerStatus']) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sourceKind: 'photo',
  frameId: FRAMES[0].id,
  colorId: COLORS[0].id,
  customFrames: [],
  selectedCustomId: null,
  fit: { ...DEFAULT_FIT },
  dipMm: null,
  debugMesh: false,
  faceDetected: false,
  measures: null,
  trackerStatus: 'loading',
  setSourceKind: (sourceKind) => set({ sourceKind }),
  // Elegir un armazón procedural deselecciona la imagen PNG, y viceversa.
  setFrameId: (frameId) => set({ frameId, selectedCustomId: null }),
  setColorId: (colorId) => set({ colorId }),
  addCustomFrame: (frame) =>
    set((s) => ({ customFrames: [...s.customFrames, frame], selectedCustomId: frame.id })),
  selectCustomFrame: (selectedCustomId) => set({ selectedCustomId }),
  setFit: (fit) => set((s) => ({ fit: { ...s.fit, ...fit } })),
  resetFit: () => set({ fit: { ...DEFAULT_FIT } }),
  setDipMm: (dipMm) => set({ dipMm }),
  toggleDebugMesh: () => set((s) => ({ debugMesh: !s.debugMesh })),
  setFaceDetected: (faceDetected) => set({ faceDetected }),
  setMeasures: (measures) => set({ measures }),
  setTrackerStatus: (trackerStatus) => set({ trackerStatus }),
}));

export function selectedFrame(frameId: string): FrameSpec {
  return FRAMES.find((f) => f.id === frameId) ?? FRAMES[0];
}

export function selectedColor(colorId: string): FrameColor {
  return COLORS.find((c) => c.id === colorId) ?? COLORS[0];
}
