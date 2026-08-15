import type { FrameFinish } from '../frames/spec';

export type ColorRating = 'excelente' | 'muy_bueno' | 'posible' | 'evitar';

export interface FrameColor {
  id: string;
  name: string;
  hex: string;
  finish: FrameFinish;
  rating: ColorRating;
}

export const RATING_LABEL: Record<ColorRating, string> = {
  excelente: 'Excelente',
  muy_bueno: 'Muy bueno',
  posible: 'Posible',
  evitar: 'Evitar',
};

export const RATING_ORDER: ColorRating[] = ['excelente', 'muy_bueno', 'posible', 'evitar'];
