import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

/** Mensajes entre el hilo principal y el worker de detección. */

export interface InitMessage {
  type: 'init';
  modelPath: string;
}

export interface DetectMessage {
  type: 'detect';
  bitmap: ImageBitmap;
  ts: number;
}

export type WorkerRequest = InitMessage | DetectMessage;

export type WorkerResponse =
  | { type: 'ready' }
  | { type: 'error'; message: string }
  | { type: 'result'; ts: number; landmarks: NormalizedLandmark[] | null; matrix: number[] | null };
