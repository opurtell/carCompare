import { VEHICLE_CATALOGUE, type CatalogueVehicle } from '../data/vehicleCatalogue';
import type { FuelType } from '../types/car';

/** Case-insensitive match on every word, so "rav4 hyb" finds the RAV4 Hybrid. */
export function searchCatalogue(query: string, catalogue: CatalogueVehicle[] = VEHICLE_CATALOGUE): CatalogueVehicle[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return catalogue;
  return catalogue.filter(v => {
    const hay = `${v.year ?? ""} ${v.make} ${v.model} ${v.variant} ${v.fuelType}`.toLowerCase();
    return words.every(w => hay.includes(w));
  });
}

/** One make and model, with every year or variant of it that's in the catalogue. */
export interface CatalogueModel {
  key: string;
  make: string;
  model: string;
  /** Newest year first, then cheapest first. */
  entries: CatalogueVehicle[];
}

const byText = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });

/** Groups catalogue entries by make and model, sorted A–Z, so the picker lists each model once. */
export function groupByModel(vehicles: CatalogueVehicle[]): CatalogueModel[] {
  const groups = new Map<string, CatalogueModel>();
  for (const v of vehicles) {
    const key = `${v.make}|${v.model}`.toLowerCase();
    const group = groups.get(key) ?? { key, make: v.make, model: v.model, entries: [] };
    group.entries.push(v);
    groups.set(key, group);
  }
  const sorted = [...groups.values()].sort((a, b) => byText(a.make, b.make) || byText(a.model, b.model));
  for (const g of sorted) {
    g.entries.sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.purchasePrice - b.purchasePrice);
  }
  return sorted;
}

/** Kept by AddCarModal so the search, filter and open model survive going to the summary and back. */
export interface PickerState {
  query: string;
  fuel: FuelType | 'all';
  /** The model whose years or variants are showing, or null for the A–Z list. */
  modelKey: string | null;
}

export const INITIAL_PICKER_STATE: PickerState = { query: '', fuel: 'all', modelKey: null };
