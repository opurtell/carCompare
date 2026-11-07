import { useEffect, useRef, useState } from 'react';
import { useApp } from '../state/AppContext';
import { researchVehicle, ResearchApiError, type ResearchResult } from '../api/carResearchApi';
import { safeHttpUrl } from '../../shared/research';
import { mergeResearchResultToConfig } from '../utils/carConfigMerger';
import { ACT_CTP_PREMIUM, autoRegoFor, autoStampDutyFor, emissionsCategoryFor } from '../calculations/actSpecific';
import { CATALOGUE_AS_OF, VEHICLE_CATALOGUE, type CatalogueVehicle } from '../data/vehicleCatalogue';
import { USED_CATALOGUE, USED_CATALOGUE_AS_OF } from '../data/usedCatalogue';
import { searchCatalogue } from '../utils/searchCatalogue';
import { depreciationDefaultsFor } from '../data/defaults';
import type { CarConfig, FuelType } from '../types/car';
import { formatCurrency } from '../utils/formatters';
import { NumberInput } from './ui/NumberInput';
import { SliderInput } from './ui/SliderInput';
import { ToggleSwitch } from './ui/ToggleSwitch';
import { FuelTypePicker } from './ui/FuelTypePicker';
import { Section } from './ui/Section';
import { Modal } from './ui/Modal';

interface AddCarModalProps {
  onClose: () => void;
  /** The AI lookup only shows when the Worker reports an AI key. */
  aiAvailable: boolean;
}

interface SourceLink {
  label: string;
  value: string;
}

type Origin = 'catalogue' | 'ai';

const SOURCE_LABELS: Record<string, string> = {
  price: 'Price',
  purchasePrice: 'Price',
  specs: 'Specs',
  consumption: 'Fuel use',
  emissions: 'CO₂',
  servicing: 'Servicing',
  insurance: 'Insurance',
};

type ModalStage = 'input' | 'loading' | 'summary' | 'expanded';

export function AddCarModal({ onClose, aiAvailable }: AddCarModalProps) {
  const { state, addCar } = useApp();
  const [stage, setStage] = useState<ModalStage>('input');
  const [formData, setFormData] = useState<{
    make: string;
    model: string;
    year: number;
    trim: string;
    condition: 'new' | 'used';
    odometerKm: string;
  }>({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    trim: '',
    condition: 'new',
    odometerKm: '',
  });
  const [query, setQuery] = useState('');
  const [origin, setOrigin] = useState<Origin>('catalogue');
  const [sourceLinks, setSourceLinks] = useState<SourceLink[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  // Cancel any in-flight research only when the modal unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);
  const [carConfig, setCarConfig] = useState<CarConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const atCap = state.cars.length >= 5;

  async function handleResearch() {
    if (!formData.make || !formData.model || !formData.year) {
      setError('Please fill in make, model, and year.');
      return;
    }

    setError(null);
    setErrorCode(null);
    setStage('loading');
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await researchVehicle(
        {
          make: formData.make.trim(),
          model: formData.model.trim(),
          year: formData.year,
          trim: formData.trim.trim() || undefined,
          ...(formData.condition === 'used'
            ? { condition: 'used' as const, odometerKm: parseOdometer(formData.odometerKm) }
            : {}),
          // Duty, rego and CTP are calculated by the app for the ACT.
          state: 'ACT',
        },
        controller.signal,
      );

      const config = mergeResearchResultToConfig(result, state.globalDefaults);
      setCarConfig(withUniqueName(config));
      setOrigin('ai');
      setSourceLinks(aiSourceLinks(result));
      setStage('summary');
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        setStage('input');
        return;
      }
      setError(e instanceof Error ? e.message : 'An unexpected error occurred.');
      setErrorCode(e instanceof ResearchApiError ? e.code : null);
      setStage('input');
    }
  }

  function parseOdometer(text: string): number | undefined {
    const km = parseInt(text.replace(/[^\d]/g, ''), 10);
    return Number.isFinite(km) && km > 0 && km <= 1_000_000 ? km : undefined;
  }

  function withUniqueName(config: CarConfig): CarConfig {
    const taken = new Set(state.cars.map(c => c.name));
    if (!taken.has(config.name)) return config;
    let n = 2;
    while (taken.has(`${config.name} (${n})`)) n++;
    return { ...config, name: `${config.name} (${n})` };
  }

  function aiSourceLinks(result: ResearchResult): SourceLink[] {
    const own = Object.entries(result.sources)
      .filter(([, value]) => value)
      .map(([key, value]) => ({ label: SOURCE_LABELS[key] ?? key, value }));
    const cited = result.citations.map(c => ({ label: c.title, value: c.url }));
    return [...own, ...cited];
  }

  function handlePickCatalogue(vehicle: CatalogueVehicle) {
    const config = mergeResearchResultToConfig(
      {
        name: `${vehicle.year ? `${vehicle.year} ` : ''}${vehicle.make} ${vehicle.model} ${vehicle.variant}`.trim(),
        fuelType: vehicle.fuelType,
        purchasePrice: vehicle.purchasePrice,
        petrolConsumption: vehicle.petrolConsumption,
        electricConsumption: vehicle.electricConsumption ?? 0,
        co2GPerKm: vehicle.co2GPerKm ?? 0,
        tareKg: vehicle.tareKg ?? 0,
        servicingCostPerYear: vehicle.servicingCostPerYear ?? 0,
        insurancePerYear: 0,
        isUsed: vehicle.isUsed ?? false,
      },
      state.globalDefaults,
    );
    setCarConfig(withUniqueName(config));
    setOrigin('catalogue');
    setSourceLinks(
      Object.entries(vehicle.sources)
        .filter(([, value]) => value)
        .map(([key, value]) => ({ label: SOURCE_LABELS[key] ?? key, value: value as string })),
    );
    setError(null);
    setStage('summary');
  }

  function handleCancelResearch() {
    abortRef.current?.abort();
    setStage('input');
  }

  function handleAddToComparison() {
    if (carConfig && !atCap) {
      addCar(carConfig);
      onClose();
    }
  }

  function handleEditDetails() {
    setStage('expanded');
  }

  function handleUpdateConfig(partial: Partial<CarConfig>) {
    if (carConfig) {
      setCarConfig({ ...carConfig, ...partial });
    }
  }

  function handleFuelTypeChange(fuelType: FuelType) {
    if (carConfig) {
      setCarConfig({
        ...carConfig,
        fuelType,
        // Reset consumption values to reasonable defaults for new fuel type
        petrolConsumption: fuelType === 'ev' ? 0 : (fuelType === 'hybrid' ? 4.5 : fuelType === 'phev' ? 5 : 8),
        electricConsumption: (fuelType === 'ev' || fuelType === 'phev') ? (fuelType === 'ev' ? 15 : 18) : 0,
        phevElectricPercent: fuelType === 'phev' ? 60 : 0,
        co2GPerKm: fuelType === 'ev' ? undefined : carConfig.co2GPerKm,
        ...depreciationDefaultsFor(fuelType, carConfig.isUsed),
      });
    }
  }

  function renderInputStage() {
    const used = formData.condition === 'used';
    const matches = searchCatalogue(query, used ? USED_CATALOGUE : VEHICLE_CATALOGUE);
    const inputClass =
      'w-full px-3 py-2 text-base md:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400';
    return (
      <>
        <div role="radiogroup" aria-label="New or used" className="mb-4 grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-lg">
          {(['new', 'used'] as const).map(c => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={formData.condition === c}
              onClick={() => setFormData({ ...formData, condition: c })}
              className={`min-h-10 md:min-h-0 py-1.5 text-sm rounded-md transition-colors ${
                formData.condition === c ? 'bg-white shadow text-purple-700 font-medium' : 'text-gray-600'
              }`}
            >
              {c === 'new' ? 'New car' : 'Used car'}
            </button>
          ))}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="catalogue-search">
            {used ? 'Popular used cars' : 'Popular cars'}
          </label>
          <input
            id="catalogue-search"
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search, e.g. RAV4, EV, Kia"
            className={inputClass}
          />
          <ul className="mt-2 max-h-64 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg">
            {matches.length === 0 && (
              <li className="px-3 py-3 text-sm text-gray-400">No match in the list.</li>
            )}
            {matches.map(v => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => handlePickCatalogue(v)}
                  disabled={atCap}
                  className="w-full min-h-11 md:min-h-0 px-3 py-2 flex items-center justify-between gap-3 text-left
                             hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-800 truncate">{v.year ? `${v.year} ` : ''}{v.make} {v.model}</span>
                    <span className="block text-xs text-gray-500 truncate">{v.variant} · {v.fuelType.toUpperCase()}</span>
                  </span>
                  <span className="text-sm text-gray-700 shrink-0">{formatCurrency(v.purchasePrice)}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-gray-400">
            {used
              ? `Typical used prices (middle of the CarsGuide guide range), checked ${USED_CATALOGUE_AS_OF}. Yours will vary with km and condition.`
              : `List prices before on-road costs, checked ${CATALOGUE_AS_OF}.`}{' '}
            Duty, rego and CTP are added from ACT rules.
          </p>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700">Not in the list?</h3>
          {aiAvailable ? (
            <>
              <p className="text-xs text-gray-500 mb-3">✨ Look it up: AI searches the web for its price, fuel use and running costs.</p>
              <div className="space-y-3">
                <div role="radiogroup" aria-label="New or used" className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-lg">
                  {(['new', 'used'] as const).map(c => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={formData.condition === c}
                      onClick={() => setFormData({ ...formData, condition: c })}
                      className={`min-h-10 md:min-h-0 py-1.5 text-sm rounded-md transition-colors ${
                        formData.condition === c ? 'bg-white shadow text-purple-700 font-medium' : 'text-gray-600'
                      }`}
                    >
                      {c === 'new' ? 'New' : 'Used'}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1" htmlFor="ai-make">Make <span className="text-red-500">*</span></label>
                    <input id="ai-make" type="text" value={formData.make} onChange={e => setFormData({ ...formData, make: e.target.value })} placeholder="e.g., Toyota" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1" htmlFor="ai-model">Model <span className="text-red-500">*</span></label>
                    <input id="ai-model" type="text" value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} placeholder="e.g., RAV4" className={inputClass} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1" htmlFor="ai-year">Year <span className="text-red-500">*</span></label>
                    <input
                      id="ai-year"
                      type="number"
                      inputMode="numeric"
                      value={formData.year}
                      onChange={e => {
                        const year = parseInt(e.target.value, 10);
                        if (Number.isFinite(year)) setFormData({ ...formData, year });
                      }}
                      min={1990}
                      max={new Date().getFullYear() + 1}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1" htmlFor="ai-trim">Variant <span className="text-gray-400">(optional)</span></label>
                    <input id="ai-trim" type="text" value={formData.trim} onChange={e => setFormData({ ...formData, trim: e.target.value })} placeholder="e.g., GXL Hybrid" className={inputClass} />
                  </div>
                </div>
                {formData.condition === 'used' && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1" htmlFor="ai-km">Odometer <span className="text-gray-400">(optional)</span></label>
                    <input
                      id="ai-km"
                      type="text"
                      inputMode="numeric"
                      value={formData.odometerKm}
                      onChange={e => setFormData({ ...formData, odometerKm: e.target.value })}
                      placeholder="e.g., 60000 km"
                      className={inputClass}
                    />
                    <p className="text-xs text-gray-500 mt-1">The price is estimated from current second-hand listings for this year and km.</p>
                  </div>
                )}
              </div>
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <p>{error}</p>
                  {errorCode === 'not_configured' && (
                    <p className="mt-2 text-xs text-red-600">
                      The server has no AI key yet. Locally, add <code>AI_API_KEY</code> to <code>.dev.vars</code>;
                      in production run <code>npx wrangler secret put AI_API_KEY</code>. See the README.
                    </p>
                  )}
                </div>
              )}
              <button
                onClick={handleResearch}
                disabled={!formData.make || !formData.model || !formData.year || atCap}
                className="mt-4 w-full min-h-11 px-3 md:px-4 py-2 text-sm md:text-base bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Look it up
              </button>
            </>
          ) : (
            <p className="text-xs text-gray-500 mt-1">
              Close this and use Add Car for a card with typical values, then type in your car&rsquo;s figures.
            </p>
          )}
        </div>
        {atCap && (
          <p className="mt-3 text-xs text-gray-500 text-center">Remove a car from the comparison to add another.</p>
        )}
      </>
    );
  }

  function renderLoadingStage() {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-700 font-medium">
          Researching {formData.condition === 'used' ? 'used ' : ''}{formData.make} {formData.model} {formData.year}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Searching the web for its price, fuel use and running costs...
        </p>
        <button
          type="button"
          onClick={handleCancelResearch}
          className="mt-6 min-h-11 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  function renderSummaryStage() {
    if (!carConfig) return null;

    const showPetrol = carConfig.fuelType !== 'ev';
    const showElectric = carConfig.fuelType === 'ev' || carConfig.fuelType === 'phev';

    return (
      <div className="space-y-4">
        {/* Compact card */}
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-100">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-800 text-lg break-words">{carConfig.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  carConfig.fuelType === 'ev' ? 'bg-green-100 text-green-700' :
                  carConfig.fuelType === 'hybrid' ? 'bg-teal-100 text-teal-700' :
                  carConfig.fuelType === 'phev' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {carConfig.fuelType.toUpperCase()}
                </span>
                <span className="text-xs text-gray-500">
                  {origin === 'catalogue' ? `Catalogue, ${carConfig.isUsed ? USED_CATALOGUE_AS_OF : CATALOGUE_AS_OF}` : 'AI lookup: check the figures'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-700">
                {formatCurrency(carConfig.purchasePrice)}
              </div>
              <div className="text-xs text-gray-500">{carConfig.isUsed ? 'Used price estimate' : 'Purchase Price'}</div>
            </div>
          </div>

          {/* Key specs */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {showPetrol && (
              <div className="bg-white/60 rounded px-2 py-1.5">
                <div className="text-gray-500 text-xs">Petrol</div>
                <div className="font-medium">{carConfig.petrolConsumption} L/100km</div>
              </div>
            )}
            {showElectric && (
              <div className="bg-white/60 rounded px-2 py-1.5">
                <div className="text-gray-500 text-xs">Electric</div>
                <div className="font-medium">{carConfig.electricConsumption} kWh/100km</div>
              </div>
            )}
            <div className="bg-white/60 rounded px-2 py-1.5">
              <div className="text-gray-500 text-xs">Stamp duty (ACT)</div>
              <div className="font-medium">{formatCurrency(autoStampDutyFor(carConfig))}</div>
            </div>
            <div className="bg-white/60 rounded px-2 py-1.5">
              <div className="text-gray-500 text-xs">Emissions category</div>
              <div className="font-medium">{emissionsCategoryFor(carConfig)}{carConfig.co2GPerKm ? ` (${carConfig.co2GPerKm} g/km)` : ''}</div>
            </div>
            <div className="bg-white/60 rounded px-2 py-1.5">
              <div className="text-gray-500 text-xs">Servicing</div>
              <div className="font-medium">{formatCurrency(carConfig.servicingCostPerYear)}/yr</div>
            </div>
            <div className="bg-white/60 rounded px-2 py-1.5">
              <div className="text-gray-500 text-xs">Insurance{origin === 'catalogue' ? ' (typical)' : ' (estimate)'}</div>
              <div className="font-medium">{formatCurrency(carConfig.insurancePerYear)}/yr</div>
            </div>
            <div className="bg-white/60 rounded px-2 py-1.5">
              <div className="text-gray-500 text-xs">CTP</div>
              <div className="font-medium">{formatCurrency(carConfig.useCustomCtp ? carConfig.ctpPerYear : ACT_CTP_PREMIUM)}/yr</div>
            </div>
            <div className="bg-white/60 rounded px-2 py-1.5">
              <div className="text-gray-500 text-xs">Registration</div>
              <div className="font-medium">{formatCurrency(carConfig.useCustomRego ? carConfig.regoPerYear : autoRegoFor(carConfig))}/yr</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Insurance is a rough figure: swap in your quote. Duty, rego and CTP follow ACT rules.
          </p>
        </div>

        {/* Sources */}
        {sourceLinks.length > 0 && (
          <div>
            <button
              onClick={() => setSourcesOpen(!sourcesOpen)}
              className="min-h-11 md:min-h-0 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <span>Sources</span>
              <svg
                className={`w-3 h-3 transition-transform ${sourcesOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {sourcesOpen && (
              <div className="mt-2 space-y-1 text-xs">
                {sourceLinks.map(({ label, value }, i) => {
                    // Model output is untrusted: only http(s) URLs become links.
                    const href = safeHttpUrl(value);
                    return (
                      <div key={`${label}-${i}`} className="flex items-start gap-2">
                        <span className="text-gray-400 shrink-0 max-w-[40%] truncate">{label}:</span>
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline break-all"
                          >
                            {new URL(href).hostname}
                          </a>
                        ) : (
                          <span className="text-gray-600 break-words">{value}</span>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setStage('input')}
            className="min-h-11 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleEditDetails}
            className="flex-1 min-h-11 px-3 md:px-4 py-2 text-sm md:text-base bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Edit details
          </button>
          <button
            onClick={handleAddToComparison}
            disabled={atCap}
            className="flex-1 min-h-11 px-3 md:px-4 py-2 text-sm md:text-base bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            title={atCap ? 'Comparison is full (5 cars max)' : undefined}
          >
            Add to Comparison
          </button>
        </div>
        {atCap && (
          <div className="text-xs text-gray-500 text-center">
            Remove a car from the comparison to add another.
          </div>
        )}
      </div>
    );
  }

  function renderExpandedStage() {
    if (!carConfig) return null;

    const showPetrol = carConfig.fuelType !== 'ev';
    const showElectric = carConfig.fuelType === 'ev' || carConfig.fuelType === 'phev';
    const showPhevSplit = carConfig.fuelType === 'phev';

    return (
      <div>
        <div className="py-2">
          <FuelTypePicker value={carConfig.fuelType} onChange={handleFuelTypeChange} />
        </div>

        <Section title="Purchase">
          <NumberInput
            label="Purchase Price"
            value={carConfig.purchasePrice}
            onChange={v => handleUpdateConfig({ purchasePrice: v })}
            prefix="$"
            step={1000}
            min={0}
          />
          <ToggleSwitch
            label="Used car"
            checked={carConfig.isUsed ?? false}
            onChange={v => handleUpdateConfig({ isUsed: v, ...depreciationDefaultsFor(carConfig.fuelType, v) })}
          />
          <NumberInput
            label="Stamp Duty"
            value={carConfig.useCustomStampDuty ? carConfig.stampDuty : autoStampDutyFor(carConfig)}
            onChange={v => handleUpdateConfig({ stampDuty: v, useCustomStampDuty: true })}
            prefix="$"
            tooltip={carConfig.isUsed
              ? 'Calculated from ACT used-vehicle duty rates. Edit to override.'
              : 'Calculated from ACT emissions-based duty. Edit to override.'}
          />
          {carConfig.fuelType !== 'ev' && (
            <NumberInput
              label="CO₂ Emissions"
              value={carConfig.co2GPerKm ?? 0}
              onChange={v => handleUpdateConfig({ co2GPerKm: v > 0 ? v : undefined })}
              suffix="g/km"
              max={600}
              integer
              tooltip="Official combined CO₂. 0 = estimate from fuel use."
            />
          )}
          <NumberInput
            label="Tare Mass"
            value={carConfig.tareKg ?? 0}
            onChange={v => handleUpdateConfig({ tareKg: v > 0 ? v : undefined })}
            suffix="kg"
            max={5000}
            step={10}
            integer
            tooltip="ACT rego roughly doubles from 2,505 kg. 0 = assume under that."
          />
          <ToggleSwitch
            label="Car Loan"
            checked={carConfig.hasLoan}
            onChange={v =>
              handleUpdateConfig({
                hasLoan: v,
                ...(v && carConfig.loanAmount <= 0 ? { loanAmount: carConfig.purchasePrice } : {}),
              })
            }
          />
          {carConfig.hasLoan && (
            <>
              <NumberInput
                label="Loan Amount"
                value={carConfig.loanAmount}
                onChange={v => handleUpdateConfig({ loanAmount: v })}
                prefix="$"
                step={1000}
              />
              <NumberInput
                label="Interest Rate"
                value={carConfig.interestRate}
                onChange={v => handleUpdateConfig({ interestRate: v })}
                suffix="%"
                step={0.1}
                min={0}
              />
              <NumberInput
                label="Loan Term"
                value={carConfig.loanTermYears}
                onChange={v => handleUpdateConfig({ loanTermYears: v })}
                suffix="yrs"
                min={1}
                max={10}
                integer
              />
            </>
          )}
        </Section>

        <Section title="Fuel & Energy">
          {showPetrol && (
            <>
              <NumberInput
                label="Petrol Price"
                value={carConfig.petrolPrice}
                onChange={v => handleUpdateConfig({ petrolPrice: v, useCustomPetrolPrice: true })}
                prefix="$"
                suffix="/L"
                step={0.05}
              />
              <NumberInput
                label="Petrol Consumption"
                value={carConfig.petrolConsumption}
                onChange={v => handleUpdateConfig({ petrolConsumption: v })}
                suffix="L/100km"
                step={0.1}
              />
            </>
          )}
          {showElectric && (
            <>
              <NumberInput
                label="Electricity Price"
                value={carConfig.electricityPrice}
                onChange={v => handleUpdateConfig({ electricityPrice: v, useCustomElectricityPrice: true })}
                prefix="$"
                suffix="/kWh"
                step={0.01}
              />
              <NumberInput
                label="Electric Consumption"
                value={carConfig.electricConsumption}
                onChange={v => handleUpdateConfig({ electricConsumption: v })}
                suffix="kWh/100km"
                step={0.1}
              />
              <ToggleSwitch
                label="Solar Charging"
                checked={carConfig.useSolarCharging}
                onChange={v => handleUpdateConfig({ useSolarCharging: v })}
              />
              {carConfig.useSolarCharging && (
                <>
                  <NumberInput
                    label="Solar Rate"
                    value={carConfig.solarRate}
                    onChange={v => handleUpdateConfig({ solarRate: v })}
                    prefix="$"
                    suffix="/kWh"
                    step={0.01}
                  />
                  <SliderInput
                    label="Solar Charging %"
                    value={carConfig.solarChargingPercent}
                    onChange={v => handleUpdateConfig({ solarChargingPercent: v })}
                    min={0}
                    max={100}
                    suffix="%"
                  />
                </>
              )}
            </>
          )}
          {showPhevSplit && (
            <SliderInput
              label="Electric Driving %"
              value={carConfig.phevElectricPercent}
              onChange={v => handleUpdateConfig({ phevElectricPercent: v })}
              min={0}
              max={100}
              suffix="%"
            />
          )}
        </Section>

        <Section title="Driving">
          <NumberInput
            label="Annual Km"
            value={carConfig.annualKm}
            onChange={v => handleUpdateConfig({ annualKm: v, useCustomAnnualKm: true })}
            suffix="km"
            step={1000}
            min={0}
          />
        </Section>

        <Section title="Ongoing Costs">
          <NumberInput
            label="Servicing"
            value={carConfig.servicingCostPerYear}
            onChange={v => handleUpdateConfig({ servicingCostPerYear: v })}
            prefix="$"
            suffix="/yr"
          />
          <NumberInput
            label="Insurance"
            value={carConfig.insurancePerYear}
            onChange={v => handleUpdateConfig({ insurancePerYear: v })}
            prefix="$"
            suffix="/yr"
          />
          <NumberInput
            label="CTP"
            value={carConfig.useCustomCtp ? carConfig.ctpPerYear : ACT_CTP_PREMIUM}
            onChange={v => handleUpdateConfig({ ctpPerYear: v, useCustomCtp: true })}
            prefix="$"
            suffix="/yr"
          />
          <NumberInput
            label="Registration"
            value={carConfig.useCustomRego ? carConfig.regoPerYear : autoRegoFor(carConfig)}
            onChange={v => handleUpdateConfig({ regoPerYear: v, useCustomRego: true })}
            prefix="$"
            suffix="/yr"
          />
          {carConfig.fuelType === 'ev' && (
            <NumberInput
              label="Free Rego Years"
              value={carConfig.evFreeRegoYears}
              onChange={v => handleUpdateConfig({ evFreeRegoYears: v })}
              suffix="yrs"
              min={0}
              max={5}
              integer
            />
          )}
        </Section>

        <Section title="Depreciation">
          <SliderInput
            label="First Year"
            value={carConfig.firstYearDepreciationPercent}
            onChange={v => handleUpdateConfig({ firstYearDepreciationPercent: v })}
            min={0}
            max={50}
            suffix="%"
          />
          <SliderInput
            label="Each Year After"
            value={carConfig.annualDepreciationPercent}
            onChange={v => handleUpdateConfig({ annualDepreciationPercent: v })}
            min={0}
            max={30}
            suffix="%"
          />
        </Section>

        {/* Actions */}
        <div className="sticky -bottom-4 -mx-5 -mb-4 px-5 py-3 flex gap-3 mt-4 bg-white border-t border-gray-200">
          <button
            onClick={() => setStage('summary')}
            className="flex-1 min-h-11 px-3 md:px-4 py-2 text-sm md:text-base bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Back to Summary
          </button>
          <button
            onClick={handleAddToComparison}
            disabled={atCap}
            className="flex-1 min-h-11 px-3 md:px-4 py-2 text-sm md:text-base bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            title={atCap ? 'Comparison is full (5 cars max)' : undefined}
          >
            Add to Comparison
          </button>
        </div>
        {atCap && (
          <div className="text-xs text-gray-500 text-center pt-5">
            Remove a car from the comparison to add another.
          </div>
        )}
      </div>
    );
  }

  return (
    <Modal
      onClose={onClose}
      title={
        <>
          <span>Pick a car</span>
        </>
      }
    >
      {stage === 'input' && renderInputStage()}
      {stage === 'loading' && renderLoadingStage()}
      {stage === 'summary' && renderSummaryStage()}
      {stage === 'expanded' && renderExpandedStage()}
    </Modal>
  );
}
