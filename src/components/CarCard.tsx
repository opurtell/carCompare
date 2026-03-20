import { useState } from 'react';
import type { CarConfig, FuelType, GlobalDefaults } from '../types/car';
import { NumberInput } from './ui/NumberInput';
import { SliderInput } from './ui/SliderInput';
import { ToggleSwitch } from './ui/ToggleSwitch';
import { FuelTypePicker } from './ui/FuelTypePicker';
import { Section } from './ui/Section';
import { formatCurrency } from '../utils/formatters';
import { getCarColor } from '../utils/colors';
import { calculateCarResult } from '../calculations/costEngine';
import { calculateActStampDuty } from '../calculations/actSpecific';
import { createDefaultCarConfig } from '../data/defaults';
import { resolveCarConfig } from '../utils/resolveCarConfig';
import { useApp } from '../state/AppContext';
import { isCarDirtyFromLibrary } from '../utils/isCarDirty';

interface CarCardProps {
  car: CarConfig;
  index: number;
  comparisonYears: number;
  globalDefaults: GlobalDefaults;
  onUpdate: (car: CarConfig) => void;
  onRemove: (carId: string) => void;
}

export function CarCard({ car, index, comparisonYears, globalDefaults, onUpdate, onRemove }: CarCardProps) {
  const [costBreakdownOpen, setCostBreakdownOpen] = useState(false);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const { state, saveToLibrary, updateLibraryEntry } = useApp();
  const { showDepreciation } = state;
  const isLinked = Boolean(car.libraryId);
  const isDirty = isCarDirtyFromLibrary(car, state.library);
  const color = getCarColor(index);
  const autoStampDuty = calculateActStampDuty(car.fuelType, car.purchasePrice);
  const resolvedCar = resolveCarConfig(car, globalDefaults);
  const result = calculateCarResult(resolvedCar, comparisonYears);

  const runningCosts = result.yearlyBreakdowns.reduce(
    (sum, yr) => sum + yr.fuel + yr.servicing + yr.insurance + yr.ctp + yr.registration + yr.loanInterest,
    0,
  );
  const purchaseCost = car.purchasePrice + result.stampDuty;
  const inputCost = purchaseCost + runningCosts;
  const totalDepreciation = result.yearlyBreakdowns.reduce((sum, yr) => sum + yr.depreciation, 0);
  const resaleValue = result.yearlyBreakdowns[result.yearlyBreakdowns.length - 1]?.vehicleValue ?? 0;
  const netPositionAtResale = showDepreciation ? resaleValue - inputCost : car.purchasePrice - inputCost;

  function update(partial: Partial<CarConfig>) {
    onUpdate({ ...car, ...partial });
  }

  function handleFuelTypeChange(fuelType: FuelType) {
    const defaults = createDefaultCarConfig(fuelType);
    onUpdate({
      ...car,
      fuelType,
      petrolConsumption: defaults.petrolConsumption,
      electricConsumption: defaults.electricConsumption,
      phevElectricPercent: defaults.phevElectricPercent,
      servicingCostPerYear: defaults.servicingCostPerYear,
      stampDuty: defaults.stampDuty,
      useCustomStampDuty: false,
      evFreeRegoYears: defaults.evFreeRegoYears,
    });
  }

  const showPetrol = car.fuelType !== 'ev';
  const showElectric = car.fuelType === 'ev' || car.fuelType === 'phev';
  const showPhevSplit = car.fuelType === 'phev';

  return (
    <div
      className="w-80 shrink-0 rounded-xl border-2 bg-white shadow-sm flex flex-col relative"
      style={{ borderColor: color.hex }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-t-lg"
        style={{ backgroundColor: color.bg }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color.hex }}
          />
          <input
            type="text"
            value={car.name}
            onChange={e => update({ name: e.target.value })}
            className="bg-transparent font-semibold text-gray-800 w-36 focus:outline-none
                       focus:border-b focus:border-gray-400"
          />
        </div>
        <button
          onClick={() => {
            if (isLinked && isDirty) {
              setConfirmingRemoval(true);
            } else {
              onRemove(car.id);
            }
          }}
          className="text-gray-400 hover:text-red-500 text-lg leading-none"
          title="Remove car"
        >
          &times;
        </button>
      </div>

      {/* Library actions */}
      <div className="px-4 pt-2 flex items-center gap-2 flex-wrap">
        {!isLinked ? (
          <button
            onClick={() => saveToLibrary(car)}
            className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500
                       hover:bg-blue-50 hover:text-blue-600 border border-gray-200"
          >
            Save to library
          </button>
        ) : (
          <span className="text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
            ✓ Saved to library
          </span>
        )}
        {isLinked && isDirty && (
          <button
            onClick={() => updateLibraryEntry(car.libraryId!, car)}
            className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700
                       hover:bg-amber-100 border border-amber-200"
          >
            Update library entry
          </button>
        )}
      </div>

      <div className="px-4 py-2 flex flex-col gap-1 overflow-y-auto flex-1">
        {/* Fuel Type */}
        <div className="py-2">
          <FuelTypePicker value={car.fuelType} onChange={handleFuelTypeChange} />
        </div>

        {/* Purchase */}
        <Section title="Purchase">
          <NumberInput
            label="Purchase Price"
            value={car.purchasePrice}
            onChange={v => update({ purchasePrice: v })}
            prefix="$"
            step={1000}
            min={0}
          />
          <NumberInput
            label="Stamp Duty"
            value={car.useCustomStampDuty ? car.stampDuty : autoStampDuty}
            onChange={v => update({ stampDuty: v, useCustomStampDuty: true })}
            prefix="$"
            tooltip={car.fuelType === 'ev' ? 'EVs are exempt from stamp duty in ACT' : 'Auto-calculated from purchase price. Edit to override.'}
          />
          {car.useCustomStampDuty && (
            <div className="flex justify-end -mt-1">
              <button
                onClick={() => update({ useCustomStampDuty: false })}
                className="text-xs text-blue-500 hover:text-blue-700"
              >
                Reset to auto
              </button>
            </div>
          )}
          <ToggleSwitch
            label="Car Loan"
            checked={car.hasLoan}
            onChange={v => update({ hasLoan: v })}
          />
          {car.hasLoan && (
            <>
              <NumberInput
                label="Loan Amount"
                value={car.loanAmount}
                onChange={v => update({ loanAmount: v })}
                prefix="$"
                step={1000}
              />
              <NumberInput
                label="Interest Rate"
                value={car.interestRate}
                onChange={v => update({ interestRate: v })}
                suffix="%"
                step={0.1}
                min={0}
              />
              <NumberInput
                label="Loan Term"
                value={car.loanTermYears}
                onChange={v => update({ loanTermYears: v })}
                suffix="yrs"
                min={1}
                max={10}
              />
            </>
          )}
        </Section>

        {/* Fuel & Energy */}
        <Section title="Fuel & Energy">
          {showPetrol && (
            <>
              <NumberInput
                label="Petrol Price"
                value={car.useCustomPetrolPrice ? car.petrolPrice : globalDefaults.petrolPrice}
                onChange={v => update({ petrolPrice: v, useCustomPetrolPrice: true })}
                prefix="$"
                suffix="/L"
                step={0.05}
              />
              {car.useCustomPetrolPrice && (
                <div className="flex justify-end -mt-1">
                  <button
                    onClick={() => update({ useCustomPetrolPrice: false })}
                    className="text-xs text-blue-500 hover:text-blue-700"
                  >
                    Reset to global
                  </button>
                </div>
              )}
              <NumberInput
                label="Petrol Consumption"
                value={car.petrolConsumption}
                onChange={v => update({ petrolConsumption: v })}
                suffix="L/100km"
                step={0.1}
              />
            </>
          )}
          {showElectric && (
            <>
              <NumberInput
                label="Electricity Price"
                value={car.useCustomElectricityPrice ? car.electricityPrice : globalDefaults.electricityPrice}
                onChange={v => update({ electricityPrice: v, useCustomElectricityPrice: true })}
                prefix="$"
                suffix="/kWh"
                step={0.01}
              />
              {car.useCustomElectricityPrice && (
                <div className="flex justify-end -mt-1">
                  <button
                    onClick={() => update({ useCustomElectricityPrice: false })}
                    className="text-xs text-blue-500 hover:text-blue-700"
                  >
                    Reset to global
                  </button>
                </div>
              )}
              <NumberInput
                label="Electric Consumption"
                value={car.electricConsumption}
                onChange={v => update({ electricConsumption: v })}
                suffix="kWh/100km"
                step={0.1}
              />
              <ToggleSwitch
                label="Solar Charging"
                checked={car.useSolarCharging}
                onChange={v => update({ useSolarCharging: v })}
              />
              {car.useSolarCharging && (
                <>
                  <NumberInput
                    label="Solar Rate"
                    value={car.solarRate}
                    onChange={v => update({ solarRate: v })}
                    prefix="$"
                    suffix="/kWh"
                    step={0.01}
                  />
                  <SliderInput
                    label="Solar Charging %"
                    value={car.solarChargingPercent}
                    onChange={v => update({ solarChargingPercent: v })}
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
              value={car.phevElectricPercent}
              onChange={v => update({ phevElectricPercent: v })}
              min={0}
              max={100}
              suffix="%"
            />
          )}
        </Section>

        {/* Driving */}
        <Section title="Driving">
          <NumberInput
            label="Annual Km"
            value={car.useCustomAnnualKm ? car.annualKm : globalDefaults.annualKm}
            onChange={v => update({ annualKm: v, useCustomAnnualKm: true })}
            suffix="km"
            step={1000}
            min={0}
          />
          {car.useCustomAnnualKm && (
            <div className="flex justify-end -mt-1">
              <button
                onClick={() => update({ useCustomAnnualKm: false })}
                className="text-xs text-blue-500 hover:text-blue-700"
              >
                Reset to global
              </button>
            </div>
          )}
        </Section>

        {/* Ongoing Costs */}
        <Section title="Ongoing Costs">
          <NumberInput
            label="Servicing"
            value={car.servicingCostPerYear}
            onChange={v => update({ servicingCostPerYear: v })}
            prefix="$"
            suffix="/yr"
          />
          <NumberInput
            label="Insurance"
            value={car.insurancePerYear}
            onChange={v => update({ insurancePerYear: v })}
            prefix="$"
            suffix="/yr"
          />
          <NumberInput
            label="CTP"
            value={car.ctpPerYear}
            onChange={v => update({ ctpPerYear: v })}
            prefix="$"
            suffix="/yr"
            tooltip="ACT Compulsory Third Party insurance (~$600/yr)"
          />
          <NumberInput
            label="Registration"
            value={car.regoPerYear}
            onChange={v => update({ regoPerYear: v })}
            prefix="$"
            suffix="/yr"
          />
          {car.fuelType === 'ev' && (
            <NumberInput
              label="Free Rego Years"
              value={car.evFreeRegoYears}
              onChange={v => update({ evFreeRegoYears: v })}
              suffix="yrs"
              min={0}
              max={5}
              tooltip="ACT offers 2 years free registration for new EVs"
            />
          )}
        </Section>

        {/* Depreciation */}
        <Section title="Depreciation">
          <SliderInput
            label="Annual Rate"
            value={car.annualDepreciationPercent}
            onChange={v => update({ annualDepreciationPercent: v })}
            min={0}
            max={30}
            suffix="%"
          />
        </Section>
      </div>

      {/* Summary badge */}
      <div
        className="px-4 py-4 border-t rounded-b-lg"
        style={{ backgroundColor: color.bg, borderColor: color.hex + '33' }}
        aria-label={`${comparisonYears} year costs: Total outlay ${formatCurrency(inputCost)}. Net at Resale: ${netPositionAtResale < 0 ? 'negative' : netPositionAtResale > 0 ? 'positive' : 'zero'} ${formatCurrency(netPositionAtResale)}`}
      >
        <div className="space-y-1 text-center">
          {/* Total Cost */}
          <div className="flex items-baseline justify-center gap-1.5">
            <span className="text-xs text-gray-600">Total outlay:</span>
            <span className="text-xl font-bold" style={{ color: color.hex }}>
              {formatCurrency(inputCost)}
            </span>
          </div>

          {/* Net at Resale */}
          <div className="flex items-baseline justify-center gap-1.5">
            <span className="text-xs text-gray-600">Net at Resale:</span>
            <span
              className="text-xl font-bold"
              style={{
                color:
                  netPositionAtResale < 0
                    ? '#dc2626' // red-600
                    : netPositionAtResale > 0
                      ? '#16a34a' // green-600
                      : color.hex,
              }}
            >
              {formatCurrency(netPositionAtResale)}
            </span>
          </div>
        </div>
        <button
          onClick={() => setCostBreakdownOpen(o => !o)}
          className="w-full flex items-center justify-center gap-1 mt-2 text-xs text-gray-500 hover:text-gray-700"
          aria-expanded={costBreakdownOpen}
          aria-controls={`breakdown-${car.id}`}
        >
          <span>Breakdown</span>
          <svg
            className={`w-3 h-3 transition-transform ${costBreakdownOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {costBreakdownOpen && (
          <div id={`breakdown-${car.id}`} className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Input Cost</span>
              <span className="font-medium text-gray-800">{formatCurrency(inputCost)}</span>
            </div>
            <div className="flex justify-between pl-3">
              <span className="text-gray-400">Purchase + Duty</span>
              <span className="text-gray-500">{formatCurrency(purchaseCost)}</span>
            </div>
            <div className="flex justify-between pl-3">
              <span className="text-gray-400">Running Costs</span>
              <span className="text-gray-500">{formatCurrency(runningCosts)}</span>
            </div>
            {showDepreciation && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Depreciation</span>
                  <span className="font-medium text-gray-800">{formatCurrency(totalDepreciation)}</span>
                </div>
                <div className="flex justify-between pl-3">
                  <span className="text-gray-400">Remaining Value</span>
                  <span className="text-gray-500">{formatCurrency(resaleValue)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Net at Resale</span>
              <span
                className="font-medium"
                style={{
                  color:
                    netPositionAtResale < 0
                      ? '#dc2626' // red-600
                      : netPositionAtResale > 0
                        ? '#16a34a' // green-600
                        : color.hex,
                }}
              >
                {formatCurrency(netPositionAtResale)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Removal confirmation */}
      {confirmingRemoval && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/95 p-4">
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 w-full">
            <p className="text-sm font-medium text-amber-900 mb-3">
              Save changes back to library before removing?
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  updateLibraryEntry(car.libraryId!, car);
                  onRemove(car.id);
                }}
                className="text-xs px-3 py-1.5 rounded bg-green-700 text-white hover:bg-green-800"
              >
                Yes, update library
              </button>
              <button
                onClick={() => onRemove(car.id)}
                className="text-xs px-3 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                No, just remove
              </button>
              <button
                onClick={() => setConfirmingRemoval(false)}
                className="text-xs px-3 py-1.5 rounded text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
