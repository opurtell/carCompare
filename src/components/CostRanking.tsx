import type { CarCalculationResult } from '../types/car';
import { rankCarsByCost } from '../calculations/costEngine';
import { getCarColor } from '../utils/colors';
import { formatCurrency } from '../utils/formatters';
import { useApp } from '../state/AppContext';

interface CostRankingProps {
  results: CarCalculationResult[];
  years: number;
}

export function CostRanking({ results, years }: CostRankingProps) {
  const { state: { showDepreciation } } = useApp();
  if (results.length < 2) return null;

  const ranked = rankCarsByCost(results, showDepreciation);
  const cheapest = ranked[0].total;
  const highest = Math.max(ranked[ranked.length - 1].total, 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-700">Cheapest First</h3>
      <p className="text-xs text-gray-500 mb-3">
        {showDepreciation ? 'Net cost after resale' : 'Total cash outlay'} over {years}{' '}
        {years === 1 ? 'year' : 'years'}
      </p>
      <ol className="flex flex-col gap-3">
        {ranked.map(({ result, index, total }, rank) => {
          const color = getCarColor(index);
          return (
            <li key={result.carId}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium text-gray-800 truncate">{result.carName}</span>
                <span className="shrink-0 whitespace-nowrap">
                  {rank > 0 && (
                    <span className="text-xs text-gray-500 mr-2">+{formatCurrency(total - cheapest)}</span>
                  )}
                  <span className="font-semibold text-gray-800">{formatCurrency(total)}</span>
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max((total / highest) * 100, 2)}%`,
                    backgroundColor: color.hex,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
