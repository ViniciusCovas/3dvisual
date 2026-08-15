# SPEC — Espejo Digital: try-on de lentes, colorimetría y ropa

## 1. Objetivo

Permitir que Ana (y cualquier usuaria) pruebe virtualmente, sobre su propio rostro:

1. **Lentes**: geometría, tamaño, grosor, material y color, con anclaje realista a la pose de la cabeza.
2. **Colorimetría**: qué colores armonizan cerca de su rostro (draping digital) y en el armazón.
3. **Ropa**: recolorear la prenda superior en la imagen para evaluar paletas.

Todo local en el navegador. Entrada: foto subida o webcam. Salida: vista comparativa + export de capturas.

## 2. Usuarios y modos

- **Modo Foto** (principal): subir 1+ fotos frontales; el try-on se aplica sobre la foto congelada. Es el modo de decisión de compra.
- **Modo Espejo** (webcam): try-on en vivo con seguimiento de cabeza.
- **Modo Comparador**: grid 2×2 con la misma foto y 4 configuraciones distintas de lentes/color, para decidir lado a lado.

## 3. Módulos

### 3.1 Face tracking (`core/face`)
- `FaceLandmarker` de @mediapipe/tasks-vision con `outputFacialTransformationMatrixes: true`.
- Exponer: 478 landmarks normalizados, matriz de transformación 4×4, ancho interpupilar y ancho bitemporal en px.
- Landmarks clave: 168 (raíz nasal, anclaje del puente), 33/263 (canthus externos), 127/356 (sienes), 6 (dorso nasal), 152 (mentón).
- Calibración de escala: el usuario puede introducir su DIP real en mm (opcional) para convertir px→mm y mostrar medidas estimadas del armazón.

### 3.2 Armazones procedurales (`core/frames`)
```ts
type FrameSpec = {
  id: string;
  name: string;                 // "Cuadrado suavizado lift"
  lensPath: BezierPoint[];      // contorno de UN lente, normalizado
  lensWidthMm: number;          // calibre
  bridgeMm: number;
  lensHeightMm: number;
  outerLift: number;            // 0–1, elevación cat-eye
  rimThicknessMm: number;       // grosor frontal
  rimDepthMm: number;           // profundidad (eje Z)
  bridgeStyle: 'keyhole' | 'saddle' | 'doubleBar';
  material: 'acetate' | 'metal' | 'combi';
  color: FrameColor;            // ver 3.3
  templeStyle: 'standard';
};
```
- Generación: contorno → `THREE.Shape` → `ExtrudeGeometry` para el aro; puente y varillas como geometrías paramétricas; lente como plano translúcido con leve reflejo.
- Material acetato translúcido: `MeshPhysicalMaterial` con `transmission` bajo + `roughness` media; metal: `metalness` alto.
- Seed: las 5 geometrías del análisis (cuadrado suavizado lift, panto grande, cat-eye sutil, wayfarer amplio, navigator doble puente) + 5 "de control" para comparar (rectangular estrecho, redondo pequeño, rimless, browline, aviador lágrima).

### 3.3 Colorimetría (`core/color`)
- **Paleta de armazón** (seed): carey oscuro translúcido, espresso, chocolate, borgoña, vino, verde botella, verde oliva, azul marino, negro translúcido, negro opaco, carey clásico, carey claro, camel, crystal, gris, gunmetal, plata, oro, rose gold, beige, champagne, azul translúcido claro — cada una con etiqueta `excelente | muyBueno | posible | evitar` y nota.
- **Draping digital**: panel de color sólido renderizado bajo el mentón (como tela de colorimetrista), con ciclo por paletas de estación; slider A/B para comparar dos colores en mitades de pantalla.
- **Aviso de fiabilidad**: banner permanente de que el balance de blancos de la foto altera la percepción; ofrecer corrección gris-neutro manual (clic en un área blanca/gris de la foto para normalizar).

### 3.4 Ropa (M3, `core/segment`)
- `ImageSegmenter` (selfie multiclass) para máscara de prenda superior.
- Recolor por transferencia de matiz/saturación conservando luminancia (no pintar plano encima).
- Paleta de ropa ligada a la misma clasificación de colorimetría.

### 3.5 Nivel 3 — cabeza 3D real (M4)
- Cargar GLB/OBJ escaneado (Polycam, Luma AI, Scaniverse, KeenTools FaceBuilder).
- Visor orbital (drei `OrbitControls` + `Stage`); detección semiautomática de puntos de anclaje (usuario marca sienes y raíz nasal sobre el mesh una vez; se guarda en un JSON exportable, los artifacts/apps no dependen de storage del navegador para datos críticos).
- Los mismos `FrameSpec` se montan sobre el mesh.

## 4. UI

- Layout: canvas central grande; columna derecha con tabs **Lentes / Color / Ropa**; barra inferior con thumbnails de fotos cargadas.
- `FitControls`: sliders de ajuste fino (escala ±10%, altura vertical, ancho de varillas, inclinación pantoscópica) porque el auto-fit nunca es perfecto.
- Botón **Capturar** → PNG con la config estampada (nombre de forma, color, medidas estimadas).
- Botón **Comparar** → grid 2×2.
- Estética: limpia, fondo neutro cálido, tipografía editorial; el rostro es el protagonista.

## 5. Milestones y aceptación

**M0 — Esqueleto + tracking (½ día)**
- Vite+React+TS corriendo; subir foto; FaceLandmarker detecta y dibuja malla de landmarks superpuesta.
- ✅ Acepto si: al subir cualquier foto frontal aparece la malla alineada al rostro en <2 s.

**M1 — Lentes sobre foto (1 día)**
- Generador procedural con las 10 geometrías seed; anclaje por matriz; selector de forma y color; FitControls.
- ✅ Acepto si: en una foto en tres cuartos los lentes siguen la rotación de la cabeza sin flotar, y cambiar de forma/color tarda <100 ms.

**M2 — Modo Espejo (½ día)**
- Webcam en vivo con el mismo pipeline; oclusión básica (las varillas se ocultan tras la cabeza usando un occluder mesh de la cara).
- ✅ Acepto si: a 30 fps en laptop, girar la cabeza ±30° mantiene el anclaje.

**M3 — Colorimetría + ropa (1 día)**
- Draping A/B, corrección de balance de blancos, recolor de prenda.
- ✅ Acepto si: puedo comparar borgoña vs beige en draping en mitades y recolorear la camiseta a verde botella de forma creíble.

**M4 — Cabeza 3D real (opcional, 1 día)**
- Import GLB + visor orbital + montaje de lentes sobre el mesh.
- ✅ Acepto si: un escaneo de Polycam carga y los lentes seed se ven correctos en órbita 360°.

## 6. Fuera de alcance (v1)

- Fotorrealismo de reflejos/sombras proyectadas del armazón sobre la piel.
- Maquillaje/peinado virtual.
- Cualquier upload a servidores.
- Recomendador automático de forma de rostro (el análisis experto ya existe como documento; la app es para *ver*, no para diagnosticar).

## 7. Riesgos conocidos

- MediaPipe WASM: servir los `.task` desde `public/models/` para evitar CORS/latencia.
- La escala px→mm sin DIP calibrada es aproximada: comunicarlo en la UI.
- Fotos con sonrisa amplia elevan pómulos y engañan el fit vertical: recomendar foto con expresión neutra para decidir tamaño.
