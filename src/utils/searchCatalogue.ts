import { VEHICLE_CATALOGUE, type CatalogueVehicle } from '../data/vehicleCatalogue';

/** Case-insensitive match on every word, so "rav4 hyb" finds the RAV4 Hybrid. */
export function searchCatalogue(query: string, catalogue: CatalogueVehicle[] = VEHICLE_CATALOGUE): CatalogueVehicle[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return catalogue;
  return catalogue.filter(v => {
    const hay = `${v.year ?? ""} ${v.make} ${v.model} ${v.variant} ${v.fuelType}`.toLowerCase();
    return words.every(w => hay.includes(w));
  });
}
