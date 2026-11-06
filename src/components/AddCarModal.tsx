import { useEffect, useRef, useState } from 'react';
import { useApp } from '../state/AppContext';
import { researchVehicle, ResearchApiError, type ResearchResult } from '../api/carResearchApi';
import { AU_STATES, safeHttpUrl, type AUStateCode } from '../../shared/research';
import { mergeResearchResultToConfig } from '../utils/carConfigMerger';
import type { CarConfig, FuelType } from '../types/car';
import { formatCurrency } from '../utils/formatters';
import { NumberInput } from './ui/NumberInput';
import { SliderInput } from './ui/SliderInput';
import { ToggleSwitch } from './ui/ToggleSwitch';
import { FuelTypePicker } from './ui/FuelTypePicker';
import { Section } from './ui/Section';

interface AddCarModalProps {
  onClose: () => void;
}

type ModalStage = 'input' | 'loading' | 'summary' | 'expanded';

export function AddCarModal({ onClose }: AddCarModalProps) {
  const { state, addCar } = useApp();
  const [stage, setStage] = useState<ModalStage>('input');
  const [formData, setFormData] = useState<{
    make: string;
    model: string;
    year: number;
    trim: string;
    state: AUStateCode;
  }>({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    trim: '',
    state: 'ACT',
  });
  const abortRef = useRef<AbortController | null>(null);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Cancel any in-flight research only when the modal unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);
  const [researchResult, setResearchResult] = useState<ResearchResult | null>(null);
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
          state: formData.state,
        },
        controller.signal,
      );

      const config = mergeResearchResultToConfig(result, state.globalDefaults);

      setResearchResult(result);
      setCarConfig(config);
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
      });
    }
  }

  function renderInputStage() {
    return (
      <>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Make <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.make}
              onChange={e => setFormData({ ...formData, make: e.target.value })}
              placeholder="e.g., Toyota"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.model}
              onChange={e => setFormData({ ...formData, model: e.target.value })}
              placeholder="e.g., RAV4"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.year}
              onChange={e => {
                const year = parseInt(e.target.value, 10);
                if (Number.isFinite(year)) setFormData({ ...formData, year });
              }}
              min={1990}
              max={new Date().getFullYear() + 1}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trim <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={formData.trim}
              onChange={e => setFormData({ ...formData, trim: e.target.value })}
              placeholder="e.g., GXL Hybrid"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.state}
              onChange={e => setFormData({ ...formData, state: e.target.value as AUStateCode })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {AU_STATES.map(s => (
                <option key={s.code} value={s.code}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
          </div>
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
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleResearch}
            disabled={!formData.make || !formData.model || !formData.year}
            className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Research Vehicle
          </button>
        </div>
      </>
    );
  }

  function renderLoadingStage() {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-700 font-medium">
          Researching {formData.make} {formData.model} {formData.year}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Gathering Australian-specific pricing and costs for {formData.state}...
        </p>
        <button
          type="button"
          onClick={handleCancelResearch}
          className="mt-6 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  function renderSummaryStage() {
    if (!carConfig || !researchResult) return null;

    const showPetrol = carConfig.fuelType !== 'ev';
    const showElectric = carConfig.fuelType === 'ev' || carConfig.fuelType === 'phev';

    return (
      <div className="space-y-4">
        {/* Compact card */}
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-100">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-gray-800 text-lg">{carConfig.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  carConfig.fuelType === 'ev' ? 'bg-green-100 text-green-700' :
                  carConfig.fuelType === 'hybrid' ? 'bg-teal-100 text-teal-700' :
                  carConfig.fuelType === 'phev' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {carConfig.fuelType.toUpperCase()}
                </span>
                <span className="text-xs text-gray-500">{formData.state}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-700">
                {formatCurrency(carConfig.purchasePrice)}
              </div>
              <div className="text-xs text-gray-500">Purchase Price</div>
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
              <div className="text-gray-500 text-xs">Servicing</div>
              <div className="font-medium">{formatCurrency(carConfig.servicingCostPerYear)}/yr</div>
            </div>
            <div className="bg-white/60 rounded px-2 py-1.5">
              <div className="text-gray-500 text-xs">Insurance</div>
              <div className="font-medium">{formatCurrency(carConfig.insurancePerYear)}/yr</div>
            </div>
            <div className="bg-white/60 rounded px-2 py-1.5">
              <div className="text-gray-500 text-xs">CTP</div>
              <div className="font-medium">{formatCurrency(carConfig.ctpPerYear)}/yr</div>
            </div>
            <div className="bg-white/60 rounded px-2 py-1.5">
              <div className="text-gray-500 text-xs">Registration</div>
              <div className="font-medium">{formatCurrency(carConfig.regoPerYear)}/yr</div>
            </div>
          </div>
        </div>

        {/* Sources */}
        {researchResult.sources && (
          <div>
            <button
              onClick={() => setSourcesOpen(!sourcesOpen)}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
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
                {Object.entries(researchResult.sources)
                  .filter(([, value]) => value)
                  .map(([key, value]) => {
                    // Model output is untrusted: only http(s) URLs become links.
                    const href = safeHttpUrl(value);
                    return (
                      <div key={key} className="flex items-start gap-2">
                        <span className="text-gray-400 capitalize shrink-0">{key.replace(/([A-Z])/g, ' $1')}:</span>
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline break-all"
                          >
                            {value}
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
            onClick={handleEditDetails}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Edit details
          </button>
          <button
            onClick={handleAddToComparison}
            disabled={atCap}
            className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
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
      <div className="max-h-[60vh] overflow-y-auto">
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
          <NumberInput
            label="Stamp Duty"
            value={carConfig.stampDuty}
            onChange={v => handleUpdateConfig({ stampDuty: v, useCustomStampDuty: true })}
            prefix="$"
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
            value={carConfig.ctpPerYear}
            onChange={v => handleUpdateConfig({ ctpPerYear: v })}
            prefix="$"
            suffix="/yr"
          />
          <NumberInput
            label="Registration"
            value={carConfig.regoPerYear}
            onChange={v => handleUpdateConfig({ regoPerYear: v })}
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
            label="Annual Rate"
            value={carConfig.annualDepreciationPercent}
            onChange={v => handleUpdateConfig({ annualDepreciationPercent: v })}
            min={0}
            max={30}
            suffix="%"
          />
        </Section>

        {/* Actions */}
        <div className="flex gap-3 mt-4 pt-4 border-t">
          <button
            onClick={() => setStage('summary')}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Back to Summary
          </button>
          <button
            onClick={handleAddToComparison}
            disabled={atCap}
            className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            title={atCap ? 'Comparison is full (5 cars max)' : undefined}
          >
            Add to Comparison
          </button>
        </div>
        {atCap && (
          <div className="text-xs text-gray-500 text-center mt-2">
            Remove a car from the comparison to add another.
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-car-title"
        className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 id="add-car-title" className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <span className="text-purple-500">✨</span>
            <span>AI-Powered Car Research</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 px-5 py-4">
          {stage === 'input' && renderInputStage()}
          {stage === 'loading' && renderLoadingStage()}
          {stage === 'summary' && renderSummaryStage()}
          {stage === 'expanded' && renderExpandedStage()}
        </div>
      </div>
    </div>
  );
}
