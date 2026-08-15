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
  const dipMm = useAppStore((s) => s.dipMm);
  const setDipMm = useAppStore((s) => s.setDipMm);
  const measures = useAppStore((s) => s.measures);

  // Con DIP calibrada podemos estimar medidas reales del rostro en la foto.
  const bitemporalMm =
    dipMm && measures ? (measures.bitemporalPx / measures.interpupillaryPx) * dipMm : null;

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
          label="Escala"
          value={fit.scale}
          min={0.9}
          max={1.1}
          step={0.005}
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
          label="Ancho del frente"
          value={fit.width}
          min={0.9}
          max={1.1}
          step={0.005}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => setFit({ width: v })}
        />
        <Slider
          label="Inclinación pantoscópica"
          value={fit.tiltDeg}
          min={0}
          max={15}
          step={0.5}
          format={(v) => `${v.toFixed(1)}°`}
          onChange={(v) => setFit({ tiltDeg: v })}
        />
      </div>

      <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          Calibración px→mm
        </p>
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <span>DIP real (mm)</span>
          <input
            type="number"
            min={45}
            max={80}
            step={0.5}
            value={dipMm ?? ''}
            placeholder="—"
            onChange={(e) => setDipMm(e.target.value === '' ? null : Number(e.target.value))}
            className="w-20 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-zinc-200 outline-none focus:border-amber-400"
          />
        </label>
        <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">
          {bitemporalMm
            ? `Ancho bitemporal estimado: ${bitemporalMm.toFixed(0)} mm.`
            : 'Sin DIP la escala asume una cabeza promedio (aproximado).'}
        </p>
      </div>
    </section>
  );
}
