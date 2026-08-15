import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { FaceTracker } from '../core/face/tracker';
import type { FaceFrame } from '../core/face/types';
import { selectedColor, selectedFrame, useAppStore } from '../state/store';
import { Glasses } from './Glasses';

export type FaceSource =
  | { kind: 'photo'; url: string }
  | { kind: 'webcam'; stream: MediaStream };

// Un solo tracker para toda la app; el wrapper cambia de runningMode según la fuente.
let trackerPromise: Promise<FaceTracker> | null = null;
function getTracker(): Promise<FaceTracker> {
  if (!trackerPromise) trackerPromise = FaceTracker.create();
  return trackerPromise;
}

/**
 * Canvas compuesto: media (foto o video) + overlay 3D con los lentes.
 * Un solo pipeline: la foto estática se trata como un video de un frame.
 * El overlay usa cámara ortográfica en px CSS, así los landmarks normalizados
 * se mapean 1:1 sobre el media mostrado.
 */
export function FaceCanvas({ source }: { source: FaceSource }) {
  const faceRef = useRef<FaceFrame | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [aspect, setAspect] = useState(4 / 3);
  // La detección espera a que el contexto WebGL de three esté creado: inicializar
  // ambos contextos GL a la vez puede bloquear en renderers de software.
  const [glReady, setGlReady] = useState(false);

  const frameId = useAppStore((s) => s.frameId);
  const colorId = useAppStore((s) => s.colorId);
  const fit = useAppStore((s) => s.fit);
  const setFaceDetected = useAppStore((s) => s.setFaceDetected);
  const setTrackerStatus = useAppStore((s) => s.setTrackerStatus);

  const spec = selectedFrame(frameId);
  const color = selectedColor(colorId);
  const isWebcam = source.kind === 'webcam';

  // Pipeline de detección: una pasada para foto, bucle rAF para webcam.
  useEffect(() => {
    if (!glReady) return;
    let cancelled = false;
    faceRef.current = null;
    setFaceDetected(false);

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
        console.debug('[FaceCanvas] foto:', frame ? 'rostro detectado' : 'sin rostro');
        faceRef.current = frame;
        setFaceDetected(frame !== null);
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
          }
          await new Promise(requestAnimationFrame);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [source, glReady, setFaceDetected, setTrackerStatus]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl bg-black"
      style={{ aspectRatio: String(aspect) }}
    >
      {/* Espejado tipo espejo en webcam: se voltea el contenedor completo para
          que video y overlay queden siempre consistentes. */}
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
          <Glasses
            faceRef={faceRef}
            spec={spec}
            color={color}
            fit={fit}
            smoothing={isWebcam ? 0.55 : 1}
          />
        </Canvas>
      </div>
    </div>
  );
}
