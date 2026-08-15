import { useAppStore } from '../state/store';

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex justify-between text-xs text-zinc-400">
        <span>{label}</span>
        <span className="tabular-nums">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-amber-400"
      />
    </label>
  );
}

export function FitControls() {
  const fit = useAppStore((s) => s.fit);
  const setFit = useAppStore((s) => s.setFit);
  const resetFit = useAppStore((s) => s.resetFit);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Ajuste fino
        </h2>
        <button
          onClick={resetFit}
          className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
        >
          Restablecer
        </button>
      </div>
      <div className="space-y-3">
        <Slider
          label="Tamaño"
          value={fit.scale}
          min={0.8}
          max={1.25}
          step={0.01}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => setFit({ scale: v })}
        />
        <Slider
          label="Altura"
          value={fit.offsetY}
          min={-12}
          max={12}
          step={0.5}
          format={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)} mm`}
          onChange={(v) => setFit({ offsetY: v })}
        />
        <Slider
          label="Ancho"
          value={fit.width}
          min={0.85}
          max={1.15}
          step={0.01}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => setFit({ width: v })}
        />
      </div>
    </section>
  );
}
