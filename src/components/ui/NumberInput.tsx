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
}

export function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  prefix,
  suffix,
  tooltip,
}: NumberInputProps) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm" title={tooltip}>
      <span className="text-gray-600 shrink-0">{label}</span>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-gray-400 text-xs">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="w-24 px-2 py-1 text-right text-sm border border-gray-300 rounded
                     focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
        />
        {suffix && <span className="text-gray-400 text-xs">{suffix}</span>}
      </div>
    </label>
  );
}
