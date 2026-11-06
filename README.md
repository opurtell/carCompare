# Car Cost Compare

Australian (ACT-focused) car total-cost-of-ownership comparison tool. Compare up to 5 cars across
fuel, servicing, insurance, CTP, rego, stamp duty, loan interest and depreciation over 1–10 years,
with a built-in catalogue of popular cars and an optional AI lookup (Gemini + Google Search) for the rest.

**Stack:** React 19 · TypeScript · Vite 8 · Tailwind CSS 4 · Recharts · Cloudflare Workers (static assets + `/api/research`).

## Quick start

1. Install dependencies
   ```bash
   npm install
   ```
2. Add your AI key for local dev (optional)
   ```bash
   cp .dev.vars.example .dev.vars   # then set AI_API_KEY
   ```
   *Provider and model are set in `wrangler.jsonc` → `vars` (currently Gemini / `gemini-2.5-flash` with Google Search grounding). Get a free key at https://aistudio.google.com/apikey.*
3. Run it
   ```bash
   npm run dev
   ```
   *Runs the Vite app and the Worker together (via `@cloudflare/vite-plugin`), so `/api/research` works locally exactly as in production.*

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (app + Worker) |
| `npm run build` | Type-check (app, worker, tests) and build to `dist/` |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run preview` | Build, then serve the production build locally in workerd |
| `npm run deploy` | Build and `wrangler deploy` to Cloudflare |

## How the AI research works

- The browser posts `{ make, model, year, trim?, state }` to `/api/research`.
- The Worker (`worker/index.ts`) validates input, rate-limits per IP, checks its 30-day cache, builds the prompt, calls the provider with the `AI_API_KEY` secret, and returns a sanitised result.
- The AI only returns facts about the car. Stamp duty, rego and CTP are calculated in the app from ACT rules.
- The API key never ships to the browser.

## Deploying

See `docs/HANDOVER.md` for the remaining Cloudflare deployment steps.
