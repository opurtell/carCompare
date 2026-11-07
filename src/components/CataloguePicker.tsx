import { useEffect, useRef } from 'react';
import type { CatalogueVehicle } from '../data/vehicleCatalogue';
import type { FuelType } from '../types/car';
import { groupByModel, searchCatalogue, type CatalogueModel, type PickerState } from '../utils/searchCatalogue';
import { formatCurrency } from '../utils/formatters';
import { useIsDesktop } from '../hooks/useMediaQuery';

const FUEL_FILTERS: { value: PickerState['fuel']; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'ev', label: 'EV' },
  { value: 'phev', label: 'PHEV' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'petrol', label: 'Petrol' },
];

const FUEL_LABEL: Record<FuelType, string> = { ev: 'EV', phev: 'PHEV', hybrid: 'Hybrid', petrol: 'Petrol' };

interface CataloguePickerProps {
  catalogue: CatalogueVehicle[];
  used: boolean;
  state: PickerState;
  onStateChange: (state: PickerState) => void;
  onPick: (vehicle: CatalogueVehicle) => void;
  disabled: boolean;
}

function price(v: CatalogueVehicle) {
  return `${v.priceIsEstimate ? '~' : ''}${formatCurrency(v.purchasePrice)}`;
}

function fuels(entries: CatalogueVehicle[]) {
  return [...new Set(entries.map(v => FUEL_LABEL[v.fuelType]))].join(', ');
}

/** What a model row says under its name. */
function modelSummary(group: CatalogueModel, used: boolean) {
  const [first] = group.entries;
  if (group.entries.length === 1) {
    return [used ? first.year : null, first.variant, FUEL_LABEL[first.fuelType]].filter(Boolean).join(' · ');
  }
  if (used) {
    const years = group.entries.map(v => v.year ?? 0);
    const lo = Math.min(...years);
    const hi = Math.max(...years);
    return `${lo === hi ? lo : `${lo}–${hi}`} · ${fuels(group.entries)}`;
  }
  return `${group.entries.length} variants · ${fuels(group.entries)}`;
}

const Chevron = ({ className = '' }: { className?: string }) => (
  <svg className={`w-4 h-4 shrink-0 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

const rowClass =
  'w-full min-h-12 md:min-h-0 px-3 py-2 flex items-center justify-between gap-3 text-left ' +
  'hover:bg-blue-50 active:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed';

/**
 * The Pick a car list: every model once (A–Z under its make), then the years (used) or
 * variants (new) of the model you tap. A model with one match picks straight away.
 */
export function CataloguePicker({ catalogue, used, state, onStateChange, onPick, disabled }: CataloguePickerProps) {
  const isDesktop = useIsDesktop();
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus the search on desktop only: on phones the keyboard would cover the list.
  const modelOpen = state.modelKey !== null;
  useEffect(() => {
    if (isDesktop && !modelOpen) searchRef.current?.focus();
  }, [isDesktop, modelOpen]);

  const matches = searchCatalogue(state.query, catalogue).filter(v => state.fuel === 'all' || v.fuelType === state.fuel);
  const groups = groupByModel(matches);
  const open = groups.find(g => g.key === state.modelKey) ?? null;

  const set = (partial: Partial<PickerState>) => onStateChange({ ...state, ...partial });
  const showModel = (key: string | null) => set({ modelKey: key });

  return (
    <div>
      <div className="sticky -top-4 z-10 -mx-5 px-5 pt-1 pb-2 bg-white">
        {open ? (
          <>
            <button
              type="button"
              onClick={() => showModel(null)}
              className="min-h-11 md:min-h-0 md:py-1 -ml-1 pr-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <Chevron className="rotate-180" />
              All models
            </button>
            <h3 className="mt-1 text-base font-semibold text-gray-800">
              {open.make} {open.model}
            </h3>
            <p className="text-xs text-gray-500">{used ? 'Pick the year.' : 'Pick the variant.'}</p>
          </>
        ) : (
          <>
            <input
              ref={searchRef}
              type="search"
              aria-label={used ? 'Search used cars' : 'Search new cars'}
              value={state.query}
              onChange={e => set({ query: e.target.value, modelKey: null })}
              placeholder={used ? 'Search, e.g. Corolla, 2019, Tesla' : 'Search, e.g. RAV4, Kia, BYD'}
              className="w-full px-3 py-2 text-base md:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <div role="radiogroup" aria-label="Fuel type" className="mt-2 flex gap-1.5 overflow-x-auto">
              {FUEL_FILTERS.map(f => (
                <button
                  key={f.value}
                  type="button"
                  role="radio"
                  aria-checked={state.fuel === f.value}
                  onClick={() => set({ fuel: f.value, modelKey: null })}
                  className={`min-h-9 md:min-h-0 shrink-0 px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    state.fuel === f.value ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {open ? (
        <div>
          <ul className="mt-2 divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
            {open.entries.map(v => (
              <li key={v.id}>
                <button type="button" onClick={() => onPick(v)} disabled={disabled} className={rowClass}>
                  <span className="min-w-0 flex items-baseline gap-3">
                    {used && <span className="text-base font-semibold text-gray-800 tabular-nums">{v.year}</span>}
                    <span className="min-w-0">
                      <span className="block text-sm text-gray-800 truncate">{v.variant}</span>
                      <span className="block text-xs text-gray-500">{FUEL_LABEL[v.fuelType]}</span>
                    </span>
                  </span>
                  <span className="text-sm font-medium text-gray-700 shrink-0">{price(v)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : groups.length === 0 ? (
        <p className="mt-2 px-3 py-6 text-sm text-gray-500 text-center border border-dashed border-gray-200 rounded-lg">
          No match in the list. Try another search, or see below.
        </p>
      ) : (
        <ul className="mt-1 border border-gray-200 rounded-lg overflow-hidden">
          {groups.map((g, i) => {
            const single = g.entries.length === 1;
            const cheapest = g.entries.reduce((a, b) => (b.purchasePrice < a.purchasePrice ? b : a));
            return (
              <li key={g.key}>
                {g.make !== groups[i - 1]?.make && (
                  <div className={`px-3 py-1 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 ${i > 0 ? 'border-t border-gray-200' : ''}`}>
                    {g.make}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => (single ? onPick(g.entries[0]) : showModel(g.key))}
                  disabled={disabled && single}
                  className={`${rowClass} ${g.make === groups[i - 1]?.make ? 'border-t border-gray-100' : ''}`}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-800 truncate">{g.model}</span>
                    <span className="block text-xs text-gray-500 truncate">{modelSummary(g, used)}</span>
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0 text-sm text-gray-700">
                    {single ? price(cheapest) : <><span className="text-xs text-gray-400">from</span> {price(cheapest)}</>}
                    {!single && <Chevron className="text-gray-400" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
