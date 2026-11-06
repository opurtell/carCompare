import { useApp } from '../state/AppContext';
import { NumberInput } from './ui/NumberInput';

export function GlobalSettingsPanel() {
  const { state, setGlobalDefaults } = useApp();
  const { globalDefaults } = state;

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
        <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider shrink-0">
          Global Defaults
        </span>
        <NumberInput
          label="Petrol Price"
          value={globalDefaults.petrolPrice}
          onChange={v => setGlobalDefaults({ petrolPrice: v })}
          prefix="$"
          suffix="/L"
          step={0.05}
          min={0}
        />
        <NumberInput
          label="Electricity Price"
          value={globalDefaults.electricityPrice}
          onChange={v => setGlobalDefaults({ electricityPrice: v })}
          prefix="$"
          suffix="/kWh"
          step={0.01}
          min={0}
        />
        <NumberInput
          label="Annual Km"
          value={globalDefaults.annualKm}
          onChange={v => setGlobalDefaults({ annualKm: v })}
          suffix="km"
          step={1000}
          min={0}
        />
      </div>
    </div>
  );
}
