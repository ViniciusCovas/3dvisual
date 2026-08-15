import { useMemo, useRef } from 'react';
import { sampleLensPathMm } from '../core/frames/outline';
import type { FrameSpec } from '../core/frames/spec';
import { FRAMES, useAppStore } from '../state/store';

let customFrameSeq = 0;

/** Preview SVG del contorno: ambos lentes + puente, generado del mismo FrameSpec. */
function FramePreview({ spec }: { spec: FrameSpec }) {
  const path = useMemo(() => {
    const pts = sampleLensPathMm(spec, 3);
    const cx = spec.bridgeMm / 2 + spec.rimThicknessMm + spec.lensWidthMm / 2;
    const d = (offset: number, mirror: boolean) =>
      pts
        .map((p, i) => {
          const x = (mirror ? -p.x : p.x) + offset;
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${(-p.y).toFixed(1)}`;
        })
        .join(' ') + ' Z';
    return `${d(cx, false)} ${d(-cx, true)}`;
  }, [spec]);

  const halfW = spec.lensWidthMm + spec.bridgeMm / 2 + spec.rimThicknessMm * 2 + 6;
  const halfH = spec.lensHeightMm / 2 + 8;
  const bridgeY = -spec.lensHeightMm * (spec.bridgeStyle === 'doubleBar' ? 0.22 : 0.28);

  return (
    <svg
      viewBox={`${-halfW} ${-halfH} ${halfW * 2} ${halfH * 2}`}
      className="h-10 w-full"
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={Math.max(spec.rimThicknessMm, 1.4)}
      />
      <line
        x1={-spec.bridgeMm}
        y1={bridgeY}
        x2={spec.bridgeMm}
        y2={bridgeY}
        stroke="currentColor"
        strokeWidth={3}
      />
      {spec.bridgeStyle === 'doubleBar' && (
        <line
          x1={-spec.bridgeMm - 3}
          y1={-spec.lensHeightMm * 0.42}
          x2={spec.bridgeMm + 3}
          y2={-spec.lensHeightMm * 0.42}
          stroke="currentColor"
          strokeWidth={2}
        />
      )}
      {spec.browline && (
        <path
          d={`M${-halfW + 4},${-spec.lensHeightMm / 2 - 2} H${halfW - 4}`}
          stroke="currentColor"
          strokeWidth={4}
          fill="none"
        />
      )}
    </svg>
  );
}

export function FramePicker() {
  const frameId = useAppStore((s) => s.frameId);
  const setFrameId = useAppStore((s) => s.setFrameId);
  const customFrames = useAppStore((s) => s.customFrames);
  const selectedCustomId = useAppStore((s) => s.selectedCustomId);
  const addCustomFrame = useAppStore((s) => s.addCustomFrame);
  const selectCustomFrame = useAppStore((s) => s.selectCustomFrame);
  const pngInput = useRef<HTMLInputElement>(null);

  const onAddPngs = (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      addCustomFrame({
        id: `custom-${customFrameSeq++}`,
        name: file.name.replace(/\.[^.]+$/, ''),
        url: URL.createObjectURL(file), // local: la imagen no sale del navegador
      });
    }
  };

  const groups = [
    { key: 'recomendada', label: 'Recomendadas del análisis' },
    { key: 'control', label: 'De control (para comparar)' },
    { key: 'rayban', label: 'Inspirados en Ray-Ban · medidas de catálogo (aprox.)' },
  ] as const;

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
        Geometría
      </h2>
      {groups.map((group) => (
        <div key={group.key} className="mb-3">
          <p className="mb-1.5 text-[11px] font-medium text-zinc-500">{group.label}</p>
          <div className="grid grid-cols-2 gap-2">
            {FRAMES.filter((f) => f.group === group.key).map((spec) => (
              <button
                key={spec.id}
                onClick={() => setFrameId(spec.id)}
                title={spec.description}
                className={`rounded-lg border p-2 text-left transition ${
                  spec.id === frameId && selectedCustomId === null
                    ? 'border-amber-400 bg-amber-400/10 text-amber-200'
                    : 'border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:border-zinc-500'
                }`}
              >
                <FramePreview spec={spec} />
                <div className="mt-1 truncate text-xs font-medium">{spec.name}</div>
                <div className="text-[10px] text-zinc-500">
                  {spec.lensWidthMm}▢{spec.bridgeMm} · {spec.lensHeightMm} mm
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="mb-3">
        <p className="mb-1.5 text-[11px] font-medium text-zinc-500">
          Foto real del producto (PNG transparente)
        </p>
        <div className="grid grid-cols-2 gap-2">
          {customFrames.map((frame) => (
            <button
              key={frame.id}
              onClick={() => selectCustomFrame(frame.id)}
              title={frame.name}
              className={`rounded-lg border p-2 text-left transition ${
                frame.id === selectedCustomId
                  ? 'border-amber-400 bg-amber-400/10 text-amber-200'
                  : 'border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:border-zinc-500'
              }`}
            >
              <div className="flex h-10 items-center justify-center rounded bg-zinc-200/90 px-1">
                <img src={frame.url} alt={frame.name} className="max-h-9 max-w-full object-contain" />
              </div>
              <div className="mt-1 truncate text-xs font-medium">{frame.name}</div>
              <div className="text-[10px] text-zinc-500">imagen 2D · ~145 mm</div>
            </button>
          ))}
          <button
            onClick={() => pngInput.current?.click()}
            className="flex min-h-20 flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-700 p-2 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
          >
            <span className="text-xl leading-none">+</span>
            <span className="mt-1 text-center text-[10px]">Subir PNG</span>
          </button>
        </div>
        <p className="mt-1.5 text-[10px] leading-snug text-zinc-600">
          Guarda la foto del modelo (fondo transparente) desde la web de la tienda y súbela: se ve
          tal cual el producto. No sale de tu navegador. De frente es exacta; al girar la cabeza es
          plana — para el 3D usa las geometrías de arriba.
        </p>
        <input
          ref={pngInput}
          type="file"
          accept="image/png,image/webp,image/avif"
          multiple
          className="hidden"
          onChange={(e) => {
            onAddPngs(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
    </section>
  );
}
