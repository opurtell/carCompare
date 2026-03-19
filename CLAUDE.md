# Car Compare

Australian car cost-of-ownership comparison tool built with React 19, TypeScript, Vite, Tailwind CSS 4, and Recharts.

## Project Structure

- `src/components/` — React UI components (CarCard, charts, ui primitives)
- `src/calculations/costEngine.ts` — all cost/depreciation calculations (`calculateCarResult`)
- `src/types/car.ts` — core types (`CarConfig`, `YearlyCostBreakdown`, `CarCalculationResult`)
- `src/data/defaults.ts` — default car config factory (`createDefaultCarConfig`)
- `src/utils/` — formatting (`formatCurrency`) and color utilities
- `src/state/` — app state management
- `src/hooks/` — custom React hooks

## Key Architecture

- `CarCalculationResult` contains `yearlyBreakdowns[]` with per-year fuel, servicing, insurance, ctp, registration, loanInterest, depreciation, vehicleValue
- `CarCard.tsx` derives summary values inline from the calculation result — no engine changes needed for display-only features
- The cost breakdown dropdown in CarCard shows: Input Cost (Purchase + Duty, Running Costs), Depreciation (Remaining Value), Net at Resale

## Commands

- `npm run dev` — start dev server
- `npm run build` — type-check and build (`tsc -b && vite build`)
- `npm run lint` — ESLint
- `npx tsc --noEmit` — type-check only

## Conventions

- Tailwind utility classes for all styling (no CSS modules)
- `formatCurrency()` for all money display
- Inline derived calculations in components rather than modifying the cost engine for display concerns
