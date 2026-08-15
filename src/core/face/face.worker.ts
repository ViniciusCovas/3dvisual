/// <reference lib="webworker" />
// Worker de detección facial: el FaceLandmarker vive aquí, con su propio
// contexto GL en otro hilo. Así la inferencia nunca bloquea la UI y no
// compite con el contexto WebGL de three.js en el hilo principal.
import { FaceLandmarker } from '@mediapipe/tasks-vision';
// El runtime WASM se sirve empaquetado desde node_modules: funciona offline y
// evita que el dev server intercepte imports desde /public. El loader va como
// texto (?raw) porque MediaPipe lo carga con importScripts — prohibido en
// module workers — y su fallback ESM no define el global ModuleFactory; lo
// evaluamos nosotros en el scope global del worker antes de crear la tarea.
import wasmLoaderSrc from '@mediapipe/tasks-vision/vision_wasm_internal.js?raw';
import wasmLoaderPath from '@mediapipe/tasks-vision/vision_wasm_internal.js?url';
import wasmBinaryPath from '@mediapipe/tasks-vision/vision_wasm_internal.wasm?url';
import type { InitMessage, WorkerRequest, WorkerResponse } from './protocol';

let landmarker: FaceLandmarker | null = null;

const post = (msg: WorkerResponse) => self.postMessage(msg);

/** GPU se cuelga sobre renderers de software (SwiftShader/llvmpipe); ahí usamos CPU. */
function pickDelegate(): 'GPU' | 'CPU' {
  try {
    const canvas = new OffscreenCanvas(1, 1);
    const gl =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ??
      (canvas.getContext('webgl') as WebGLRenderingContext | null);
    if (!gl) return 'CPU';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(
      ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    );
    return /swiftshader|llvmpipe|software|basic render/i.test(renderer) ? 'CPU' : 'GPU';
  } catch {
    return 'CPU';
  }
}

async function init(msg: InitMessage): Promise<void> {
  try {
    if (!('ModuleFactory' in self)) {
      (0, eval)(wasmLoaderSrc); // eval indirecto: define self.ModuleFactory
    }
    const fileset = { wasmLoaderPath, wasmBinaryPath };
    const delegate = pickDelegate();
    if (delegate === 'CPU') {
      console.warn('[face.worker] Renderer de software detectado; usando delegate CPU.');
    }
    landmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: msg.modelPath, delegate },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFacialTransformationMatrixes: true,
      outputFaceBlendshapes: false,
    });
    post({ type: 'ready' });
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  if (msg.type === 'init') {
    void init(msg);
    return;
  }
  // type === 'detect'
  if (!landmarker) {
    msg.bitmap.close();
    post({ type: 'result', ts: msg.ts, landmarks: null, matrix: null });
    return;
  }
  const result = landmarker.detectForVideo(msg.bitmap, msg.ts);
  msg.bitmap.close();
  const landmarks = result.faceLandmarks?.[0] ?? null;
  const matrixData = result.facialTransformationMatrixes?.[0]?.data;
  post({
    type: 'result',
    ts: msg.ts,
    landmarks: landmarks && landmarks.length > 0 ? landmarks : null,
    matrix: matrixData ? Array.from(matrixData) : null,
  });
};
