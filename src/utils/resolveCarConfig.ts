import type { CarConfig, GlobalDefaults } from '../types/car';

export function resolveCarConfig(car: CarConfig, globals: GlobalDefaults): CarConfig {
  return {
    ...car,
    petrolPrice: car.useCustomPetrolPrice ? car.petrolPrice : globals.petrolPrice,
    electricityPrice: car.useCustomElectricityPrice ? car.electricityPrice : globals.electricityPrice,
    annualKm: car.useCustomAnnualKm ? car.annualKm : globals.annualKm,
  };
}
