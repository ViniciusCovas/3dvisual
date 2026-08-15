import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaceCanvas, type FaceSource } from '../components/FaceCanvas';
import { FramePicker } from '../components/FramePicker';
import { ColorPicker } from '../components/ColorPicker';
import { FitControls } from '../components/FitControls';
import { useAppStore, type SourceKind } from '../state/store';

interface Photo {
  url: string;
  name: string;
}

export default function App() {
  const sourceKind = useAppStore((s) => s.sourceKind);
  const setSourceKind = useAppStore((s) => s.setSourceKind);
  const faceDetected = useAppStore((s) => s.faceDetected);
  const trackerStatus = useAppStore((s) => s.trackerStatus);
  const debugMesh = useAppStore((s) => s.debugMesh);
  const toggleDebugMesh = useAppStore((s) => s.toggleDebugMesh);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [activePhoto, setActivePhoto] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Tecla D: alterna la malla de landmarks (debug de M0).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'd' && !(e.target instanceof HTMLInputElement)) {
        toggleDebugMesh();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleDebugMesh]);

  const stopWebcam = useCallback(() => {
    setStream((current) => {
      current?.getTracks().forEach((t) => t.stop());
      return null;
    });
  }, []);

  const switchTo = useCallback(
    (kind: SourceKind) => {
      setSourceKind(kind);
      if (kind === 'photo') stopWebcam();
    },
    [setSourceKind, stopWebcam],
  );

  const startWebcam = useCallback(async () => {
    setWebcamError(null);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(media);
    } catch (err) {
      setWebcamError(
        'No se pudo acceder a la cámara. Revisa el permiso del navegador. ' +
          `(${err instanceof Error ? err.message : String(err)})`,
      );
    }
  }, []);

  useEffect(() => () => stopWebcam(), [stopWebcam]);

  const addPhotos = useCallback((files: FileList | File[]) => {
    const imgs = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imgs.length === 0) return;
    setPhotos((prev) => {
      // Los object URLs son locales: la foto nunca sale del navegador.
      const added = imgs.map((f) => ({ url: URL.createObjectURL(f), name: f.name }));
      setActivePhoto(prev.length);
      return [...prev, ...added];
    });
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (sourceKind !== 'photo') setSourceKind('photo');
      addPhotos(e.dataTransfer.files);
    },
    [addPhotos, sourceKind, setSourceKind],
  );

  // Identidad estable: si se recrea en cada render, el efecto de detección
  // de FaceCanvas se reiniciaría en bucle.
  const photoUrl = photos[activePhoto]?.url ?? null;
  const source: FaceSource | null = useMemo(() => {
    if (sourceKind === 'photo') return photoUrl ? { kind: 'photo', url: photoUrl } : null;
    return stream ? { kind: 'webcam', stream } : null;
  }, [sourceKind, photoUrl, stream]);

  const statusText =
    trackerStatus === 'loading'
      ? 'Cargando modelo de rostro…'
      : trackerStatus === 'error'
        ? 'Error cargando el modelo (revisa la consola)'
        : source
          ? faceDetected
            ? 'Rostro detectado'
            : 'Buscando rostro…'
          : 'Elige una fuente';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4">
        <h1 className="text-lg font-semibold">
          Espejo Digital{' '}
          <span className="ml-2 text-sm font-normal text-zinc-400">
            try-on de lentes · 100% local, nada sale de tu máquina
          </span>
        </h1>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 p-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <button
              onClick={() => switchTo('photo')}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                sourceKind === 'photo'
                  ? 'bg-amber-400 text-zinc-900'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              Foto
            </button>
            <button
              onClick={() => switchTo('webcam')}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                sourceKind === 'webcam'
                  ? 'bg-amber-400 text-zinc-900'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              Webcam
            </button>
            <span className="ml-auto text-xs text-zinc-500">
              {statusText}
              {debugMesh && ' · malla ON'}
            </span>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={dragOver ? 'rounded-xl ring-2 ring-amber-400' : ''}
          >
            {source ? (
              <FaceCanvas source={source} />
            ) : (
              <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900">
                {sourceKind === 'photo' ? (
                  <>
                    <p className="max-w-sm text-center text-sm text-zinc-400">
                      Arrastra fotos aquí o súbelas con el botón. Frontal, buena luz y expresión
                      neutra para decidir tamaño. Se procesan solo en tu navegador.
                    </p>
                    <button
                      onClick={() => fileInput.current?.click()}
                      className="rounded-lg bg-amber-400 px-5 py-2 text-sm font-semibold text-zinc-900 hover:bg-amber-300"
                    >
                      Elegir foto
                    </button>
                  </>
                ) : (
                  <>
                    <p className="max-w-sm text-center text-sm text-zinc-400">
                      El video de la webcam se procesa en vivo y nunca sale de tu máquina.
                    </p>
                    <button
                      onClick={() => void startWebcam()}
                      className="rounded-lg bg-amber-400 px-5 py-2 text-sm font-semibold text-zinc-900 hover:bg-amber-300"
                    >
                      Activar webcam
                    </button>
                    {webcamError && (
                      <p className="max-w-sm text-center text-xs text-rose-400">{webcamError}</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Barra de thumbnails de fotos cargadas */}
          {sourceKind === 'photo' && photos.length > 0 && (
            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
              {photos.map((photo, i) => (
                <button
                  key={photo.url}
                  onClick={() => setActivePhoto(i)}
                  title={photo.name}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                    i === activePhoto
                      ? 'border-amber-400'
                      : 'border-zinc-700 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={photo.url} alt={photo.name} className="h-full w-full object-cover" />
                </button>
              ))}
              <button
                onClick={() => fileInput.current?.click()}
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-zinc-700 text-2xl text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
                title="Añadir fotos"
              >
                +
              </button>
            </div>
          )}

          <p className="mt-2 text-[11px] text-zinc-600">
            Tecla <kbd className="rounded bg-zinc-800 px-1">D</kbd>: malla de landmarks (debug).
            La escala sin DIP calibrada es aproximada.
          </p>

          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addPhotos(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        <aside className="space-y-6">
          <FramePicker />
          <ColorPicker />
          <FitControls />
        </aside>
      </main>
    </div>
  );
}
