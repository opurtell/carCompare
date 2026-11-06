import { useState } from 'react';

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  tooltip?: string;
  /** Round committed values to whole numbers. */
  integer?: boolean;
}

function clamp(n: number, min?: number, max?: number) {
  let v = n;
  if (min !== undefined) v = Math.max(min, v);
  if (max !== undefined) v = Math.min(max, v);
  return v;
}

/**
 * Number field that lets the user clear it or type intermediate values ("0.", "-") without
 * the stored value jumping to 0/NaN. Valid numbers are committed as you type; the field
 * snaps back to the committed (clamped) value on blur.
 */
export function NumberInput({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  prefix,
  suffix,
  tooltip,
  integer = false,
}: NumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  function commit(text: string) {
    if (text.trim() === '') return;
    const n = Number(text);
    if (!Number.isFinite(n)) return;
    const v = clamp(integer ? Math.round(n) : n, min, max);
    if (v !== value) onChange(v);
  }

  return (
    <label className="block text-sm" title={tooltip}>
      <div className="flex items-center justify-between gap-2">
      <span className="text-gray-600 min-w-0">{label}</span>
      <div className="flex items-center gap-1 shrink-0">
        {prefix && <span className="text-gray-400 text-xs">{prefix}</span>}
        <input
          type="number"
          inputMode="decimal"
          value={draft ?? String(value)}
          onChange={e => {
            setDraft(e.target.value);
            commit(e.target.value);
          }}
          onFocus={e => e.target.select()}
          onBlur={() => setDraft(null)}
          min={min}
          max={max}
          step={step}
          className="w-24 px-2 py-2 md:py-1 text-right text-base md:text-sm border border-gray-300 rounded
                     focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
        />
        {suffix && <span className="text-gray-400 text-xs">{suffix}</span>}
      </div>
      </div>
      {/* `title` never shows on touch screens, so spell the hint out there. */}
      {tooltip && <span className="block md:hidden mt-1 text-xs text-gray-400">{tooltip}</span>}
    </label>
  );
}
