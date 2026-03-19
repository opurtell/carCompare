import type { CarCalculationResult } from '../types/car';
import { TotalCostTable } from './TotalCostTable';
import { CumulativeCostChart } from './CumulativeCostChart';
import { AnnualBreakdownChart } from './AnnualBreakdownChart';
import { KeyInsights } from './KeyInsights';

interface ComparisonDashboardProps {
  results: CarCalculationResult[];
  years: number;
}

export function ComparisonDashboard({ results, years }: ComparisonDashboardProps) {
  if (results.length < 2) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg">Add at least 2 cars to see comparisons</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <KeyInsights results={results} years={years} />
      <TotalCostTable results={results} />
      <CumulativeCostChart results={results} />
      <AnnualBreakdownChart results={results} />
    </div>
  );
}
