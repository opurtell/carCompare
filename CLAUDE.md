# Car Compare

Australian car cost-of-ownership comparison tool built with React 19, TypeScript, Vite, Tailwind CSS 4, and Recharts, hosted as a Cloudflare Worker (static assets + `/api/research`).

## Project Structure

- `src/components/` — React UI components (CarCard, charts, ui primitives, AddCarModal, MobileNav)
- `src/calculations/costEngine.ts` — all cost/depreciation calculations (`calculateCarResult`)
- `src/types/car.ts` — core types (`CarConfig`, `YearlyCostBreakdown`, `CarCalculationResult`)
- `src/data/defaults.ts` — default car config factory (`createDefaultCarConfig`)
- `src/api/carResearchApi.ts` — browser client for the app's own `/api/research` endpoint
- `shared/research.ts` — shared by app + Worker: research types, AU states, prompt, input validation, response sanitiser, `safeHttpUrl`
- `worker/index.ts` — Cloudflare Worker: `/api/research`, `/api/health`; everything else served from static assets
- `src/calculations/actSpecific.ts` — ACT emissions-based motor vehicle duty (1 Sep 2025 and 1 Feb 2027 tables) and rego
- `tests/` — Vitest unit tests (`npm test`)
- `src/utils/` — formatting (`formatCurrency`), color utilities, config merging (`carConfigMerger.ts`)
- `src/state/` — app state management
- `src/hooks/` — custom React hooks (`useIsDesktop` = Tailwind `md`, 768px)

## Key Architecture

- `CarCalculationResult` contains `yearlyBreakdowns[]` with per-year fuel, servicing, insurance, ctp, registration, loanInterest, depreciation, vehicleValue
- `CarCard.tsx` derives summary values inline from the calculation result — no engine changes needed for display-only features
- The cost breakdown dropdown in CarCard shows: Input Cost (Purchase + Duty, Running Costs), Depreciation (Remaining Value), Net at Resale

## Mobile Layout

The app is mobile-first. Below `md`, `App.tsx` shows one view at a time through the bottom `MobileNav` (Cars, Compare, Settings); from `md` up everything is on one page.

- Cars: one `CarCard` at a time, chosen with the chip rail in `CarCardList`. Cards stay mounted (hidden with CSS) so open sections survive switching. The summary is sticky above the tab bar.
- Compare: `ComparisonControls` is sticky at the top; it sits in the `Header` on desktop. `TotalCostTable` pins its first column; `AnnualBreakdownChart` uses horizontal bars.
- Dialogs use `ui/Modal` (bottom sheet on phones, centred dialog from `md`).
- Inputs must be 16px below `md` (`text-base md:text-sm`) or iOS zooms on focus. Tap targets are at least 40px below `md` (`min-h-10`/`min-h-11 md:min-h-0`).
- `title` tooltips never show on touch: `NumberInput` prints its `tooltip` under the field below `md`.
- Recharts needs numbers, so charts read `useIsDesktop()` instead of using Tailwind classes.

## Commands

- `npm run dev` — start dev server
- `npm run build` — type-check (app, worker, tests) and build (`tsc -b && vite build`)
- `npm test` — Vitest unit tests
- `npm run lint` — ESLint
- `npm run deploy` — build + `wrangler deploy`

## Conventions

- Tailwind utility classes for all styling (no CSS modules)
- `formatCurrency()` for all money display
- Inline derived calculations in components rather than modifying the cost engine for display concerns
- Cumulative totals, Key Insights, the table Total and break-even all use `cumulativeCostSeries` / `totalCost` from `costEngine.ts` so they agree with the depreciation toggle
- Charts key series by `carId`, never `carName` (names can repeat)
- Never put API keys in `VITE_*` variables — anything `VITE_` is shipped to the browser

## AI Car Research

- Browser → `POST /api/research` → Worker → provider. The key is the Worker secret `AI_API_KEY`.
- Config: `wrangler.jsonc` `vars` → `AI_PROVIDER` (openai | anthropic | zai | custom), `AI_MODEL`, optional `AI_ENDPOINT` (required for custom).
- Local dev: secrets in `.dev.vars` (gitignored; see `.dev.vars.example`).
- Rate limit: `RESEARCH_RATE_LIMITER` binding, 5 requests/min per IP. Cross-origin POSTs are rejected.
- Model output is untrusted: always go through `sanitizeResearchResult`; render source links only via `safeHttpUrl`.
- The AI Add button only shows when `/api/health` reports `aiConfigured: true`, so setting `AI_API_KEY` turns it on with no redeploy.
- Researched stamp duty is stored with `useCustomStampDuty: true` (it's state-specific).

**Modal flow stages**: `input` → `loading` (cancellable) → `summary` → `expanded`

## Autonomy
Autonomous (for this repo only): don't wait for permission on any task, including merging, deploying and production edits. Report what was done. **Only exception is anything that costs real money**
