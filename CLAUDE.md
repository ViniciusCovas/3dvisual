# CLAUDE.md — Espejo Digital (try-on virtual de rostro)

## Qué es este proyecto

Web app local y privada de "gemela digital" para probar virtualmente **lentes, colores (colorimetría) y ropa** sobre el rostro de una persona real (Ana), usando sus fotos o webcam en vivo. Todo el procesamiento ocurre **100% en el navegador**: ninguna imagen sale de la máquina.

Referencia funcional: el try-on de Warby Parker / Zenni, pero personal, parametrizable y con módulo de colorimetría.

## Stack (no cambiar sin discutirlo)

- **Vite + React 18 + TypeScript**
- **@mediapipe/tasks-vision** → `FaceLandmarker` (478 landmarks + `facialTransformationMatrixes` para pose 3D de cabeza) e `ImageSegmenter` (recolor de ropa, M3)
- **three** + **@react-three/fiber** + **@react-three/drei** para render 3D de armazones
- **zustand** para estado global
- CSS: Tailwind
- Sin backend. Sin llamadas de red salvo la carga inicial de los modelos WASM/task de MediaPipe (cachearlos en `public/models/`).

## Principios de arquitectura

1. **Armazones procedurales, no assets:** cada armazón se genera en Three.js desde un `FrameSpec` (contorno del lente como puntos bezier 2D + parámetros: calibre, puente, altura, lift exterior, grosor, material, color). Así se crean formas y colores infinitos sin modelar GLB.
2. **Anclaje por matriz, no por landmarks sueltos:** los lentes se posicionan con `facialTransformationMatrix` (pose de la cabeza) + landmarks clave para escala (168 = puente nasal, 33/263 = esquinas exteriores de ojos, 127/356 = sienes).
3. **Un solo pipeline para foto y webcam:** `<FaceCanvas source={image | videoStream}>`. La foto estática es un video de un frame.
4. **Preparado para el Nivel 3:** interfaz `HeadModel` que hoy es "foto + landmarks" y mañana puede ser un GLB escaneado (Polycam/Luma). No acoplar los lentes al modo foto.

## Estructura

```
src/
  app/                # shell, rutas, layout
  core/
    face/             # FaceLandmarker wrapper, tipos de landmarks, pose
    frames/           # FrameSpec, generador procedural, materiales
    color/            # paletas, draping, análisis de subtono
    segment/          # ImageSegmenter wrapper (ropa) — M3
  components/
    FaceCanvas.tsx    # canvas compuesto: media + overlay 3D
    FramePicker.tsx   # selector de geometrías
    ColorPicker.tsx   # colores de armazón + draping
    FitControls.tsx   # sliders de ajuste fino (escala, altura, ancho)
  data/
    frames.seed.json  # las 5 geometrías del análisis de Ana
    colors.seed.json  # paleta clasificada (excelente/muy bueno/posible/evitar)
public/models/        # .task de MediaPipe descargados localmente
```

## Datos semilla (del análisis de visagismo ya hecho)

- Geometrías prioritarias: cuadrado suavizado con lift sutil, panto grande, cat-eye sutil, wayfarer amplio, navigator doble puente.
- Colores "excelente": carey oscuro translúcido, espresso/chocolate, borgoña, verde botella. "Evitar": beige, champagne, azul translúcido claro.
- Rangos orientativos: calibre 50–54 mm, puente 16–19 mm, altura de lente 40–44 mm.

## Reglas de trabajo

- Privacidad primero: si una feature requiere subir imágenes a un servicio externo, se descarta o se hace opt-in explícito.
- Cada milestone termina con la app corriendo (`npm run dev`) y un checklist de aceptación verificado en el navegador.
- Commits pequeños con prefijo del milestone (`M1: ...`).
- No optimizar prematuramente el render; primero que el anclaje sea correcto (los lentes NO deben "flotar" al girar la cabeza).
- Ver `SPEC.md` para el detalle funcional y los criterios de aceptación por milestone.

## Comandos

```
npm run dev        # servidor local
npm run build      # build producción
npm run typecheck  # tsc --noEmit
```
