import type { FuelType } from '../../types/car';

const FUEL_TYPES: { value: FuelType; label: string }[] = [
  { value: 'ev', label: 'EV' },
  { value: 'phev', label: 'PHEV' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'petrol', label: 'Petrol' },
];

interface FuelTypePickerProps {
  value: FuelType;
  onChange: (value: FuelType) => void;
}

export function FuelTypePicker({ value, onChange }: FuelTypePickerProps) {
  return (
    <div className="flex gap-1">
      {FUEL_TYPES.map(ft => (
        <button
          key={ft.value}
          type="button"
          onClick={() => onChange(ft.value)}
          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors
            ${
              value === ft.value
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
        >
          {ft.label}
        </button>
      ))}
    </div>
  );
}
