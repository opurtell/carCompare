#!/usr/bin/env node
// Collects CarsGuide used-price tables for the models in src/data/usedCatalogue.ts.
//
//   node scrape.mjs check   parse toyota/corolla/2018 only and print it
//   node scrape.mjs run     crawl everything, writing rows.json and missing.json
//   CACHE_DIR=/path node scrape.mjs run   where raw HTML is cached (resumable)
//
// One request at a time, >= 1.5 s apart. Stops at the first 403/429/captcha.
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const CACHE = process.env.CACHE_DIR ?? join(HERE, '.cache');
const BASE = 'https://www.carsguide.com.au';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const DELAY_MS = 1500;
const YEAR_MIN = 2014;
const YEAR_MAX = 2025;

// Our "Make|Model" -> candidate CarsGuide slugs, tried in order until a model page exists.
const SLUGS = {
  'BYD|Atto 3': ['byd/atto-3'],
  'BYD|Dolphin': ['byd/dolphin'],
  'BYD|Seal': ['byd/seal'],
  'Ford|Escape': ['ford/escape'],
  'Ford|Focus': ['ford/focus'],
  'Holden|Commodore': ['holden/commodore'],
  'Holden|Cruze': ['holden/cruze'],
  'Honda|CR-V': ['honda/cr-v'],
  'Honda|Civic': ['honda/civic'],
  'Honda|Jazz': ['honda/jazz'],
  'Hyundai|Elantra': ['hyundai/elantra'],
  'Hyundai|Ioniq 5': ['hyundai/ioniq-5'],
  'Hyundai|Ioniq': ['hyundai/ioniq'],
  'Hyundai|Kona Electric': ['hyundai/kona'],
  'Hyundai|Tucson': ['hyundai/tucson'],
  'Hyundai|Venue': ['hyundai/venue'],
  'Hyundai|i30': ['hyundai/i30'],
  'Kia|Cerato': ['kia/cerato'],
  'Kia|EV6': ['kia/ev6'],
  'Kia|Rio': ['kia/rio'],
  'Kia|Seltos': ['kia/seltos'],
  'Kia|Sportage': ['kia/sportage'],
  'MG|HS': ['mg/hs'],
  'MG|ZS EV': ['mg/zs-ev', 'mg/zs'],
  'MG|ZS': ['mg/zs'],
  'Mazda|CX-3': ['mazda/cx-3'],
  'Mazda|CX-30': ['mazda/cx-30'],
  'Mazda|CX-5': ['mazda/cx-5'],
  'Mazda|Mazda2': ['mazda/2'],
  'Mazda|Mazda3': ['mazda/3'],
  'Mitsubishi|ASX': ['mitsubishi/asx'],
  'Mitsubishi|Lancer': ['mitsubishi/lancer'],
  'Mitsubishi|Outlander PHEV': ['mitsubishi/outlander'],
  'Mitsubishi|Outlander': ['mitsubishi/outlander'],
  'Nissan|Leaf': ['nissan/leaf'],
  'Nissan|Pulsar': ['nissan/pulsar'],
  'Nissan|Qashqai': ['nissan/qashqai'],
  'Nissan|X-Trail': ['nissan/x-trail'],
  'Subaru|Forester': ['subaru/forester'],
  'Subaru|Outback': ['subaru/outback'],
  'Subaru|XV': ['subaru/xv'],
  'Suzuki|Swift': ['suzuki/swift'],
  'Suzuki|Vitara': ['suzuki/vitara'],
  'Tesla|Model 3': ['tesla/model-3'],
  'Tesla|Model Y': ['tesla/model-y'],
  'Toyota|C-HR': ['toyota/c-hr'],
  'Toyota|Camry': ['toyota/camry'],
  'Toyota|Corolla Cross': ['toyota/corolla-cross'],
  'Toyota|Corolla': ['toyota/corolla'],
  'Toyota|Kluger': ['toyota/kluger'],
  'Toyota|Prius': ['toyota/prius'],
  'Toyota|RAV4': ['toyota/rav4'],
  'Toyota|Yaris Cross': ['toyota/yaris-cross'],
  'Toyota|Yaris': ['toyota/yaris'],
  'Volkswagen|Golf': ['volkswagen/golf'],
  'Volkswagen|Polo': ['volkswagen/polo'],
  'Volkswagen|Tiguan': ['volkswagen/tiguan'],
};

const clean = (s) =>
  s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Returns {rows: [{body, variant, specs, low, high}], bad: [raw row text that didn't parse]}. */
export function parseYearPage(html) {
  const rows = [];
  const bad = [];
  const parts = html.split(/<div data-body-type="/).slice(1);
  for (const part of parts) {
    const body = clean(part.slice(0, part.indexOf('"')));
    const table = part.slice(0, part.search(/<\/table>/) + 1 || undefined);
    for (const tr of table.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/g) ?? []) {
      if (/<th\b/.test(tr)) continue;
      const cells = (tr.match(/<td\b[^>]*>[\s\S]*?<\/td>/g) ?? []).map(clean);
      const variant = cells[0] ?? '';
      const specs = (cells[1] ?? '').replace(/^Specs:\s*/, '');
      const price = (cells[2] ?? '').replace(/^Price:\s*/, '');
      const m = price.match(/^\$([\d,]+)\s*-\s*\$([\d,]+)$/);
      if (m && variant) {
        rows.push({
          body,
          variant,
          specs,
          low: Number(m[1].replace(/,/g, '')),
          high: Number(m[2].replace(/,/g, '')),
        });
      } else {
        bad.push({ body, variant, specs, price });
      }
    }
  }
  return { rows, bad };
}

// A slug shared by two of our names: decide which name a row belongs to.
const isElectrified = (r) => /electric/i.test(r.specs);
const SHARED = {
  'mitsubishi/outlander': (r) => (/phev/i.test(r.variant) || isElectrified(r) ? 'Outlander PHEV' : 'Outlander'),
  // Kona hybrids also say "Electric" in specs; a pure EV's specs start with it.
  'hyundai/kona': (r) => (/^electric/i.test(r.specs) ? 'Kona Electric' : 'Kona'),
};

let lastRequest = 0;
class Blocked extends Error {}

async function get(path) {
  const cacheFile = join(CACHE, path.replace(/^\//, '').replace(/\//g, '__') + '.html');
  const notFound = cacheFile + '.status';
  if (existsSync(cacheFile)) return { status: 200, html: readFileSync(cacheFile, 'utf8') };
  if (existsSync(notFound)) return { status: Number(readFileSync(notFound, 'utf8')), html: '' };

  const wait = lastRequest + DELAY_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();

  let res;
  for (let attempt = 0; ; attempt++) {
    try {
      res = await fetch(BASE + path, {
        redirect: 'manual',
        headers: { 'User-Agent': UA, Accept: 'text/html', 'Accept-Language': 'en-AU,en;q=0.9' },
      });
      break;
    } catch (e) {
      if (attempt >= 2) throw e;
      await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
    }
  }
  if (res.status === 403 || res.status === 429) {
    throw new Blocked(`HTTP ${res.status} on ${path}`);
  }
  if (res.status === 200) {
    const html = await res.text();
    if (/captcha|cf-chl|Access Denied|Just a moment/i.test(html.slice(0, 4000))) {
      throw new Blocked(`challenge page on ${path}`);
    }
    writeFileSync(cacheFile, html);
    return { status: 200, html };
  }
  await res.arrayBuffer().catch(() => {});
  const location = res.headers.get('location') ?? '';
  if (res.status >= 500) return { status: res.status, html: '', location, transient: true };
  writeFileSync(notFound, String(res.status));
  return { status: res.status, html: '', location };
}

function catalogueModels() {
  const src = readFileSync(join(REPO, 'src/data/usedCatalogue.ts'), 'utf8');
  const seen = new Map();
  for (const [, make, model] of src.matchAll(/"make": "([^"]+)", "model": "([^"]+)"/g)) {
    seen.set(`${make}|${model}`, { make, model });
  }
  return [...seen.values()];
}

async function resolveSlug(key) {
  const tried = [];
  for (const slug of SLUGS[key]) {
    const { status, html, location } = await get(`/${slug}/price`);
    if (status === 200) {
      const years = [...html.matchAll(new RegExp(`/${slug}/price/(\\d{4})\\b`, 'g'))].map((m) => Number(m[1]));
      if (years.length) return { slug, years: [...new Set(years)].sort() };
      tried.push(`${slug}: no years on page`);
    } else {
      tried.push(`${slug}: HTTP ${status}${location ? ` -> ${location}` : ''}`);
    }
  }
  return { error: tried.join('; ') };
}

function save(rows, missing) {
  const write = (name, data) => {
    const p = join(HERE, name);
    writeFileSync(p + '.tmp', JSON.stringify(data, null, 1));
    renameSync(p + '.tmp', p);
  };
  write('rows.json', rows);
  write('missing.json', missing);
}

async function run() {
  const models = catalogueModels();
  const unmapped = models.filter((m) => !SLUGS[`${m.make}|${m.model}`]);
  if (unmapped.length) throw new Error('unmapped: ' + JSON.stringify(unmapped));
  console.log(`${models.length} models`);

  const rows = [];
  const missing = [];
  const done = new Set(); // slug/year already emitted, so shared slugs aren't written twice
  const claim = {}; // make -> slugs resolved, for the summary
  let stopped = null;

  try {
    for (const { make, model } of models) {
      const key = `${make}|${model}`;
      const { slug, years, error } = await resolveSlug(key);
      if (!slug) {
        missing.push({ make, model, reason: `no model page: ${error}` });
        console.log(`MISSING ${key}: ${error}`);
        continue;
      }
      claim[key] = slug;
      for (const year of years.filter((y) => y >= YEAR_MIN && y <= YEAR_MAX)) {
        const tag = `${slug}/${year}`;
        if (done.has(tag) && (SHARED[slug] || SLUGS[key].length > 1 || slug === 'mg/zs')) continue;
        done.add(tag);
        const path = `/${slug}/price/${year}`;
        const url = BASE + path;
        const { status, html, location } = await get(path);
        if (status === 404) continue; // the brief says to skip these
        if (status !== 200) {
          missing.push({ make, model, slug, year, reason: `HTTP ${status}${location ? ` -> ${location}` : ''}`, url });
          continue;
        }
        const { rows: parsed, bad } = parseYearPage(html);
        if (!parsed.length) {
          missing.push({ make, model, slug, year, reason: 'page has no parsable rows', url });
        }
        for (const b of bad) {
          missing.push({ make, model, slug, year, reason: 'row without a price range', row: b, url });
        }
        for (const r of parsed) {
          const name = SHARED[slug] ? SHARED[slug](r) : model;
          rows.push({ make, model: name, slug, year, ...r, url });
        }
      }
      console.log(`${key} -> ${slug}: ${rows.length} rows so far`);
      save(rows, missing);
    }
  } catch (e) {
    if (!(e instanceof Blocked)) throw e;
    stopped = e.message;
    missing.push({ reason: `STOPPED: ${e.message}` });
    console.log(`BLOCKED: ${e.message}`);
  }
  save(rows, missing);
  console.log(JSON.stringify({ stopped, rows: rows.length, missing: missing.length, slugs: claim }, null, 1));
}

mkdirSync(CACHE, { recursive: true });
if (process.argv[2] === 'run') {
  await run();
} else {
  const { html } = await get('/toyota/corolla/price/2018');
  const { rows, bad } = parseYearPage(html);
  const by = {};
  for (const r of rows) by[r.body] = (by[r.body] ?? 0) + 1;
  console.log(by, 'bad', bad.length);
  console.log(rows[0]);
  console.log(rows.at(-1));
}
