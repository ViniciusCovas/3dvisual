import { RATING_LABEL, RATING_ORDER } from '../core/color/palette';
import { COLORS, selectedColor, useAppStore } from '../state/store';

const RATING_BADGE: Record<string, string> = {
  excelente: 'bg-emerald-500/20 text-emerald-300',
  muyBueno: 'bg-sky-500/20 text-sky-300',
  posible: 'bg-zinc-500/20 text-zinc-300',
  evitar: 'bg-rose-500/20 text-rose-300',
};

export function ColorPicker() {
  const colorId = useAppStore((s) => s.colorId);
  const setColorId = useAppStore((s) => s.setColorId);
  const current = selectedColor(colorId);

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
        Color del armazón
      </h2>
      <div className="space-y-3">
        {RATING_ORDER.map((rating) => {
          const group = COLORS.filter((c) => c.rating === rating);
          if (group.length === 0) return null;
          return (
            <div key={rating}>
              <span
                className={`mb-1.5 inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${RATING_BADGE[rating]}`}
              >
                {RATING_LABEL[rating]}
              </span>
              <div className="flex flex-wrap gap-2">
                {group.map((c) => (
                  <button
                    key={c.id}
                    title={`${c.name} — ${c.note}`}
                    onClick={() => setColorId(c.id)}
                    className={`h-8 w-8 rounded-full border-2 transition ${
                      c.id === colorId
                        ? 'scale-110 border-amber-400'
                        : 'border-zinc-600 hover:border-zinc-400'
                    } ${c.finish === 'translucent' ? 'opacity-80' : ''}`}
                    style={{ backgroundColor: c.hex }}
                    aria-label={c.name}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 min-h-8 text-xs text-zinc-500">
        <span className="font-medium text-zinc-300">{current.name}.</span> {current.note}
      </p>
    </section>
  );
}
