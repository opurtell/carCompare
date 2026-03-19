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
