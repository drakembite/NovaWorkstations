// Reference exchange rate (S/ per US$) for the soles shown next to the USD prices.
//
// Source: BCRP (Banco Central de Reserva del Perú) free statistics API, interbank rate,
// series PD04637PD (Compra) and PD04638PD (Venta). Days without data come as the value "n.d.".
//
// Method (AVERAGE rate, not a quote):
//   1. Keep the days where BOTH series have a number.
//   2. Take the last 5 such days (fewer when the window holds fewer).
//   3. rate = mean of (compra + venta) / 2 over those days, rounded to 3 decimals.
//   4. asOf = the last day used (ISO date YYYY-MM-DD).
//
// getReferenceRate() fetches the last 21 calendar days (timeout 4 s) and keeps the result in memory
// for 6 hours. When a fetch fails it reuses the previous good value only if its asOf is at most
// 10 days old; otherwise it returns null. There is NO hardcoded fallback rate: callers show USD only.
//
// Everything is deterministic and offline-testable: the clock is src/lib/clock.ts and the fetch is
// replaceable through __setRateTestHooks (tests only). NOVA_RATE_OFFLINE=1 disables the default fetch.

import { now } from '@/lib/clock';

export interface ReferenceRate {
  rate: number;
  /** ISO date (YYYY-MM-DD) of the last day used for the average. */
  asOf: string;
  source: 'BCRP';
}

export interface RatePeriod {
  /** ISO date YYYY-MM-DD. */
  date: string;
  /** null when the BCRP has no data for the day ("n.d."). */
  value: number | null;
}

export const SERIES_COMPRA = 'PD04637PD';
export const SERIES_VENTA = 'PD04638PD';

export const RATE_DAYS_USED = 5;
export const RATE_WINDOW_DAYS = 21;
export const RATE_FETCH_TIMEOUT_MS = 4000;
export const RATE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
export const RATE_MAX_STALE_DAYS = 10;
/** After a failed fetch the source is not tried again for this long, so an outage does not slow every render. */
export const RATE_FAILURE_BACKOFF_MS = 5 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;
// Lima is UTC-5 all year (no daylight saving): the BCRP publishes by Lima calendar day.
const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000;

const MONTHS: Record<string, string> = {
  ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
  jul: '07', ago: '08', set: '09', sep: '09', oct: '10', nov: '11', dic: '12',
};

export function buildBcrpUrl(series: string, from: string, to: string): string {
  return `https://estadisticas.bcrp.gob.pe/estadisticas/series/api/${series}/json/${from}/${to}/esp`;
}

/** "02.Nov.26" -> "2026-11-02". Throws on anything that is not that shape. */
function parsePeriodName(name: unknown): string {
  const m = /^(\d{1,2})\.([A-Za-z]{3})\.(\d{2})$/.exec(typeof name === 'string' ? name.trim() : '');
  const month = m ? MONTHS[m[2].toLowerCase()] : undefined;
  if (!m || !month) throw new Error(`BCRP: unreadable period name ${JSON.stringify(name)}`);
  return `20${m[3]}-${month}-${m[1].padStart(2, '0')}`;
}

/**
 * Parses the FIRST balanced JSON object of a text. The BCRP API sometimes appends an HTML (PHP) notice after the
 * JSON, which makes a plain JSON.parse of the whole body fail. Braces inside strings do not count.
 */
export function parseJsonTolerant(text: string): unknown {
  const start = text.indexOf('{');
  if (start === -1) throw new Error('BCRP: response without a JSON object');
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return JSON.parse(text.slice(start, i + 1));
  }
  throw new Error('BCRP: unterminated JSON object');
}

/** Parses one BCRP series response into dated values ("n.d." and non-numeric values become null). */
export function parseBcrpSeries(json: unknown): RatePeriod[] {
  const periods = (json as { periods?: unknown } | null)?.periods;
  if (!Array.isArray(periods)) throw new Error('BCRP: response without periods');
  return periods.map((period) => {
    const raw = (period as { values?: unknown[] } | null)?.values?.[0];
    const value = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
    return {
      date: parsePeriodName((period as { name?: unknown } | null)?.name),
      value: Number.isFinite(value) ? value : null,
    };
  });
}

/** The method described at the top of this file. Returns null when no day has both numbers. */
export function computeReferenceRate(
  compra: RatePeriod[],
  venta: RatePeriod[]
): { rate: number; asOf: string } | null {
  const ventaByDate = new Map<string, number>();
  for (const p of venta) if (p.value !== null) ventaByDate.set(p.date, p.value);

  const shared: Array<{ date: string; mid: number }> = [];
  for (const p of compra) {
    const v = ventaByDate.get(p.date);
    if (p.value !== null && v !== undefined) shared.push({ date: p.date, mid: (p.value + v) / 2 });
  }
  shared.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const used = shared.slice(-RATE_DAYS_USED);
  if (used.length === 0) return null;
  const mean = used.reduce((sum, d) => sum + d.mid, 0) / used.length;
  return { rate: Math.round(mean * 1000) / 1000, asOf: used[used.length - 1].date };
}

/** "S/ 5,536": whole soles, comma thousands, no Intl. */
export function formatSoles(usd: number, rate: number): string {
  const whole = String(Math.round(usd * rate));
  return `S/ ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

/** "2026-11-12" -> "12/11/2026". */
export function formatRateDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ---------------------------------------------------------------------------
// Fetching and cache
// ---------------------------------------------------------------------------

export type RateFetcher = (
  url: string,
  init: { signal: AbortSignal; cache?: 'no-store' }
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

let testFetch: RateFetcher | null = null;
let testTimeoutMs: number | null = null;
let cached: { value: ReferenceRate; fetchedAt: number } | null = null;
let failedAt: number | null = null;
let lastGood: ReferenceRate | null = null;
let inFlight: Promise<ReferenceRate | null> | null = null;

/** Tests only: replace the fetch (and optionally the timeout). */
export function __setRateTestHooks(hooks: { fetch?: RateFetcher; timeoutMs?: number }): void {
  if (hooks.fetch) testFetch = hooks.fetch;
  if (hooks.timeoutMs !== undefined) testTimeoutMs = hooks.timeoutMs;
}

/** Tests only: forget the hooks, the cache and the last good value. */
export function __resetRateTestState(): void {
  testFetch = null;
  testTimeoutMs = null;
  cached = null;
  failedAt = null;
  lastGood = null;
  inFlight = null;
}

function limaDate(ms: number): string {
  return new Date(ms - LIMA_OFFSET_MS).toISOString().slice(0, 10);
}

function resolveFetcher(): RateFetcher | null {
  if (testFetch) return testFetch;
  if (process.env.NOVA_RATE_OFFLINE === '1') return null;
  return async (url, init) => {
    const res = await fetch(url, init);
    return { ok: res.ok, status: res.status, json: async () => parseJsonTolerant(await res.text()) };
  };
}

async function fetchSeries(fetcher: RateFetcher, series: string, from: string, to: string, signal: AbortSignal) {
  const res = await fetcher(buildBcrpUrl(series, from, to), { signal, cache: 'no-store' });
  if (!res.ok) throw new Error(`BCRP: HTTP ${res.status}`);
  return parseBcrpSeries(await res.json());
}

async function fetchFresh(nowMs: number): Promise<ReferenceRate | null> {
  const fetcher = resolveFetcher();
  if (!fetcher) return null;

  const to = limaDate(nowMs);
  const from = limaDate(nowMs - RATE_WINDOW_DAYS * DAY_MS);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Races the timeout so a fetcher that ignores the abort signal cannot hold the page.
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('BCRP: timeout'));
    }, testTimeoutMs ?? RATE_FETCH_TIMEOUT_MS);
  });

  try {
    const [compra, venta] = await Promise.race([
      Promise.all([
        fetchSeries(fetcher, SERIES_COMPRA, from, to, controller.signal),
        fetchSeries(fetcher, SERIES_VENTA, from, to, controller.signal),
      ]),
      timeout,
    ]);
    const computed = computeReferenceRate(compra, venta);
    return computed ? { ...computed, source: 'BCRP' } : null;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function ageInDays(asOf: string, nowMs: number): number {
  return Math.round((Date.parse(limaDate(nowMs)) - Date.parse(asOf)) / DAY_MS);
}

async function refresh(nowMs: number): Promise<ReferenceRate | null> {
  const fresh = await fetchFresh(nowMs);
  if (fresh) {
    cached = { value: fresh, fetchedAt: nowMs };
    lastGood = fresh;
    failedAt = null;
    return fresh;
  }
  failedAt = nowMs;
  return reusableLastGood(nowMs);
}

/** The previous good value, only while its data is recent; otherwise null (never a hardcoded rate). */
function reusableLastGood(nowMs: number): ReferenceRate | null {
  return lastGood && ageInDays(lastGood.asOf, nowMs) <= RATE_MAX_STALE_DAYS ? lastGood : null;
}

/** The reference rate, or null when none can be trusted (callers then show USD only). */
export async function getReferenceRate(): Promise<ReferenceRate | null> {
  const nowMs = now().getTime();
  if (cached && nowMs - cached.fetchedAt < RATE_CACHE_TTL_MS) return cached.value;
  if (failedAt !== null && nowMs - failedAt < RATE_FAILURE_BACKOFF_MS) return reusableLastGood(nowMs);
  if (!inFlight) {
    inFlight = refresh(nowMs).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}
