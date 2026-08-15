import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { FaceTracker } from '../core/face/tracker';
import type { FaceFrame } from '../core/face/types';
import { LM } from '../core/face/types';
import { bitemporalPx, interpupillaryPx } from '../core/face/measures';
import { useAppStore } from '../state/store';
import { Glasses } from './Glasses';

export type FaceSource =
  | { kind: 'photo'; url: string }
  | { kind: 'webcam'; stream: MediaStream };

// Un solo tracker para toda la app; foto y webcam comparten pipeline.
let trackerPromise: Promise<FaceTracker> | null = null;
function getTracker(): Promise<FaceTracker> {
  if (!trackerPromise) trackerPromise = FaceTracker.create();
  return trackerPromise;
}

const KEY_LANDMARKS: number[] = [
  LM.NOSE_BRIDGE,
  LM.NOSE_DORSUM,
  LM.RIGHT_EYE_OUTER,
  LM.LEFT_EYE_OUTER,
  LM.RIGHT_TEMPLE,
  LM.LEFT_TEMPLE,
  LM.CHIN,
];

/**
 * Canvas compuesto: media (foto o video) + overlay 3D con los lentes + malla
 * de landmarks para debug (tecla D). Un solo pipeline: la foto estática se
 * trata como un video de un frame. El overlay usa cámara ortográfica en px
 * CSS, así los landmarks normalizados se mapean 1:1 sobre el media mostrado.
 */
export function FaceCanvas({ source }: { source: FaceSource }) {
  const faceRef = useRef<FaceFrame | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const meshCanvasRef = useRef<HTMLCanvasElement>(null);
  const [aspect, setAspect] = useState(4 / 3);
  // La detección espera a que el contexto WebGL de three esté creado: inicializar
  // ambos contextos GL a la vez puede bloquear en renderers de software.
  const [glReady, setGlReady] = useState(false);

  const fit = useAppStore((s) => s.fit);
  const debugMesh = useAppStore((s) => s.debugMesh);
  const setFaceDetected = useAppStore((s) => s.setFaceDetected);
  const setMeasures = useAppStore((s) => s.setMeasures);
  const setTrackerStatus = useAppStore((s) => s.setTrackerStatus);

  const isWebcam = source.kind === 'webcam';

  // Pipeline de detección: una pasada para foto, bomba autorregulada para webcam.
  useEffect(() => {
    if (!glReady) return;
    let cancelled = false;
    faceRef.current = null;
    setFaceDetected(false);

    const publishMeasures = (frame: FaceFrame | null, w: number, h: number) => {
      if (!frame) {
        setMeasures(null);
        return;
      }
      setMeasures({
        interpupillaryPx: interpupillaryPx(frame.landmarks, w, h),
        bitemporalPx: bitemporalPx(frame.landmarks, w, h),
      });
    };

    async function run() {
      let tracker: FaceTracker;
      try {
        tracker = await getTracker();
        setTrackerStatus('ready');
      } catch (err) {
        console.error('[FaceCanvas] No se pudo inicializar el FaceLandmarker', err);
        setTrackerStatus('error');
        return;
      }
      if (cancelled) return;

      if (source.kind === 'photo') {
        const img = imgRef.current;
        if (!img) return;
        if (!img.complete) {
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        }
        if (cancelled || !img.naturalWidth) return;
        setAspect(img.naturalWidth / img.naturalHeight);
        const frame = await tracker.detect(img);
        if (cancelled) return;
        faceRef.current = frame;
        setFaceDetected(frame !== null);
        publishMeasures(frame, img.naturalWidth, img.naturalHeight);
      } else {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = source.stream;
        await video.play().catch(() => undefined);
        if (cancelled) return;
        if (video.videoWidth) setAspect(video.videoWidth / video.videoHeight);

        // Bomba de detección autorregulada: una petición en vuelo por vez;
        // el worker marca el ritmo y la UI nunca se bloquea.
        let lastDetected: boolean | null = null;
        let frameCount = 0;
        while (!cancelled) {
          if (video.readyState >= 2) {
            const frame = await tracker.detect(video);
            if (cancelled) return;
            faceRef.current = frame;
            const detected = frame !== null;
            if (detected !== lastDetected) {
              lastDetected = detected;
              setFaceDetected(detected);
            }
            if (frameCount++ % 15 === 0) {
              publishMeasures(frame, video.videoWidth, video.videoHeight);
            }
          }
          await new Promise(requestAnimationFrame);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [source, glReady, setFaceDetected, setMeasures, setTrackerStatus]);

  // Malla de landmarks (debug): puntos verdes + landmarks clave en ámbar.
  useEffect(() => {
    const canvas = meshCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (!debugMesh) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    let raf = 0;
    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.clearRect(0, 0, w, h);
      const face = faceRef.current;
      if (face) {
        ctx.fillStyle = 'rgba(52, 211, 153, 0.85)';
        for (const lm of face.landmarks) {
          ctx.fillRect(lm.x * w - 0.75, lm.y * h - 0.75, 1.5, 1.5);
        }
        ctx.fillStyle = 'rgba(251, 191, 36, 1)';
        for (const idx of KEY_LANDMARKS) {
          const lm = face.landmarks[idx];
          ctx.beginPath();
          ctx.arc(lm.x * w, lm.y * h, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [debugMesh]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl bg-black"
      style={{ aspectRatio: String(aspect) }}
    >
      {/* Espejado tipo espejo en webcam: se voltea el contenedor completo para
          que video, overlay y malla queden siempre consistentes. */}
      <div className="absolute inset-0" style={isWebcam ? { transform: 'scaleX(-1)' } : undefined}>
        {source.kind === 'photo' ? (
          <img
            ref={imgRef}
            src={source.url}
            alt="Foto para try-on"
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : (
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            className="absolute inset-0 h-full w-full object-contain"
          />
        )}
        <Canvas
          orthographic
          camera={{ position: [0, 0, 800], near: 0.1, far: 8000, zoom: 1 }}
          gl={{ alpha: true, antialias: true }}
          className="pointer-events-none"
          style={{ position: 'absolute', inset: 0 }}
          onCreated={() => setGlReady(true)}
        >
          <ambientLight intensity={1.1} />
          <directionalLight position={[120, 200, 400]} intensity={1.4} />
          <directionalLight position={[-200, 50, 200]} intensity={0.5} />
          <Glasses faceRef={faceRef} fit={fit} smoothing={isWebcam ? 0.55 : 1} />
        </Canvas>
        <canvas
          ref={meshCanvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  );
}
