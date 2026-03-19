# Car Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent car library so users can save car configs from the active comparison and reload them later.

**Architecture:** Library stored as `LibraryCar[]` in `AppState` (persisted to localStorage). Comparison cars carry an optional `libraryId` linking them to a library entry. Dirty detection via `JSON.stringify` comparison drives the "Update library entry" button and removal confirmation.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS 4. No test framework — use `npx tsc --noEmit` for type verification after each task.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/types/car.ts` | Add `LibraryCar`, `libraryId?` on `CarConfig`, `library` on `AppState`, 4 new `AppAction` variants |
| Modify | `src/state/appReducer.ts` | 4 new reducer cases |
| Create | `src/utils/isCarDirty.ts` | Pure dirty-detection utility |
| Modify | `src/state/AppContext.tsx` | `library: []` in defaultState, 4 new context helpers |
| Modify | `src/hooks/useLocalStorage.ts` | `parsed.library ?? []` migration guard |
| Create | `src/components/LibraryModal.tsx` | Modal listing saved cars with Add/Delete actions |
| Modify | `src/components/CarCard.tsx` | Library badge, "Update library entry" button, removal confirmation |
| Modify | `src/components/CarCardList.tsx` | "Library" button + mount `LibraryModal` |

---

## Task 1: Extend types

**Files:**
- Modify: `src/types/car.ts`

- [ ] **Step 1: Add `LibraryCar` interface and update existing types**

Open `src/types/car.ts` and make these changes:

```ts
// After the CarConfig interface, add:
export interface LibraryCar {
  id: string;
  name: string;
  savedAt: number;
  config: CarConfig;
}
```

Add `libraryId?: string;` as the last field in `CarConfig` (after `useCustomAnnualKm`):

```ts
  useCustomAnnualKm: boolean;
  libraryId?: string;
```

Add `library: LibraryCar[];` to `AppState` (after `globalDefaults`):

```ts
export interface AppState {
  cars: CarConfig[];
  comparisonYears: number;
  globalDefaults: GlobalDefaults;
  library: LibraryCar[];
}
```

Add 4 new variants to `AppAction` (before the closing semicolon):

```ts
  | { type: 'SAVE_TO_LIBRARY'; car: CarConfig }
  | { type: 'UPDATE_LIBRARY_ENTRY'; libraryId: string; config: CarConfig }
  | { type: 'REMOVE_FROM_LIBRARY'; libraryId: string }
  | { type: 'ADD_FROM_LIBRARY'; libraryId: string }
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: errors about `AppState` missing `library` in usages — that's fine, we'll fix them task by task. Zero errors means we're ahead; TypeScript errors from `AppContext.tsx` and `appReducer.ts` about incomplete state are expected and acceptable at this stage. If you see errors *in* `car.ts` itself, fix them before proceeding.

- [ ] **Step 3: Commit**

```bash
git add src/types/car.ts
git commit -m "feat(library): add LibraryCar type, libraryId to CarConfig, library to AppState"
```

---

## Task 2: Reducer cases

**Files:**
- Modify: `src/state/appReducer.ts`

- [ ] **Step 1: Add 4 new cases**

Open `src/state/appReducer.ts`. Add the following 4 cases before the `default:` case:

```ts
    case 'SAVE_TO_LIBRARY': {
      const newLibraryId = crypto.randomUUID();
      const libraryEntry: import('../types/car').LibraryCar = {
        id: newLibraryId,
        name: action.car.name,
        savedAt: Date.now(),
        config: action.car,
      };
      return {
        ...state,
        library: [...state.library, libraryEntry],
        cars: state.cars.map(c =>
          c.id === action.car.id ? { ...c, libraryId: newLibraryId } : c,
        ),
      };
    }

    case 'UPDATE_LIBRARY_ENTRY':
      return {
        ...state,
        library: state.library.map(e =>
          e.id === action.libraryId
            ? { ...e, name: action.config.name, config: action.config }
            : e,
        ),
      };

    case 'REMOVE_FROM_LIBRARY':
      return {
        ...state,
        library: state.library.filter(e => e.id !== action.libraryId),
      };

    case 'ADD_FROM_LIBRARY': {
      if (state.cars.length >= 5) return state;
      const source = state.library.find(e => e.id === action.libraryId);
      if (!source) return state;
      const cloned: import('../types/car').CarConfig = {
        ...source.config,
        id: crypto.randomUUID(),
        libraryId: source.id,
      };
      return { ...state, cars: [...state.cars, cloned] };
    }
```

- [ ] **Step 2: Fix the import at the top of the file**

The `LibraryCar` type needs to be imported. Update the import line:

```ts
import type { AppState, AppAction, LibraryCar, CarConfig } from '../types/car';
```

Then replace the inline `import('../types/car').LibraryCar` and `import('../types/car').CarConfig` references with just `LibraryCar` and `CarConfig`.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: Errors about `AppState` missing `library` in `AppContext.tsx` and `useLocalStorage.ts` — those are fine, still outstanding. Zero errors *in* `appReducer.ts` itself is the goal.

- [ ] **Step 4: Commit**

```bash
git add src/state/appReducer.ts
git commit -m "feat(library): add SAVE_TO_LIBRARY, ADD_FROM_LIBRARY, UPDATE_LIBRARY_ENTRY, REMOVE_FROM_LIBRARY reducer cases"
```

---

## Task 3: Dirty-check utility

**Files:**
- Create: `src/utils/isCarDirty.ts`

- [ ] **Step 1: Create the utility**

```ts
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
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors in `isCarDirty.ts`. Remaining errors in `AppContext.tsx` / `useLocalStorage.ts` are still fine.

- [ ] **Step 3: Commit**

```bash
git add src/utils/isCarDirty.ts
git commit -m "feat(library): add isCarDirtyFromLibrary utility"
```

---

## Task 4: AppContext — default state and helpers

**Files:**
- Modify: `src/state/AppContext.tsx`

- [ ] **Step 1: Update `AppContextValue` interface**

Add the 4 new helpers to the interface:

```ts
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  addCar: (car: CarConfig) => void;
  removeCar: (carId: string) => void;
  updateCar: (car: CarConfig) => void;
  setYears: (years: number) => void;
  setGlobalDefaults: (defaults: Partial<GlobalDefaults>) => void;
  saveToLibrary: (car: CarConfig) => void;
  addFromLibrary: (libraryId: string) => void;
  updateLibraryEntry: (libraryId: string, config: CarConfig) => void;
  removeFromLibrary: (libraryId: string) => void;
}
```

- [ ] **Step 2: Add `library: []` to `defaultState`**

```ts
const defaultState: AppState = {
  cars: [],
  comparisonYears: 5,
  globalDefaults: DEFAULT_GLOBAL_DEFAULTS,
  library: [],
};
```

- [ ] **Step 3: Add helper function bodies inside `AppProvider`**

After `setGlobalDefaults`, add:

```ts
  const saveToLibrary = (car: CarConfig) =>
    dispatch({ type: 'SAVE_TO_LIBRARY', car });
  const addFromLibrary = (libraryId: string) =>
    dispatch({ type: 'ADD_FROM_LIBRARY', libraryId });
  const updateLibraryEntry = (libraryId: string, config: CarConfig) =>
    dispatch({ type: 'UPDATE_LIBRARY_ENTRY', libraryId, config });
  const removeFromLibrary = (libraryId: string) =>
    dispatch({ type: 'REMOVE_FROM_LIBRARY', libraryId });
```

- [ ] **Step 4: Add helpers to the `AppContext.Provider` value**

```tsx
  return (
    <AppContext.Provider value={{
      state, dispatch,
      addCar, removeCar, updateCar, setYears, setGlobalDefaults,
      saveToLibrary, addFromLibrary, updateLibraryEntry, removeFromLibrary,
    }}>
      {children}
    </AppContext.Provider>
  );
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: The `AppState` missing-`library` error in `useLocalStorage.ts` should now be the only remaining error (or zero errors if TypeScript is satisfied by the `loadState` return type).

- [ ] **Step 6: Commit**

```bash
git add src/state/AppContext.tsx
git commit -m "feat(library): add library helpers to AppContext and seed defaultState"
```

---

## Task 5: localStorage migration

**Files:**
- Modify: `src/hooks/useLocalStorage.ts`

- [ ] **Step 1: Add migration guard for `library`**

In `loadState()`, after the `globalDefaults` guard and before `return parsed`, add:

```ts
    if (!parsed.library) {
      parsed.library = [];
    }
```

The final `loadState` function should look like:

```ts
export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.globalDefaults) {
      parsed.globalDefaults = DEFAULT_GLOBAL_DEFAULTS;
    }
    if (!parsed.library) {
      parsed.library = [];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parsed.cars = parsed.cars.map((car: any) => ({
      ...car,
      useCustomStampDuty: car.useCustomStampDuty ?? false,
      useCustomPetrolPrice: car.useCustomPetrolPrice ?? false,
      useCustomElectricityPrice: car.useCustomElectricityPrice ?? false,
      useCustomAnnualKm: car.useCustomAnnualKm ?? false,
    }));
    return parsed;
  } catch {
    return null;
  }
}
```

Note: No per-car migration needed for `libraryId` — it is optional so `undefined` is the correct default for pre-feature saves.

- [ ] **Step 2: Type-check — expect zero errors**

```bash
npx tsc --noEmit
```

Expected: Zero errors. If any remain, fix before committing.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useLocalStorage.ts
git commit -m "feat(library): migrate localStorage state to include library array"
```

---

## Task 6: LibraryModal component

**Files:**
- Create: `src/components/LibraryModal.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/LibraryModal.tsx
import { useApp } from '../state/AppContext';
import { formatCurrency } from '../utils/formatters';

interface LibraryModalProps {
  onClose: () => void;
}

export function LibraryModal({ onClose }: LibraryModalProps) {
  const { state, addFromLibrary, removeFromLibrary } = useApp();

  const sorted = [...state.library].sort((a, b) => {
    if (b.savedAt !== a.savedAt) return b.savedAt - a.savedAt;
    return a.id.localeCompare(b.id); // stable secondary sort
  });

  const atCap = state.cars.length >= 5;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Car Library</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-3">
          {sorted.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No cars saved yet. Use &ldquo;Save to library&rdquo; on any comparison car.
            </p>
          ) : (
            sorted.map(entry => (
              <div
                key={entry.id}
                className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-200"
              >
                <div>
                  <div className="font-semibold text-sm text-gray-800">{entry.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {entry.config.fuelType.toUpperCase()} &middot;{' '}
                    {formatCurrency(entry.config.purchasePrice)} &middot;{' '}
                    Saved {new Date(entry.savedAt).toLocaleDateString('en-AU', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </div>
                </div>
                <div className="flex gap-2 ml-4 shrink-0">
                  <button
                    onClick={() => { addFromLibrary(entry.id); onClose(); }}
                    disabled={atCap}
                    className="text-xs px-3 py-1.5 rounded-md bg-blue-50 text-blue-700
                               hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed
                               border border-blue-200"
                    title={atCap ? 'Comparison is full (5 cars max)' : undefined}
                  >
                    + Add to comparison
                  </button>
                  <button
                    onClick={() => removeFromLibrary(entry.id)}
                    className="text-xs px-3 py-1.5 rounded-md bg-red-50 text-red-600
                               hover:bg-red-100 border border-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer hint when at cap */}
        {atCap && sorted.length > 0 && (
          <div className="px-5 py-3 border-t text-xs text-gray-400 text-center">
            Remove a car from the comparison to add another.
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/LibraryModal.tsx
git commit -m "feat(library): add LibraryModal component"
```

---

## Task 7: CarCard — library badge, update button, removal confirmation

**Files:**
- Modify: `src/components/CarCard.tsx`

This task adds three new UI behaviours to `CarCard`. Read the current file in full before editing.

- [ ] **Step 1: Update imports**

Add these imports at the top of `CarCard.tsx`:

```ts
import { useApp } from '../state/AppContext';
import { isCarDirtyFromLibrary } from '../utils/isCarDirty';
```

- [ ] **Step 2: Add state and derived values inside the component**

After `const [costBreakdownOpen, setCostBreakdownOpen] = useState(false);`, add:

```ts
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const { state, saveToLibrary, updateLibraryEntry } = useApp();
  const isLinked = Boolean(car.libraryId);
  const isDirty = isCarDirtyFromLibrary(car, state.library);
```

- [ ] **Step 3: Update the remove button handler**

Replace the existing remove button in the header:

```tsx
        <button
          onClick={() => onRemove(car.id)}
          className="text-gray-400 hover:text-red-500 text-lg leading-none"
          title="Remove car"
        >
          &times;
        </button>
```

With:

```tsx
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
```

- [ ] **Step 4: Add the library badge row just below the header `</div>`**

After the closing `</div>` of the header block (line ~94 in the original file), add:

```tsx
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
```

- [ ] **Step 5: Add the removal confirmation overlay**

Just before the closing `</div>` of the entire card (the very last `</div>` in the return), add:

```tsx
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
```

The outer card `<div>` also needs `relative` in its className so the overlay positions correctly. Change the opening card div from:

```tsx
    <div
      className="w-80 shrink-0 rounded-xl border-2 bg-white shadow-sm flex flex-col"
```

To:

```tsx
    <div
      className="w-80 shrink-0 rounded-xl border-2 bg-white shadow-sm flex flex-col relative"
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/CarCard.tsx
git commit -m "feat(library): add library badge, update button, and removal confirmation to CarCard"
```

---

## Task 8: CarCardList — Library button and modal

**Files:**
- Modify: `src/components/CarCardList.tsx`

- [ ] **Step 1: Add imports and local state**

Add at the top:

```ts
import { useState } from 'react';
import { LibraryModal } from './LibraryModal';
import { useApp } from '../state/AppContext';
```

Replace the existing `const { state, addCar, updateCar, removeCar } = useApp();` with:

```ts
  const { state, addCar, updateCar, removeCar } = useApp();
  const [libraryOpen, setLibraryOpen] = useState(false);
```

- [ ] **Step 2: Add the Library button and modal mount**

Replace the current return JSX with:

```tsx
  return (
    <>
      {/* Library button row */}
      <div className="flex justify-end px-4 pb-2">
        <button
          onClick={() => setLibraryOpen(true)}
          className="text-xs px-3 py-1.5 rounded-md bg-gray-100 text-gray-600
                     hover:bg-gray-200 border border-gray-200 flex items-center gap-1.5"
        >
          <span>📚</span>
          <span>Library</span>
          {state.library.length > 0 && (
            <span className="bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 text-xs leading-none">
              {state.library.length}
            </span>
          )}
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 px-4">
        {state.cars.map((car, index) => (
          <CarCard
            key={car.id}
            car={car}
            index={index}
            comparisonYears={state.comparisonYears}
            globalDefaults={state.globalDefaults}
            onUpdate={updateCar}
            onRemove={removeCar}
          />
        ))}

        {state.cars.length < 5 && (
          <button
            onClick={() => addCar(createDefaultCarConfig(state.cars.length === 0 ? 'ev' : 'petrol'))}
            className="w-80 shrink-0 rounded-xl border-2 border-dashed border-gray-300
                       flex flex-col items-center justify-center gap-2 text-gray-400
                       hover:border-blue-400 hover:text-blue-500 transition-colors
                       min-h-[200px] cursor-pointer"
          >
            <span className="text-4xl">+</span>
            <span className="text-sm font-medium">Add Car</span>
          </button>
        )}
      </div>

      {libraryOpen && <LibraryModal onClose={() => setLibraryOpen(false)} />}
    </>
  );
```

- [ ] **Step 3: Type-check — expect zero errors**

```bash
npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 4: Build check**

```bash
npm run build
```

Expected: Build succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/CarCardList.tsx
git commit -m "feat(library): add Library button and modal to CarCardList"
```

---

## Task 9: Manual smoke test

Before declaring done, verify these flows in the browser at `http://127.0.0.1:5173`:

- [ ] Add a car to the comparison. Confirm "Save to library" badge appears.
- [ ] Click "Save to library". Confirm badge changes to "✓ Saved to library".
- [ ] Click the Library button (top-right of card list). Confirm modal opens showing the saved car with count badge on the button.
- [ ] Modify the saved car's purchase price. Confirm "Update library entry" button appears in amber.
- [ ] Click "Update library entry". Confirm the button disappears.
- [ ] Open Library modal again. Confirm the saved car shows the updated price.
- [ ] Click "+ Add to comparison" in the modal. Confirm a copy appears in comparison with "✓ Saved to library" badge.
- [ ] Modify one of the comparison copies. Try to remove it. Confirm the confirmation dialog appears.
- [ ] Click "Cancel" — confirm card stays.
- [ ] Click remove again → "Yes, update library" — confirm car is removed and library is updated.
- [ ] Click remove on unmodified linked car — confirm it removes immediately (no dialog).
- [ ] Add 5 cars. Open Library modal. Confirm "+ Add to comparison" buttons are disabled with tooltip.
- [ ] In Library modal, click "Delete" on an entry. Confirm it disappears from the modal.
- [ ] Reload the page. Confirm library entries and libraryId links persist across reload.

- [ ] **Final commit (if any cleanup needed)**

```bash
git add -p  # stage only intentional changes
git commit -m "feat(library): car library feature complete"
```
