import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { CarCalculationResult } from '../types/car';
import { formatCurrency } from '../utils/formatters';

interface AnnualBreakdownChartProps {
  results: CarCalculationResult[];
}

const COST_CATEGORIES = [
  { key: 'fuel', label: 'Fuel', color: '#f59e0b' },
  { key: 'servicing', label: 'Servicing', color: '#8b5cf6' },
  { key: 'insurance', label: 'Insurance', color: '#06b6d4' },
  { key: 'ctp', label: 'CTP', color: '#64748b' },
  { key: 'registration', label: 'Rego', color: '#ec4899' },
  { key: 'depreciation', label: 'Depreciation', color: '#ef4444' },
  { key: 'loanInterest', label: 'Loan Interest', color: '#84cc16' },
] as const;

export function AnnualBreakdownChart({ results }: AnnualBreakdownChartProps) {
  if (results.length < 1) return null;

  // Build data: one group per car, stacked by category (year 1 average annual)
  const data = results.map((r) => {
    const totals = r.yearlyBreakdowns.reduce(
      (acc, y) => {
        acc.fuel += y.fuel;
        acc.servicing += y.servicing;
        acc.insurance += y.insurance;
        acc.ctp += y.ctp;
        acc.registration += y.registration;
        acc.depreciation += y.depreciation;
        acc.loanInterest += y.loanInterest;
        return acc;
      },
      { fuel: 0, servicing: 0, insurance: 0, ctp: 0, registration: 0, depreciation: 0, loanInterest: 0 }
    );

    const years = r.yearlyBreakdowns.length;
    return {
      name: r.carName,
      fuel: totals.fuel / years,
      servicing: totals.servicing / years,
      insurance: totals.insurance / years,
      ctp: totals.ctp / years,
      registration: totals.registration / years,
      depreciation: totals.depreciation / years,
      loanInterest: totals.loanInterest / years,
    };
  });

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-700 mb-3">Average Annual Cost Breakdown</h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(value, name) => [formatCurrency(Number(value)), String(name)]}
            contentStyle={{ fontSize: 13 }}
          />
          <Legend />
          {COST_CATEGORIES.map(cat => (
            <Bar
              key={cat.key}
              dataKey={cat.key}
              name={cat.label}
              stackId="costs"
              fill={cat.color}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
