interface SliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}

export function SliderInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: SliderInputProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-800 font-medium">
          {value}{suffix}
        </span>
      </div>
      <input
        type="range"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full accent-blue-500"
      />
    </label>
  );
}
