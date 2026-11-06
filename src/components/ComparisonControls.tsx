import { useApp } from '../state/AppContext';

/** Stacked on phones (inside the Compare tab), inline in the header from `md` up. */
export function ComparisonControls() {
  const { state, setYears, toggleDepreciation } = useApp();

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-5">
      <button
        type="button"
        role="switch"
        aria-checked={state.showDepreciation}
        onClick={toggleDepreciation}
        className="order-2 md:order-1 flex items-center justify-between md:justify-start gap-2 min-h-10 md:min-h-0
                   text-sm text-gray-600 hover:text-gray-800 transition-colors"
      >
        <span
          className={`order-2 md:order-1 relative inline-flex w-9 h-5 rounded-full transition-colors duration-200 ${
            state.showDepreciation ? 'bg-blue-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
              state.showDepreciation ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </span>
        <span className="order-1 md:order-2">Depreciation</span>
      </button>

      <div className="hidden md:block order-2 w-px h-5 bg-gray-200" />

      <label className="order-1 md:order-3 flex items-center gap-2 min-h-10 md:min-h-0 text-sm text-gray-600">
        <span className="shrink-0">Compare over</span>
        <input
          type="range"
          min={1}
          max={10}
          value={state.comparisonYears}
          onChange={e => setYears(Number(e.target.value))}
          className="flex-1 min-w-0 md:flex-none md:w-28 accent-blue-500"
        />
        <span className="font-semibold text-gray-800 w-16 shrink-0 text-right md:text-left">
          {state.comparisonYears} {state.comparisonYears === 1 ? 'year' : 'years'}
        </span>
      </label>
    </div>
  );
}
