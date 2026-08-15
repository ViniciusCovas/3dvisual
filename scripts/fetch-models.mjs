// Descarga el modelo face_landmarker.task a public/models/ para que la app
// funcione sin red (el runtime WASM de MediaPipe se empaqueta desde
// node_modules, no necesita descarga). Corre en postinstall; es idempotente
// y no falla la instalación si no hay red.
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modelsDir = path.join(root, 'public', 'models');
const taskDst = path.join(modelsDir, 'face_landmarker.task');
const TASK_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

await mkdir(modelsDir, { recursive: true });

const readmePath = path.join(modelsDir, 'README.md');
if (!existsSync(readmePath)) {
  await writeFile(
    readmePath,
    '# Modelos de MediaPipe\n\n' +
      '`face_landmarker.task` se descarga aquí con `npm install` (scripts/fetch-models.mjs) ' +
      'para que la app funcione 100% offline. Si falta, la app avisa en consola y usa el CDN.\n',
  );
}

let haveTask = false;
try {
  const s = await stat(taskDst);
  haveTask = s.size > 1_000_000; // el modelo real pesa ~3.7 MB
} catch {
  haveTask = false;
}

if (haveTask) {
  console.log('[models] face_landmarker.task ya está en disco, no se descarga de nuevo');
} else {
  try {
    console.log('[models] Descargando face_landmarker.task …');
    const res = await fetch(TASK_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(taskDst, buf);
    console.log(`[models] face_landmarker.task descargado (${(buf.length / 1e6).toFixed(1)} MB)`);
  } catch (err) {
    console.warn(
      `[models] No se pudo descargar face_landmarker.task (${err?.message ?? err}). ` +
        'La app usará el CDN de MediaPipe en el primer arranque; reintenta con: node scripts/fetch-models.mjs',
    );
  }
}
