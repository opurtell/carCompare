import type { CarCalculationResult } from '../types/car';
import { formatCurrency } from '../utils/formatters';
import { getCarColor } from '../utils/colors';
import { useApp } from '../state/AppContext';

interface TotalCostTableProps {
  results: CarCalculationResult[];
}

interface RowDef {
  label: string;
  getValue: (r: CarCalculationResult) => number;
}

const ROWS: RowDef[] = [
  { label: 'Stamp Duty', getValue: r => r.stampDuty },
  { label: 'Fuel', getValue: r => r.yearlyBreakdowns.reduce((s, y) => s + y.fuel, 0) },
  { label: 'Servicing', getValue: r => r.yearlyBreakdowns.reduce((s, y) => s + y.servicing, 0) },
  { label: 'Insurance', getValue: r => r.yearlyBreakdowns.reduce((s, y) => s + y.insurance, 0) },
  { label: 'CTP', getValue: r => r.yearlyBreakdowns.reduce((s, y) => s + y.ctp, 0) },
  { label: 'Registration', getValue: r => r.yearlyBreakdowns.reduce((s, y) => s + y.registration, 0) },
  { label: 'Depreciation', getValue: r => r.yearlyBreakdowns.reduce((s, y) => s + y.depreciation, 0) },
  { label: 'Loan Interest', getValue: r => r.yearlyBreakdowns.reduce((s, y) => s + y.loanInterest, 0) },
  { label: 'Total', getValue: r => r.totalCostOfOwnership },
];

export function TotalCostTable({ results }: TotalCostTableProps) {
  const { state: { showDepreciation } } = useApp();
  if (results.length < 2) return null;

  const rows = showDepreciation
    ? ROWS
    : ROWS.filter(r => r.label !== 'Depreciation').map(r =>
        r.label === 'Total'
          ? { ...r, getValue: (res: CarCalculationResult) => res.totalCostOfOwnership - res.yearlyBreakdowns.reduce((s, y) => s + y.depreciation, 0) }
          : r,
      );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="text-left py-2 px-3 text-gray-500 font-medium">Category</th>
            {results.map((r, i) => (
              <th key={r.carId} className="text-right py-2 px-3 font-medium" style={{ color: getCarColor(i).hex }}>
                {r.carName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const values = results.map(r => row.getValue(r));
            const minVal = Math.min(...values);
            const isTotal = row.label === 'Total';
            const allZero = values.every(v => v === 0);

            if (allZero && !isTotal) return null;

            return (
              <tr
                key={row.label}
                className={`border-b border-gray-100 ${isTotal ? 'font-bold bg-gray-50' : ''}`}
              >
                <td className="py-2 px-3 text-gray-600">{row.label}</td>
                {values.map((val, i) => (
                  <td
                    key={results[i].carId}
                    className={`py-2 px-3 text-right ${
                      !allZero && val === minVal && !isTotal
                        ? 'text-green-600 font-medium'
                        : ''
                    } ${
                      isTotal && val === minVal ? 'text-green-700' : ''
                    }`}
                  >
                    {formatCurrency(val)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
