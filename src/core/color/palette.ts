export type ColorRating = 'excelente' | 'muyBueno' | 'posible' | 'evitar';
export type FrameFinish = 'gloss' | 'translucent' | 'matte' | 'metal';

/** Color de armazón con su clasificación de colorimetría (SPEC §3.3). */
export interface FrameColor {
  id: string;
  name: string;
  hex: string;
  finish: FrameFinish;
  rating: ColorRating;
  note: string;
}

export const RATING_LABEL: Record<ColorRating, string> = {
  excelente: 'Excelente',
  muyBueno: 'Muy bueno',
  posible: 'Posible',
  evitar: 'Evitar',
};

export const RATING_ORDER: ColorRating[] = ['excelente', 'muyBueno', 'posible', 'evitar'];
