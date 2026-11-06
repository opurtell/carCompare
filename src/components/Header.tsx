import { useIsDesktop } from '../hooks/useMediaQuery';
import { ComparisonControls } from './ComparisonControls';
import { ResetAllButton } from './ui/ResetAllButton';

export function Header() {
  const isDesktop = useIsDesktop();

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 h-14 md:h-auto px-4 md:px-6 md:py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
      <div>
        <h1 className="text-lg md:text-xl font-bold text-gray-800">Car Cost Compare</h1>
        <p className="hidden md:block text-xs text-gray-400">Total cost of ownership calculator (ACT, Australia)</p>
      </div>

      {isDesktop && (
        <div className="flex items-center gap-5">
          <ComparisonControls />
          <ResetAllButton />
        </div>
      )}
    </header>
  );
}
