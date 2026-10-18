# Car Compare

Australian car cost-of-ownership comparison tool built with React 19, TypeScript, Vite, Tailwind CSS 4, and Recharts.

## Project Structure

- `src/components/` — React UI components (CarCard, charts, ui primitives, AddCarModal)
- `src/calculations/costEngine.ts` — all cost/depreciation calculations (`calculateCarResult`)
- `src/types/car.ts` — core types (`CarConfig`, `YearlyCostBreakdown`, `CarCalculationResult`)
- `src/data/defaults.ts` — default car config factory (`createDefaultCarConfig`)
- `src/api/` — external API integrations (`carResearchApi.ts` for AI car research)
- `src/utils/` — formatting (`formatCurrency`), color utilities, config merging (`carConfigMerger.ts`)
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

## AI Car Research

**Multi-provider API support**: OpenAI, Anthropic, Z.ai, or custom OpenAI-compatible endpoints

**Environment variables** (in `.env`):
```bash
VITE_AI_PROVIDER=openai|anthropic|zai|custom
VITE_AI_API_KEY=your_api_key
VITE_ZAI_MODEL=glm-5  # Optional, default for Z.ai
VITE_AI_ENDPOINT=https://...  # Optional custom endpoint
```

**Z.ai API specifics**:
- Endpoint: `https://api.z.ai/api/paas/v4/chat/completions`
- Default model: `glm-5` (configurable via `VITE_ZAI_MODEL`)
- OpenAI-compatible request format with `stream` parameter

**CORS handling**:
- Vite dev server proxy configured in `vite.config.ts` bypasses CORS in development
- Production requires server-side proxy (set `VITE_AI_ENDPOINT`)

**Modal flow stages**: `input` → `loading` → `summary` → `expanded`
