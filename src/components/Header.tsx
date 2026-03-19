import { useApp } from '../state/AppContext';

export function Header() {
  const { state, setYears } = useApp();

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Car Cost Compare</h1>
        <p className="text-xs text-gray-400">Total cost of ownership calculator (ACT, Australia)</p>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <span>Compare over</span>
          <input
            type="range"
            min={1}
            max={10}
            value={state.comparisonYears}
            onChange={e => setYears(Number(e.target.value))}
            className="w-28 accent-blue-500"
          />
          <span className="font-semibold text-gray-800 w-16">{state.comparisonYears} years</span>
        </label>

        <button
          onClick={() => {
            if (confirm('Reset all cars and settings?')) {
              localStorage.removeItem('carCompare_v1');
              window.location.reload();
            }
          }}
          className="px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200
                     rounded-lg hover:bg-red-50 transition-colors"
        >
          Reset All
        </button>
      </div>
    </header>
  );
}
