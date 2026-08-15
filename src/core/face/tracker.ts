import type { FaceFrame } from './types';
import type { WorkerResponse } from './protocol';

const LOCAL_TASK = '/models/face_landmarker.task';
const CDN_TASK =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

async function isLocallyAvailable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Cliente del worker de detección facial. Un solo pipeline para foto y webcam:
 * cualquier fuente se rasteriza a ImageBitmap y pasa por detectForVideo en el
 * worker (la foto estática es un video de un frame).
 * Prefiere los modelos locales de public/models/ y solo cae al CDN si faltan.
 */
export class FaceTracker {
  private worker: Worker;
  private pending = new Map<number, (frame: FaceFrame | null) => void>();
  private lastTs = 0;

  private constructor(worker: Worker) {
    this.worker = worker;
    this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      if (msg.type !== 'result') return;
      const resolve = this.pending.get(msg.ts);
      if (!resolve) return;
      this.pending.delete(msg.ts);
      resolve(
        msg.landmarks
          ? { landmarks: msg.landmarks, matrix: msg.matrix, timestampMs: msg.ts }
          : null,
      );
    };
  }

  static async create(): Promise<FaceTracker> {
    const taskOk = await isLocallyAvailable(LOCAL_TASK);
    if (!taskOk) {
      console.warn(
        '[FaceTracker] Falta public/models/face_landmarker.task; usando el CDN de MediaPipe. ' +
          'Ejecuta `node scripts/fetch-models.mjs` para trabajar offline.',
      );
    }
    const worker = new Worker(new URL('./face.worker.ts', import.meta.url), { type: 'module' });
    await new Promise<void>((resolve, reject) => {
      worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        if (e.data.type === 'ready') resolve();
        else if (e.data.type === 'error') reject(new Error(e.data.message));
      };
      worker.onerror = (e) => reject(new Error(e.message));
      worker.postMessage({ type: 'init', modelPath: taskOk ? LOCAL_TASK : CDN_TASK });
    });
    return new FaceTracker(worker);
  }

  /**
   * Detecta sobre cualquier fuente (video, imagen o canvas). Devuelve null si
   * no hay rostro. Las llamadas se serializan por timestamp monótono, como
   * exige el modo VIDEO de MediaPipe.
   */
  async detect(
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  ): Promise<FaceFrame | null> {
    const bitmap = await createImageBitmap(source);
    const ts = Math.max(performance.now(), this.lastTs + 0.001);
    this.lastTs = ts;
    return new Promise((resolve) => {
      this.pending.set(ts, resolve);
      this.worker.postMessage({ type: 'detect', bitmap, ts }, [bitmap]);
    });
  }

  close(): void {
    this.worker.terminate();
    this.pending.forEach((resolve) => resolve(null));
    this.pending.clear();
  }
}
