import type { CarCalculationResult } from '../types/car';
import { formatCurrency } from '../utils/formatters';
import { getCarColor } from '../utils/colors';
import { findBreakEvenYear } from '../calculations/costEngine';

interface KeyInsightsProps {
  results: CarCalculationResult[];
  years: number;
}

export function KeyInsights({ results, years }: KeyInsightsProps) {
  if (results.length < 2) return null;

  // Find cheapest overall
  const sorted = [...results].sort((a, b) => a.totalCostOfOwnership - b.totalCostOfOwnership);
  const cheapest = sorted[0];
  const mostExpensive = sorted[sorted.length - 1];
  const totalSavings = mostExpensive.totalCostOfOwnership - cheapest.totalCostOfOwnership;
  const annualSavings = totalSavings / years;

  // Find break-even years between all pairs
  const breakEvens: { carA: string; carB: string; year: number }[] = [];
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const year = findBreakEvenYear(results[i], results[j]);
      if (year !== null) {
        breakEvens.push({
          carA: results[i].carName,
          carB: results[j].carName,
          year,
        });
      }
    }
  }

  const cheapestIndex = results.findIndex(r => r.carId === cheapest.carId);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-5">
      <h3 className="text-lg font-semibold text-gray-700 mb-3">Key Insights</h3>
      <div className="flex flex-col gap-2 text-sm text-gray-700">
        <p>
          <span
            className="font-bold"
            style={{ color: getCarColor(cheapestIndex).hex }}
          >
            {cheapest.carName}
          </span>
          {' '}is the cheapest option over {years} years at{' '}
          <span className="font-semibold">{formatCurrency(cheapest.totalCostOfOwnership)}</span>
          , saving{' '}
          <span className="font-semibold text-green-600">{formatCurrency(totalSavings)}</span>
          {' '}vs the most expensive option ({mostExpensive.carName}).
        </p>

        <p>
          That's roughly{' '}
          <span className="font-semibold text-green-600">{formatCurrency(annualSavings)}/year</span>
          {' '}in savings.
        </p>

        {breakEvens.length > 0 && (
          <div className="mt-2">
            <p className="font-medium text-gray-600">Break-even points:</p>
            <ul className="list-disc list-inside mt-1">
              {breakEvens.map((be, i) => (
                <li key={i}>
                  {be.carA} vs {be.carB}: Year {be.year}
                </li>
              ))}
            </ul>
          </div>
        )}

        {breakEvens.length === 0 && (
          <p className="text-gray-500 italic">
            No break-even point found within the {years}-year comparison period.
          </p>
        )}
      </div>
    </div>
  );
}
