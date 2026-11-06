import type { CarConfig, GlobalDefaults } from '../types/car';
import type { ResearchResult } from '../api/carResearchApi';
import { ACT_DEFAULTS } from '../data/defaults';

export function mergeResearchResultToConfig(
  research: ResearchResult,
  globalDefaults: GlobalDefaults,
): CarConfig {
  return {
    id: crypto.randomUUID(),
    name: research.name || 'New Car',
    fuelType: research.fuelType,
    purchasePrice: research.purchasePrice,
    // The researched duty is state-specific, so keep it as an explicit override rather than
    // silently replacing it with the ACT auto-calculation.
    stampDuty: research.stampDuty,
    useCustomStampDuty: true,
    regoPerYear: research.regoPerYear,
    ctpPerYear: research.ctpPerYear,
    petrolConsumption: research.petrolConsumption,
    electricConsumption: research.electricConsumption,
    phevElectricPercent: research.phevElectricPercent,
    servicingCostPerYear: research.servicingCostPerYear,
    insurancePerYear: research.insurancePerYear,
    evFreeRegoYears: research.evFreeRegoYears,
    annualDepreciationPercent: research.annualDepreciationPercent,
    depreciationModel: 'percentage',
    hasLoan: research.hasLoan,
    loanAmount: research.loanAmount,
    interestRate: research.interestRate,
    loanTermYears: research.loanTermYears,
    useSolarCharging: false,
    solarRate: ACT_DEFAULTS.solarRate,
    solarChargingPercent: 50,
    petrolPrice: globalDefaults.petrolPrice,
    electricityPrice: globalDefaults.electricityPrice,
    annualKm: globalDefaults.annualKm,
    useCustomPetrolPrice: false,
    useCustomElectricityPrice: false,
    useCustomAnnualKm: false,
  };
}
