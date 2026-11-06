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
import { formatCurrency, shortName } from '../utils/formatters';
import { useApp } from '../state/AppContext';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { cumulativeCostSeries } from '../calculations/costEngine';

interface CumulativeCostChartProps {
  results: CarCalculationResult[];
}

export function CumulativeCostChart({ results }: CumulativeCostChartProps) {
  const { state: { showDepreciation } } = useApp();
  const isDesktop = useIsDesktop();
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
    <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4">
      <h3 className="text-lg font-semibold text-gray-700 mb-3 px-1">
        {showDepreciation ? 'Net Cost Over Time (incl. Depreciation)' : 'Cumulative Cost Over Time'}
      </h3>
      <ResponsiveContainer width="100%" height={isDesktop ? 350 : 280}>
        <LineChart
          data={data}
          style={isDesktop ? undefined : { outline: 'none' }}
          margin={isDesktop ? { top: 5, right: 20, bottom: 5, left: 20 } : { top: 5, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: isDesktop ? 12 : 11 }}
            tickFormatter={(label: string) => (isDesktop ? label : label.replace('Year ', 'Y'))}
            interval={isDesktop ? undefined : 'preserveStartEnd'}
            minTickGap={8}
          />
          <YAxis
            width={isDesktop ? 60 : 40}
            tick={{ fontSize: isDesktop ? 12 : 11 }}
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(value, name) => [
              formatCurrency(Number(value)),
              isDesktop ? String(name) : shortName(String(name), 18),
            ]}
            contentStyle={{ fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: isDesktop ? 14 : 12 }} />
          {results.map((r, i) => (
            <Line
              key={r.carId}
              type="monotone"
              dataKey={r.carId}
              name={r.carName}
              stroke={getCarColor(i).hex}
              strokeWidth={2}
              dot={{ r: isDesktop ? 4 : 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
