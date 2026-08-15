import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DEFAULT_BITEMPORAL_MM } from '../core/face/measures';
import { useAppStore } from '../state/store';
import { ActiveGlasses } from './Glasses';

type AnchorKey = 'rightTemple' | 'leftTemple' | 'noseBridge';

/** Anclaje del armazón sobre el mesh escaneado (SPEC §3.5), exportable a JSON. */
interface HeadAnchors {
  rightTemple: [number, number, number] | null;
  leftTemple: [number, number, number] | null;
  noseBridge: [number, number, number] | null;
}

const EMPTY_ANCHORS: HeadAnchors = { rightTemple: null, leftTemple: null, noseBridge: null };

const STEPS: { key: AnchorKey; label: string; color: string }[] = [
  {
    key: 'rightTemple',
    label: 'la SIEN DERECHA de la persona — gira la cabeza hasta verla de lado',
    color: '#fbbf24',
  },
  {
    key: 'leftTemple',
    label: 'la SIEN IZQUIERDA — gira hacia el otro lado',
    color: '#38bdf8',
  },
  { key: 'noseBridge', label: 'la RAÍZ NASAL (entre los ojos, de frente)', color: '#34d399' },
];

interface ModelInfo {
  object: THREE.Group;
  center: THREE.Vector3;
  radius: number;
}

/** Armazón montado sobre el mesh usando los 3 puntos de anclaje. */
function MountedGlasses({ anchors }: { anchors: HeadAnchors }) {
  const fit = useAppStore((s) => s.fit);

  const mount = useMemo(() => {
    if (!anchors.rightTemple || !anchors.leftTemple || !anchors.noseBridge) return null;
    const rt = new THREE.Vector3(...anchors.rightTemple);
    const lt = new THREE.Vector3(...anchors.leftTemple);
    const nb = new THREE.Vector3(...anchors.noseBridge);

    // Base local de la cabeza: +x hacia la sien derecha; +z hacia el frente
    // (asumiendo el escaneo con la cabeza "de pie": +y mundo hacia arriba).
    const x = rt.clone().sub(lt).normalize();
    let z = new THREE.Vector3().crossVectors(x, new THREE.Vector3(0, 1, 0));
    if (z.lengthSq() < 1e-8) z = new THREE.Vector3(0, 0, 1);
    z.normalize();
    const y = new THREE.Vector3().crossVectors(z, x).normalize();
    const quat = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(x, y, z),
    );
    // Escala unidades-del-scan → mm: la distancia entre sienes ES el ancho
    // bitemporal real, sin importar en qué unidades venga el GLB.
    const unitsPerMm = rt.distanceTo(lt) / DEFAULT_BITEMPORAL_MM;
    return { position: nb, quat, unitsPerMm };
  }, [anchors]);

  if (!mount) return null;
  return (
    <group
      position={mount.position}
      quaternion={mount.quat}
      scale={mount.unitsPerMm * fit.scale}
    >
      {/* Separa el frente unos mm de la piel, como apoyan las plaquetas. */}
      <group position={[0, 0, 6]}>
        <ActiveGlasses />
      </group>
    </group>
  );
}

/**
 * Modo Cabeza 3D (M4): carga un GLB escaneado (Polycam/Luma/Scaniverse),
 * visor orbital, anclaje semiautomático con 3 dobles-clics y montaje de los
 * mismos FrameSpec procedurales. El GLB nunca sale del navegador.
 */
export function HeadViewer() {
  const [model, setModel] = useState<ModelInfo | null>(null);
  const [glbName, setGlbName] = useState<string>('');
  const [anchors, setAnchors] = useState<HeadAnchors>(EMPTY_ANCHORS);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const glbInput = useRef<HTMLInputElement>(null);
  const anchorsInput = useRef<HTMLInputElement>(null);

  const step = STEPS.find((s) => anchors[s.key] === null) ?? null;
  const complete = step === null;

  const loadGlb = useCallback((file: File) => {
    setError(null);
    setLoading(true);
    setAnchors(EMPTY_ANCHORS);
    const url = URL.createObjectURL(file); // local: el escaneo no sale del navegador
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        URL.revokeObjectURL(url);
        const object = gltf.scene;
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const radius = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 1e-6);
        setModel((prev) => {
          prev?.object.traverse((o) => {
            if (o instanceof THREE.Mesh) {
              o.geometry.dispose();
              const mats = Array.isArray(o.material) ? o.material : [o.material];
              mats.forEach((m) => m.dispose());
            }
          });
          return { object, center, radius };
        });
        setGlbName(file.name);
        setLoading(false);
      },
      undefined,
      (err) => {
        URL.revokeObjectURL(url);
        setLoading(false);
        setError(
          `No se pudo leer el GLB (${err instanceof Error ? err.message : 'formato no soportado'}). ` +
            'Exporta desde Polycam/Luma como GLB estándar (sin compresión Draco).',
        );
      },
    );
  }, []);

  const onPick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const next = STEPS.find((s) => anchors[s.key] === null);
      if (!next) return;
      const p = e.point;
      setAnchors((prev) => ({ ...prev, [next.key]: [p.x, p.y, p.z] }));
    },
    [anchors],
  );

  const exportAnchors = useCallback(() => {
    // JSON exportable: los datos críticos no dependen del storage del navegador.
    const blob = new Blob([JSON.stringify({ glb: glbName, anchors }, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `anclaje-${glbName.replace(/\.[^.]+$/, '') || 'cabeza'}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [anchors, glbName]);

  const importAnchors = useCallback((file: File) => {
    file
      .text()
      .then((text) => {
        const data = JSON.parse(text) as { anchors?: HeadAnchors };
        if (data.anchors?.rightTemple && data.anchors.leftTemple && data.anchors.noseBridge) {
          setAnchors(data.anchors);
        } else {
          setError('El JSON no tiene los 3 puntos de anclaje.');
        }
      })
      .catch(() => setError('No se pudo leer el JSON de anclaje.'));
  }, []);

  useEffect(() => {
    return () => {
      model?.object.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => m.dispose());
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markerRadius = model ? model.radius * 0.02 : 0.01;

  return (
    <div>
      {!model ? (
        <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900">
          <p className="max-w-md text-center text-sm text-zinc-400">
            Sube el escaneo 3D de la cabeza (archivo <b>.glb</b> exportado de Polycam, Luma o
            Scaniverse). Se procesa solo en tu navegador, no se sube a ningún servidor.
          </p>
          <button
            onClick={() => glbInput.current?.click()}
            className="rounded-lg bg-amber-400 px-5 py-2 text-sm font-semibold text-zinc-900 hover:bg-amber-300"
          >
            {loading ? 'Cargando…' : 'Cargar escaneo GLB'}
          </button>
          {error && <p className="max-w-md text-center text-xs text-rose-400">{error}</p>}
        </div>
      ) : (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-zinc-900">
          <Canvas
            camera={{
              position: [
                model.center.x,
                model.center.y + model.radius * 0.1,
                model.center.z + model.radius * 2.2,
              ],
              near: model.radius * 0.01,
              far: model.radius * 100,
              fov: 40,
            }}
          >
            <ambientLight intensity={0.9} />
            <directionalLight position={[2, 4, 5]} intensity={1.6} />
            <directionalLight position={[-3, 1, -2]} intensity={0.6} />
            <group onDoubleClick={onPick}>
              <primitive object={model.object} />
            </group>
            {STEPS.map(({ key, color }) => {
              const p = anchors[key];
              if (!p) return null;
              return (
                <mesh key={key} position={p}>
                  <sphereGeometry args={[markerRadius, 16, 16]} />
                  <meshBasicMaterial color={color} />
                </mesh>
              );
            })}
            {complete && <MountedGlasses anchors={anchors} />}
            <OrbitControls target={model.center} enableDamping makeDefault />
          </Canvas>

          <div className="pointer-events-none absolute inset-x-0 top-0 p-3">
            <div className="mx-auto w-fit rounded-lg bg-zinc-950/80 px-3 py-1.5 text-xs text-zinc-200">
              {complete ? (
                <>Anclaje listo — arrastra para orbitar 360°</>
              ) : (
                <>
                  Doble clic sobre{' '}
                  <span className="font-semibold" style={{ color: step.color }}>
                    {step.label}
                  </span>{' '}
                  · arrastra para girar, rueda para zoom
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        {model && (
          <>
            <span className="mr-1 max-w-40 truncate text-xs text-zinc-500">{glbName}</span>
            <button
              onClick={() => glbInput.current?.click()}
              className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
            >
              Cambiar GLB
            </button>
            <button
              onClick={() => setAnchors(EMPTY_ANCHORS)}
              className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
            >
              Repetir anclaje
            </button>
            <button
              onClick={exportAnchors}
              disabled={!complete}
              className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 enabled:hover:bg-zinc-700 disabled:opacity-40"
            >
              Exportar anclaje (JSON)
            </button>
            <button
              onClick={() => anchorsInput.current?.click()}
              className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
            >
              Cargar anclaje
            </button>
          </>
        )}
        {error && model && <span className="text-xs text-rose-400">{error}</span>}
      </div>

      <input
        ref={glbInput}
        type="file"
        accept=".glb,.gltf,model/gltf-binary"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) loadGlb(f);
          e.target.value = '';
        }}
      />
      <input
        ref={anchorsInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importAnchors(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
