// src/utils/isCarDirty.ts
import type { CarConfig, LibraryCar } from '../types/car';

/**
 * Returns true if the comparison car's config has diverged from the
 * library entry it was loaded from. Uses JSON.stringify after stripping
 * `libraryId` from both sides so the link field doesn't cause false positives.
 */
export function isCarDirtyFromLibrary(
  car: CarConfig,
  library: LibraryCar[],
): boolean {
  if (!car.libraryId) return false;
  const entry = library.find(e => e.id === car.libraryId);
  if (!entry) return false;

  const normalize = (c: CarConfig) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { libraryId: _lid, ...rest } = c;
    return rest;
  };

  return JSON.stringify(normalize(car)) !== JSON.stringify(normalize(entry.config));
}
