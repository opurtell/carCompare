import type { CarCalculationResult } from '../types/car';
import { TotalCostTable } from './TotalCostTable';
import { CumulativeCostChart } from './CumulativeCostChart';
import { AnnualBreakdownChart } from './AnnualBreakdownChart';
import { KeyInsights } from './KeyInsights';
import { CostRanking } from './CostRanking';

interface ComparisonDashboardProps {
  results: CarCalculationResult[];
  years: number;
  /** Shown on phones, where the car editor is on another tab. */
  onAddCars?: () => void;
}

export function ComparisonDashboard({ results, years, onAddCars }: ComparisonDashboardProps) {
  if (results.length < 2) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg">Add at least 2 cars to see comparisons</p>
        {onAddCars && (
          <button
            onClick={onAddCars}
            className="mt-4 min-h-11 px-5 rounded-lg bg-blue-500 text-white text-sm font-medium"
          >
            Go to Cars
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:gap-8">
      <CostRanking results={results} years={years} />
      <KeyInsights results={results} years={years} />
      <TotalCostTable results={results} />
      <CumulativeCostChart results={results} />
      <AnnualBreakdownChart results={results} />
    </div>
  );
}
