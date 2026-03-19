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

interface CumulativeCostChartProps {
  results: CarCalculationResult[];
}

const RUNNING_FIELDS = ['fuel', 'servicing', 'insurance', 'ctp', 'registration', 'loanInterest'] as const;

export function CumulativeCostChart({ results }: CumulativeCostChartProps) {
  const { state: { showDepreciation } } = useApp();
  if (results.length < 2) return null;

  const years = results[0].yearlyBreakdowns.length;
  const data = [];

  for (let y = 0; y <= years; y++) {
    const point: Record<string, number | string> = { year: y === 0 ? 'Start' : `Year ${y}` };
    for (const r of results) {
      const upfrontCost = r.purchasePrice + r.stampDuty;
      if (y === 0) {
        point[r.carName] = upfrontCost;
      } else if (showDepreciation) {
        point[r.carName] = r.yearlyBreakdowns[y - 1].cumulativeTotal + upfrontCost;
      } else {
        const runningTotal = r.yearlyBreakdowns
          .slice(0, y)
          .reduce((sum, yr) => sum + RUNNING_FIELDS.reduce((s, f) => s + yr[f], 0), 0);
        point[r.carName] = runningTotal + upfrontCost;
      }
    }
    data.push(point);
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-700 mb-3">Cumulative Cost Over Time</h3>
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
              dataKey={r.carName}
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
