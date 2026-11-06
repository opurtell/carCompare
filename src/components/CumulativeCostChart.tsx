import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { CarCalculationResult } from '../types/car';
import { getCarColor } from '../utils/colors';
import { formatCurrency } from '../utils/formatters';
import { useApp } from '../state/AppContext';
import { cumulativeCostSeries } from '../calculations/costEngine';

interface CumulativeCostChartProps {
  results: CarCalculationResult[];
}

export function CumulativeCostChart({ results }: CumulativeCostChartProps) {
  const { state: { showDepreciation } } = useApp();
  if (results.length < 2) return null;

  // Keyed by carId (not name) so two cars with the same name don't overwrite each other.
  const series = results.map(r => cumulativeCostSeries(r, showDepreciation));
  const years = results[0].yearlyBreakdowns.length;
  const data = Array.from({ length: years + 1 }, (_, y) => {
    const point: Record<string, number | string> = { year: y === 0 ? 'Start' : `Year ${y}` };
    results.forEach((r, i) => {
      point[r.carId] = series[i][y];
    });
    return point;
  });

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-700 mb-3">
        {showDepreciation ? 'Net Cost Over Time (incl. Depreciation)' : 'Cumulative Cost Over Time'}
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            contentStyle={{ fontSize: 13 }}
          />
          <Legend />
          {results.map((r, i) => (
            <Line
              key={r.carId}
              type="monotone"
              dataKey={r.carId}
              name={r.carName}
              stroke={getCarColor(i).hex}
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
