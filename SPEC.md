# SPEC — Espejo Digital

Detalle funcional y criterios de aceptación por milestone. Ver `CLAUDE.md` para stack y principios de arquitectura.

## M1 — Try-on de lentes sobre foto y webcam

**Objetivo:** pipeline completo de detección facial + armazones procedurales anclados a la cabeza, funcionando igual sobre una foto subida y sobre la webcam en vivo.

### Alcance

- Carga de foto local (nunca sale del navegador) y modo webcam (`getUserMedia`).
- `FaceLandmarker` de MediaPipe con `facialTransformationMatrixes` activado; modelos servidos desde `public/models/` (descargados en `npm install`).
- Generador procedural de armazones desde `FrameSpec`: contorno 2D del lente → aro extruido + lente translúcido + puente + patillas.
- Las 5 geometrías del análisis de Ana en `frames.seed.json`, seleccionables desde `FramePicker` (con preview del contorno).
- Paleta de colores clasificada en `colors.seed.json`, seleccionable desde `ColorPicker` con la clasificación visible (excelente / muy bueno / posible / evitar).
- `FitControls`: sliders de tamaño, altura y ancho para ajuste fino.
- Anclaje: rotación desde `facialTransformationMatrix`; posición en el puente nasal (landmark 168); escala por distancia 3D entre sienes (127/356). Suavizado temporal en modo webcam.
- Espejado en modo webcam (comportamiento de espejo), aplicado al contenedor completo para que video y overlay queden siempre consistentes.

### Criterios de aceptación (verificar en el navegador)

1. `npm run dev` levanta la app sin errores; `npm run build` y `npm run typecheck` pasan.
2. Al subir una foto frontal con un rostro, los lentes aparecen puestos sobre el rostro en < 2 s.
3. En modo webcam, los lentes siguen la cabeza en tiempo real (≥ 20 fps en un portátil normal) sin "flotar": al girar la cabeza (yaw/pitch/roll) los lentes rotan con ella.
4. Cambiar de geometría y de color se refleja al instante sin re-detectar el rostro.
5. Los sliders de ajuste modifican escala/altura/ancho en vivo.
6. Ninguna petición de red sale del origen local salvo (como máximo) la primera descarga de modelos si `public/models/` está vacío.

## M2 — Colorimetría (draping)

**Objetivo:** módulo de análisis de color personal: paños virtuales bajo el rostro, comparación A/B de paletas, detección asistida de subtono.

- Draping: semicírculo de color bajo el mentón (usando el óvalo facial de los landmarks) con paletas estacionales.
- Vista comparativa: misma foto con dos paños lado a lado.
- Análisis de subtono asistido: muestreo de piel (frente/mejillas/cuello vía landmarks), sugerencia cálido/frío/neutro con explicación.
- Clasificar la paleta de armazones automáticamente según el resultado.

**Aceptación:** draping en vivo sobre foto y webcam; comparación A/B; sugerencia de subtono reproducible sobre la misma foto.

## M3 — Ropa (recolor por segmentación)

**Objetivo:** recolorear la ropa visible usando `ImageSegmenter` (categoría "clothes") para probar colores de prenda sin cambiar de ropa.

- `ImageSegmenter` wrapper en `core/segment/` con el mismo pipeline foto/webcam.
- Recolor con preservación de luminancia (cambiar tono/saturación, mantener sombras y arrugas).
- Combinable con draping y lentes en la misma vista.

**Aceptación:** recolor de prenda estable en foto y webcam, sin "sangrado" notable sobre piel o pelo; todo el procesamiento sigue siendo local.

## Nivel 3 (futuro) — Cabeza 3D escaneada

`HeadModel` pasa de "foto + landmarks" a un GLB escaneado (Polycam/Luma). Los lentes ya están desacoplados del modo foto: solo cambia la fuente del anclaje (malla 3D en lugar de matriz estimada).
