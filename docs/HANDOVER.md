# Car Compare — Handover (6 Nov 2026)

Goal of the next phase: **host Car Compare on Cloudflare with full feature parity**, and get the code into its remote repo.

---

## 1. Where things stand

- **Review and fixes: done.** All changes are in `~/claudeCode/apps/carCompare`, **not yet committed**.
- **Checks passing:** `npm run build`, `npm run lint`, `npm test` (18 tests).
- **Cloudflare Worker: written and tested locally, not deployed.**
  *The key-in-browser fix needed a server-side proxy, so `worker/index.ts`, `wrangler.jsonc` and the Cloudflare Vite plugin are already in place. `npm run dev` runs it.*
- **Remote repo: already exists** at `github.com/opurtell/carcompare` (**public**).
  *Local `main` is 1 commit ahead of `origin/main` (`d5895b4`), plus today's uncommitted changes. `.env` has never been committed.*
- **Local AI key:** `.dev.vars` was created from your existing `.env` key (gitignored). The old `VITE_AI_*` lines in `.env` are no longer read and can be deleted.

---

## 2. Remaining steps

### Step 1 — Install, check, commit the review fixes
```bash
cd ~/claudeCode/apps/carCompare
npm install
rm .env.example .carcompare.bundle .carcompare-changes.tgz
npm run build && npm run lint && npm test
git checkout -b web-cloudflare
git add -A && git commit -m "Review fixes + Cloudflare Worker for AI research"
```
*`rm` clears the old env template and two transfer files from this session. Check `git status` before committing: `.dev.vars` and `.env` must NOT be staged (both are gitignored).*

### Step 2 — Decide repo visibility, then push
- **Keep public** or make private: GitHub → repo → Settings → Danger Zone → Change visibility.
  *No secrets are in history either way.*
```bash
git push -u origin web-cloudflare
```
- Merge to `main` via PR when happy.

### Step 3 — Log in to Cloudflare
```bash
npx wrangler login
```
*Opens a browser to authorise Wrangler against your Cloudflare account.*

### Step 4 — Set the AI key as a Worker secret
```bash
npx wrangler secret put AI_API_KEY
```
*Paste the Z.ai key when prompted. Provider/model are in `wrangler.jsonc` → `vars` (`zai` / `glm-4.7-flash`).*
*If Wrangler says the Worker doesn't exist yet, run Step 5 first, then this.*

### Step 5 — Deploy
```bash
npm run deploy
```
*Builds, then deploys to `https://carcompare.<your-subdomain>.workers.dev`.*

### Step 6 — Verify production
- Open `/api/health` → expect `"aiConfigured": true`.
- Run the checklist in section 4.

### Step 7 — Lock it down (recommended)
- **Cloudflare Access:** Zero Trust → Access → Applications → Self-hosted → your workers.dev or custom domain → allow the email addresses you want.
  *The site uses your paid AI key. Rate limiting (5/min per IP) limits damage but doesn't stop a determined stranger. Access is free for up to 50 users.*

### Step 8 — Optional extras
- **Custom domain:** Workers & Pages → carcompare → Settings → Domains & Routes.
- **Auto-deploy on push:** Workers & Pages → carcompare → Settings → Build → connect `opurtell/carcompare`.
  *Build command `npm run build`, deploy command `npx wrangler deploy`. The `AI_API_KEY` secret persists across deploys.*

---

## 3. What the review found and fixed

| Area | Problem | Fix |
|---|---|---|
| **Security** | AI key in `VITE_AI_API_KEY` was baked into the browser bundle | Moved behind Worker `/api/research`; key is a server secret. Bundle verified clean |
| **Security** | Production build called AI APIs directly (CORS failure) | Worker proxy; same path in dev and prod |
| **Security** | AI "source" strings rendered as raw `href` | Only `http(s)` URLs become links (`safeHttpUrl`) |
| **Security** | Model JSON used unvalidated → NaN totals, bad fuel types | `sanitizeResearchResult` coerces and clamps every field |
| **Abuse** | Open proxy would let anyone burn the key | Input validation, 2 KB body cap, same-origin check, 5/min/IP rate limit |
| **ACT rules** | EVs treated as stamp-duty exempt; flat 3%/5% scale | Emissions-based duty (AAA–D, $45k/$80k bands, per $100 or part); 1 Feb 2027 rates switch automatically |
| **ACT rules** | EVs defaulted to 2 years free rego + invented 50% third year | Scheme closed 30 Jun 2024 → default 0; 50% step removed; field kept for manual use |
| **Calc** | AI-researched stamp duty silently replaced by ACT auto-calc (wrong for other states) | Researched duty kept as an override |
| **Calc** | Fractional loan term (e.g. 4.6) left loan partly unpaid | Term rounded; input integer-only |
| **Calc** | Enabling loan left amount at $0 | Defaults to purchase price |
| **Consistency** | With depreciation off, table Total excluded purchase price but chart included it; Key Insights/break-even always used depreciation | All use shared `cumulativeCostSeries` / `totalCost`; table adds a Purchase Price row |
| **Calc** | Break-even in year 1 never detected | Series starts at year 0 |
| **Charts** | Two cars with the same name overwrote each other | Series keyed by `carId` |
| **UX** | Default names restarted at "Car 1" after reload | `nextCarName` picks the lowest free number |
| **UX** | Clearing a number field set it to 0; negatives allowed | `NumberInput` keeps a draft, clamps on commit |
| **UX** | Year field snapped to 2024 when cleared | Ignores invalid input |
| **UX** | No way to cancel a slow AI request; no Escape to close modals | Cancel button (aborts fetch); Escape closes; dialog ARIA |
| **UX** | Error message linked to `.env.example` (404 when hosted) | Replaced with setup hint |
| **Data** | Edits in the 500 ms before closing the tab were lost | Save flushes on `pagehide` / hidden tab |
| **Data** | Corrupt or old saves could crash load | Per-car migration with defaults |
| **Data** | Reset reloaded the page | Resets state in place |
| **Models** | Anthropic default `claude-3-7-sonnet-20250219` is retired | Default `claude-sonnet-5-5`; any model via `AI_MODEL` |
| **Hygiene** | 14 lint errors, prod `console.log`s, template README, package `carcompare-temp` | All fixed; README rewritten; tests added |
| **Deps** | High-severity `npm audit` items (postcss, nanoid, esbuild) | `npm audit fix` — 7 moderate remain, dev-tooling only (minimatch) |

---

## 4. Production test checklist

1. Add 2+ cars → table, both charts and Key Insights render.
2. Toggle **Depreciation** → table Total, chart and "cheapest" all change together.
3. Set the same name on two cars → both lines still show in the cumulative chart.
4. **AI Add** → research a real car (e.g. Toyota RAV4 2026 ACT) → summary → Add.
5. AI Add → Cancel during loading → back to the form, no error.
6. Save a car to the Library → reload → it's still there.
7. Reset All → empty state, no reload.
8. Fire 6 AI requests in a minute → 6th returns the rate-limit message.

---

## 5. Known gaps (not done)

- **ACT rego** is a flat `regoPerYear`; the real fee is emissions-based. *AI research usually supplies a reasonable figure.*
- **Duty date** uses today's date, not a purchase date. **Used-vehicle duty** isn't modelled.
- **Duty category** is estimated from L/100km (PHEV → AA). *Override the stamp duty if you know the Green Vehicle Guide figure.*
- **CTP default ($600)** hasn't been re-verified.
- **Bundle size** 611 KB (Recharts). *Could code-split the dashboard.*
- **`glm-4.7-flash`** taken from your `.env`; confirm it's still offered by Z.ai.

---

## 6. Key files

| File | Purpose |
|---|---|
| `worker/index.ts` | Worker: `/api/research`, `/api/health`, static assets |
| `shared/research.ts` | Prompt, validation, sanitiser (shared by app + Worker) |
| `wrangler.jsonc` | Worker name, vars, rate limit, SPA asset handling |
| `src/calculations/actSpecific.ts` | ACT duty tables and rego |
| `src/calculations/costEngine.ts` | Yearly costs, cumulative series, break-even |
| `.dev.vars.example` | Local secret template |
