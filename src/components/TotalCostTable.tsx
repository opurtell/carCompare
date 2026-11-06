import type { CarCalculationResult } from '../types/car';
import { formatCurrency } from '../utils/formatters';
import { getCarColor } from '../utils/colors';
import { useApp } from '../state/AppContext';
import { totalCost } from '../calculations/costEngine';

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

  // With depreciation: net cost of ownership (value lost, not purchase price).
  // Without: total cash outlay, so the purchase price is shown as its own row.
  // Either way the Total matches the cumulative chart and Key Insights.
  const rows: RowDef[] = [
    ...(showDepreciation ? [] : [{ label: 'Purchase Price', getValue: (r: CarCalculationResult) => r.purchasePrice }]),
    ...ROWS.filter(r => r.label !== 'Total' && (showDepreciation || r.label !== 'Depreciation')),
    { label: 'Total', getValue: r => totalCost(r, showDepreciation) },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4">
      <h3 className="text-lg font-semibold text-gray-700 mb-3 px-1">Cost Breakdown</h3>
      {results.length > 2 && (
        <p className="md:hidden text-xs text-gray-500 mb-2 px-1">Swipe the table sideways to see every car.</p>
      )}
      {/* Category column stays pinned so a row is readable while swiping across cars. */}
      <div className="overflow-x-auto">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="sticky left-0 z-[1] shadow-[1px_0_0_#e5e7eb] md:shadow-none bg-white text-left py-2 pl-1 pr-3 text-gray-500 font-medium border-b-2 border-gray-200">
              Category
            </th>
            {results.map((r, i) => (
              <th
                key={r.carId}
                className="text-right align-bottom py-2 px-3 font-medium min-w-[6rem] border-b-2 border-gray-200"
                style={{ color: getCarColor(i).hex }}
              >
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
                className={isTotal ? 'font-bold' : ''}
              >
                <td
                  className={`sticky left-0 z-[1] shadow-[1px_0_0_#e5e7eb] md:shadow-none py-2 pl-1 pr-3 text-gray-600 border-b border-gray-100 whitespace-nowrap ${
                    isTotal ? 'bg-gray-50' : 'bg-white'
                  }`}
                >
                  {row.label}
                </td>
                {values.map((val, i) => (
                  <td
                    key={results[i].carId}
                    className={`py-2 px-3 text-right border-b border-gray-100 ${isTotal ? 'bg-gray-50' : ''} ${
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
    </div>
  );
}
