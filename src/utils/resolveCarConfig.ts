import type { CarConfig, GlobalDefaults } from '../types/car';
import { ACT_CTP_PREMIUM, autoRegoFor } from '../calculations/actSpecific';

/** Fills in everything that comes from global settings or ACT rules rather than the car itself. */
export function resolveCarConfig(car: CarConfig, globals: GlobalDefaults): CarConfig {
  return {
    ...car,
    petrolPrice: car.useCustomPetrolPrice ? car.petrolPrice : globals.petrolPrice,
    electricityPrice: car.useCustomElectricityPrice ? car.electricityPrice : globals.electricityPrice,
    annualKm: car.useCustomAnnualKm ? car.annualKm : globals.annualKm,
    regoPerYear: car.useCustomRego ? car.regoPerYear : autoRegoFor(car),
    ctpPerYear: car.useCustomCtp ? car.ctpPerYear : ACT_CTP_PREMIUM,
  };
}
