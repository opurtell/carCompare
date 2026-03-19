import { useApp } from '../state/AppContext';
import { NumberInput } from './ui/NumberInput';

export function GlobalSettingsPanel() {
  const { state, setGlobalDefaults, toggleDepreciation } = useApp();
  const { globalDefaults, showDepreciation } = state;

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
        <button
          onClick={toggleDepreciation}
          className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
            showDepreciation
              ? 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
              : 'bg-amber-50 border-amber-400 text-amber-700 hover:border-amber-500'
          }`}
        >
          <span
            className={`w-8 h-4 rounded-full relative transition-colors ${
              showDepreciation ? 'bg-blue-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
                showDepreciation ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </span>
          <span>Depreciation {showDepreciation ? 'On' : 'Off'}</span>
        </button>
      </div>
    </div>
  );
}
