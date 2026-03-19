# Car Library Feature — Design Spec

**Date:** 2026-03-19
**Status:** Approved

---

## Overview

Add a car library to the Car Compare app. Users can save car configurations from the active comparison into a persistent library, and later load those saved configs back into comparison. The library and the active comparison are two independent stores.

---

## Architecture

**Model:** Two separate stores — `library: LibraryCar[]` in `AppState` alongside the existing `cars: CarConfig[]`. Comparison cars that originate from the library carry a `libraryId` field to track the link.

**Dirty detection:** A pure utility compares the current comparison car config (minus `libraryId`) against the linked library entry config using `JSON.stringify` on the field sets. Used to conditionally show the "Update library entry" button and to trigger the removal confirmation.

---

## Data Model

### New type

```ts
export interface LibraryCar {
  id: string;        // stable unique id
  name: string;      // denormalized display name
  savedAt: number;   // Unix timestamp (ms)
  config: CarConfig;
}
```

### Changes to existing types

**`CarConfig`** — one new optional field:
```ts
libraryId?: string;  // set when loaded from or saved to library; undefined = not linked
```

**`AppState`** — one new field:
```ts
library: LibraryCar[];
```

**`AppAction`** — four new variants:
```ts
| { type: 'SAVE_TO_LIBRARY'; car: CarConfig }
| { type: 'UPDATE_LIBRARY_ENTRY'; libraryId: string; config: CarConfig }
| { type: 'REMOVE_FROM_LIBRARY'; libraryId: string }
| { type: 'ADD_FROM_LIBRARY'; libraryId: string }
```

**`LOAD_STATE` action** is implicitly covered — once `AppState` includes `library`, the existing `LOAD_STATE` case (`return action.state`) carries library data through correctly. No reducer change needed for that case.

---

## Reducer Behaviour

### `SAVE_TO_LIBRARY`
The reducer generates a new `LibraryCar` id via `crypto.randomUUID()` and sets `savedAt: Date.now()` internally. It atomically:
1. Appends the new `LibraryCar` to `state.library`
2. Updates the matching car in `state.cars` to set `libraryId` to the new library entry id

### `ADD_FROM_LIBRARY`
The reducer finds the library entry by `libraryId`, clones its config, and assigns a fresh `id` via `crypto.randomUUID()` to the cloned car (the comparison car id is independent of the library entry id). Sets `libraryId` on the clone to the library entry id. Enforces the existing 5-car cap: if `state.cars.length >= 5`, the action is a no-op.

### `UPDATE_LIBRARY_ENTRY`
Replaces the matching library entry's `config` with the provided config. Does not touch `state.cars`.

### `REMOVE_FROM_LIBRARY`
Removes the entry from `state.library`. Does not touch `state.cars` — stale `libraryId` references on comparison cars are harmless (dirty detection returns false when no library entry is found).

---

## User Flows

### Save to library
1. User clicks "Save to library" badge/button on a CarCard
2. Dispatches `SAVE_TO_LIBRARY` — reducer creates the library entry and sets `libraryId` on the comparison car
3. Badge changes to "Saved to library ✓" (muted, non-interactive)

### Load from library
1. User clicks "Library" button (near "Add Car" in CarCardList)
2. Library modal opens listing all saved cars (name, fuel type, price, date saved)
3. "+ Add to comparison" button is disabled when `state.cars.length >= 5` (matching existing "Add Car" cap)
4. User clicks "+ Add to comparison" on an entry
5. Dispatches `ADD_FROM_LIBRARY` — reducer clones the config with a fresh id and adds it to `state.cars`
6. Multiple copies of the same library car can exist in comparison simultaneously

### Update library entry
1. When a comparison car has a `libraryId` and its config has diverged from the library version, "Update library entry" button appears in the card
2. User clicks it — dispatches `UPDATE_LIBRARY_ENTRY`
3. Button disappears (car is no longer dirty)

### Remove from comparison
1. User clicks remove on a comparison car
2. If `libraryId` is set AND car is dirty: inline confirmation UI appears within the card (using local `useState`, same pattern as the existing `costBreakdownOpen` state in `CarCard`):
   - **Yes, update library** — dispatches `UPDATE_LIBRARY_ENTRY` then `REMOVE_CAR`
   - **No, just remove** — dispatches `REMOVE_CAR` only
   - **Cancel** — sets confirmation state back to false, card returns to normal
3. If not linked or not dirty: removes immediately (existing behavior, no UI change)

### Delete from library
1. Inside the library modal, user clicks "Delete" on an entry
2. Dispatches `REMOVE_FROM_LIBRARY`
3. Does not affect comparison cars — stale `libraryId` is benign

---

## Components

### New files

**`src/components/LibraryModal.tsx`**
- Full-screen modal overlay
- Lists all `state.library` entries sorted by `savedAt` descending, with `id` as stable secondary sort key
- Each row: name, fuel type badge, purchase price, formatted save date, "+ Add to comparison" button (disabled at 5-car cap), "Delete" button
- Empty state: *"No cars saved yet. Use 'Save to library' on any comparison car."*
- Closed via backdrop click or ✕ button

**`src/utils/isCarDirty.ts`**
- Pure function: `isCarDirtyFromLibrary(car: CarConfig, library: LibraryCar[]): boolean`
- Finds the library entry by `car.libraryId`; if not found, returns `false`
- Compares car config vs library entry config using `JSON.stringify` after omitting `libraryId` from both objects

### Modified files

**`src/types/car.ts`** — `LibraryCar` interface, `libraryId?` on `CarConfig`, `library` on `AppState`, 4 new action types

**`src/state/appReducer.ts`** — 4 new cases; `SAVE_TO_LIBRARY` and `ADD_FROM_LIBRARY` use `crypto.randomUUID()` for id generation

**`src/state/AppContext.tsx`**
- Add `library: []` to `defaultState`
- Expose named helpers in context value:
  ```ts
  saveToLibrary: (car: CarConfig) => void
  addFromLibrary: (libraryId: string) => void
  updateLibraryEntry: (libraryId: string, config: CarConfig) => void
  removeFromLibrary: (libraryId: string) => void
  ```

**`src/components/CarCard.tsx`**
- Library status badge in card header: "Save to library" (clickable) or "Saved to library ✓" (muted)
- "Update library entry" button: shown when `libraryId` set AND `isCarDirtyFromLibrary` returns true
- Removal confirmation: local `useState<boolean>` (`confirmingRemoval`), same pattern as `costBreakdownOpen`; replaces the normal remove button area when true

**`src/components/CarCardList.tsx`**
- "Library" button in the section header, next to "Add Car"
- Controls `libraryModalOpen` local state to show/hide `LibraryModal`

**`src/hooks/useLocalStorage.ts`**
- Migration in `loadState()`: `library: parsed.library ?? []`
- No per-car migration needed for `libraryId` — it is optional and `undefined` is the correct default for pre-feature saves

---

## Files Not Changed

Cost engine, all charts, calculations, GlobalSettingsPanel, formatters, colors, ACT-specific logic.

---

## Out of Scope

- Editing cars directly in the library (edit in comparison, then save back)
- Library search/filter (reasonable for a small list)
- Export/import of library entries
- Cloud sync
