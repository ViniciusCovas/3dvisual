import { useMemo } from 'react';
import { sampleLensOutline } from '../core/frames/outline';
import type { FrameSpec } from '../core/frames/spec';
import { FRAMES, useAppStore } from '../state/store';

/** Preview SVG del contorno: ambos lentes + puente, generado del mismo FrameSpec. */
function FramePreview({ spec }: { spec: FrameSpec }) {
  const path = useMemo(() => {
    const pts = sampleLensOutline(spec, 48);
    const cx = spec.bridge / 2 + spec.rimThickness + spec.lensWidth / 2;
    const d = (offset: number, mirror: boolean) =>
      pts
        .map((p, i) => {
          const x = (mirror ? -p.x : p.x) + offset;
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${(-p.y).toFixed(1)}`;
        })
        .join(' ') + ' Z';
    return `${d(cx, false)} ${d(-cx, true)}`;
  }, [spec]);

  const halfW = spec.lensWidth + spec.bridge / 2 + spec.rimThickness * 2 + 6;
  const halfH = spec.lensHeight / 2 + 8;
  const bridgeY = -spec.lensHeight * 0.28;

  return (
    <svg
      viewBox={`${-halfW} ${-halfH} ${halfW * 2} ${halfH * 2}`}
      className="h-12 w-full"
      aria-hidden
    >
      <path d={path} fill="none" stroke="currentColor" strokeWidth={spec.rimThickness} />
      <line
        x1={-spec.bridge}
        y1={bridgeY}
        x2={spec.bridge}
        y2={bridgeY}
        stroke="currentColor"
        strokeWidth={3}
      />
      {spec.doubleBridge && (
        <line
          x1={-spec.bridge - 3}
          y1={bridgeY - 6}
          x2={spec.bridge + 3}
          y2={bridgeY - 6}
          stroke="currentColor"
          strokeWidth={2}
        />
      )}
    </svg>
  );
}

export function FramePicker() {
  const frameId = useAppStore((s) => s.frameId);
  const setFrameId = useAppStore((s) => s.setFrameId);

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
        Geometría
      </h2>
      <div className="grid grid-cols-1 gap-2">
        {FRAMES.map((spec) => (
          <button
            key={spec.id}
            onClick={() => setFrameId(spec.id)}
            className={`rounded-lg border p-3 text-left transition ${
              spec.id === frameId
                ? 'border-amber-400 bg-amber-400/10 text-amber-200'
                : 'border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:border-zinc-500'
            }`}
          >
            <FramePreview spec={spec} />
            <div className="mt-1 text-sm font-medium">{spec.name}</div>
            <div className="text-xs text-zinc-400">
              {spec.lensWidth}▢{spec.bridge} · alto {spec.lensHeight} mm
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
