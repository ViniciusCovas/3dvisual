import { useMemo } from 'react';
import { sampleLensPathMm } from '../core/frames/outline';
import type { FrameSpec } from '../core/frames/spec';
import { FRAMES, useAppStore } from '../state/store';

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

  const groups = [
    { key: 'recomendada', label: 'Recomendadas del análisis' },
    { key: 'control', label: 'De control (para comparar)' },
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
                  spec.id === frameId
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
    </section>
  );
}
