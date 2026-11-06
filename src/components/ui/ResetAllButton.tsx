import { useApp } from '../../state/AppContext';

export function ResetAllButton({ className = '' }: { className?: string }) {
  const { resetAll } = useApp();

  return (
    <button
      onClick={() => {
        if (confirm('Reset all cars, settings and your saved library?')) {
          resetAll();
        }
      }}
      className={`px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200
                  rounded-lg hover:bg-red-50 transition-colors ${className}`}
    >
      Reset All
    </button>
  );
}
