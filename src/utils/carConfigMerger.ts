import type { CarConfig, GlobalDefaults } from '../types/car';
import type { ResearchResult } from '../api/carResearchApi';

export function mergeResearchResultToConfig(
  research: ResearchResult,
  globalDefaults: GlobalDefaults,
  _state: string // Reserved for future state-specific logic
): CarConfig {
  // Get base config from fuel type defaults
  const baseConfig: Partial<CarConfig> = {
    id: crypto.randomUUID(),
    name: research.name,
    fuelType: research.fuelType,
    // AI-provided values
    purchasePrice: research.purchasePrice,
    stampDuty: research.stampDuty,
    regoPerYear: research.regoPerYear,
    ctpPerYear: research.ctpPerYear,
    petrolConsumption: research.petrolConsumption,
    electricConsumption: research.electricConsumption,
    phevElectricPercent: research.phevElectricPercent,
    servicingCostPerYear: research.servicingCostPerYear,
    insurancePerYear: research.insurancePerYear,
    evFreeRegoYears: research.evFreeRegoYears,
    annualDepreciationPercent: research.annualDepreciationPercent,
    depreciationModel: research.depreciationModel,
    // Loan values from research (if any)
    hasLoan: research.hasLoan,
    loanAmount: research.loanAmount,
    interestRate: research.interestRate,
    loanTermYears: research.loanTermYears,
    // Solar charging - always start with user defaults
    useSolarCharging: false,
    solarRate: 0.06,
    solarChargingPercent: 50,
    // Override with global defaults (not custom)
    petrolPrice: globalDefaults.petrolPrice,
    electricityPrice: globalDefaults.electricityPrice,
    annualKm: globalDefaults.annualKm,
    // All custom flags false (using global defaults)
    useCustomPetrolPrice: false,
    useCustomElectricityPrice: false,
    useCustomAnnualKm: false,
    useCustomStampDuty: false, // AI provided value becomes the "custom" value
  };

  return {
    // Ensure all required fields are present
    id: baseConfig.id ?? crypto.randomUUID(),
    name: baseConfig.name ?? 'New Car',
    fuelType: baseConfig.fuelType ?? 'petrol',
    purchasePrice: baseConfig.purchasePrice ?? 0,
    petrolPrice: baseConfig.petrolPrice ?? globalDefaults.petrolPrice,
    electricityPrice: baseConfig.electricityPrice ?? globalDefaults.electricityPrice,
    useSolarCharging: baseConfig.useSolarCharging ?? false,
    solarRate: baseConfig.solarRate ?? 0.06,
    solarChargingPercent: baseConfig.solarChargingPercent ?? 50,
    annualKm: baseConfig.annualKm ?? globalDefaults.annualKm,
    petrolConsumption: baseConfig.petrolConsumption ?? 0,
    electricConsumption: baseConfig.electricConsumption ?? 0,
    phevElectricPercent: baseConfig.phevElectricPercent ?? 0,
    servicingCostPerYear: baseConfig.servicingCostPerYear ?? 0,
    insurancePerYear: baseConfig.insurancePerYear ?? 0,
    ctpPerYear: baseConfig.ctpPerYear ?? 0,
    regoPerYear: baseConfig.regoPerYear ?? 0,
    evFreeRegoYears: baseConfig.evFreeRegoYears ?? 0,
    depreciationModel: baseConfig.depreciationModel ?? 'percentage',
    annualDepreciationPercent: baseConfig.annualDepreciationPercent ?? 13,
    hasLoan: baseConfig.hasLoan ?? false,
    loanAmount: baseConfig.loanAmount ?? 0,
    interestRate: baseConfig.interestRate ?? 7,
    loanTermYears: baseConfig.loanTermYears ?? 5,
    stampDuty: baseConfig.stampDuty ?? 0,
    useCustomStampDuty: baseConfig.useCustomStampDuty ?? false,
    useCustomPetrolPrice: baseConfig.useCustomPetrolPrice ?? false,
    useCustomElectricityPrice: baseConfig.useCustomElectricityPrice ?? false,
    useCustomAnnualKm: baseConfig.useCustomAnnualKm ?? false,
  };
}
