// Stub CSS imports for tsx execution
require.extensions['.css'] = () => {};

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import React from 'react';
(global as any).React = React;
import { initialProducts, initialPromotions } from '../src/lib/seed-data';
import { extractVisible } from './visible-html';
import { getJsonLdBlocks } from './seo-test-utils';

// ---------------------------------------------------------------------------
// Real BCRP sample (read-only GET on 2026-11-16, window 2026-11-01 to 2026-11-16), series PD04637PD (Compra)
// and PD04638PD (Venta). 13.Nov.26 and 16.Nov.26 are "n.d.". Kept verbatim: the tests never touch the network.
// ---------------------------------------------------------------------------
const NOV_COMPRA = `{
"config":
{
"title":"Tipo de cambio",
"series":
[
{
"name":"Tipo de cambio - TC Interbancario (S/ por US$) - Compra",
"dec":"3"
}]
},
"periods":
[
{ "name":"02.Nov.26", "values":["3.45885714285714"] },
{ "name":"03.Nov.26", "values":["3.46185714285714"] },
{ "name":"04.Nov.26", "values":["3.44528571428571"] },
{ "name":"05.Nov.26", "values":["3.44685714285714"] },
{ "name":"06.Nov.26", "values":["3.42728571428571"] },
{ "name":"09.Nov.26", "values":["3.41028571428571"] },
{ "name":"10.Nov.26", "values":["3.41371428571429"] },
{ "name":"11.Nov.26", "values":["3.40914285714286"] },
{ "name":"12.Nov.26", "values":["3.40385714285714"] },
{ "name":"13.Nov.26", "values":["n.d."] },
{ "name":"16.Nov.26", "values":["n.d."] }
]
}`;
const NOV_VENTA = `{
"config":
{
"title":"Tipo de cambio",
"series":
[
{
"name":"Tipo de cambio - TC Interbancario (S/ por US$) - Venta",
"dec":"3"
}]
},
"periods":
[
{ "name":"02.Nov.26", "values":["3.46057142857143"] },
{ "name":"03.Nov.26", "values":["3.46342857142857"] },
{ "name":"04.Nov.26", "values":["3.44714285714286"] },
{ "name":"05.Nov.26", "values":["3.44871428571429"] },
{ "name":"06.Nov.26", "values":["3.42857142857143"] },
{ "name":"09.Nov.26", "values":["3.41214285714286"] },
{ "name":"10.Nov.26", "values":["3.41621428571429"] },
{ "name":"11.Nov.26", "values":["3.41085714285714"] },
{ "name":"12.Nov.26", "values":["3.40585714285714"] },
{ "name":"13.Nov.26", "values":["n.d."] },
{ "name":"16.Nov.26", "values":["n.d."] }
]
}`;

// Hand calculation over the last 5 days where both series have a number (06, 09, 10, 11 and 12 Nov):
//   mid(06) = (3.42728571428571 + 3.42857142857143) / 2
//   mid(09) = (3.41028571428571 + 3.41214285714286) / 2
//   mid(10) = (3.41371428571429 + 3.41621428571429) / 2
//   mid(11) = (3.40914285714286 + 3.41085714285714) / 2
//   mid(12) = (3.40385714285714 + 3.40585714285714) / 2
//   mean of the five mids = 3.41379285714286 -> 3.414
const HAND_MIDS = [
  (3.42728571428571 + 3.42857142857143) / 2,
  (3.41028571428571 + 3.41214285714286) / 2,
  (3.41371428571429 + 3.41621428571429) / 2,
  (3.40914285714286 + 3.41085714285714) / 2,
  (3.40385714285714 + 3.40585714285714) / 2,
];
const HAND_MEAN = HAND_MIDS.reduce((a, b) => a + b, 0) / HAND_MIDS.length;
const HAND_RATE = 3.414;

function series(rows: Array<[string, string]>): string {
  return JSON.stringify({ config: {}, periods: rows.map(([name, v]) => ({ name, values: [v] })) });
}

async function run() {
  console.log('🧪 Starting Exchange Rate (BCRP) and Reference Price Tests...');

  const lib = await import('../src/lib/exchange-rate');
  const copy = await import('../src/lib/store-copy');
  const clock = await import('../src/lib/clock');

  // ---------------------------------------------------------------------
  // 1. Parser
  // ---------------------------------------------------------------------
  console.log('\n--- Test 1: BCRP parser ---');
  {
    const compra = lib.parseBcrpSeries(JSON.parse(NOV_COMPRA));
    assert.strictEqual(compra.length, 11);
    assert.deepStrictEqual(compra[0], { date: '2026-11-02', value: 3.45885714285714 });
    assert.deepStrictEqual(compra[8], { date: '2026-11-12', value: 3.40385714285714 });
    assert.deepStrictEqual(compra[9], { date: '2026-11-13', value: null }, '"n.d." is a day without data');
    assert.deepStrictEqual(compra[10], { date: '2026-11-16', value: null });

    // Spanish month abbreviations, both Set and Sep for September.
    const months: Array<[string, string]> = [
      ['15.Ene.26', '2026-01-15'], ['15.Feb.26', '2026-02-15'], ['15.Mar.26', '2026-03-15'],
      ['15.Abr.26', '2026-04-15'], ['15.May.26', '2026-05-15'], ['15.Jun.26', '2026-06-15'],
      ['15.Jul.26', '2026-07-15'], ['15.Ago.26', '2026-08-15'], ['15.Set.26', '2026-09-15'],
      ['15.Sep.26', '2026-09-15'], ['15.Oct.26', '2026-10-15'], ['15.Nov.26', '2026-11-15'],
      ['15.Dic.26', '2026-12-15'], ['01.dic.27', '2027-12-01'],
    ];
    for (const [name, iso] of months) {
      const parsed = lib.parseBcrpSeries(JSON.parse(series([[name, '3.5']])));
      assert.deepStrictEqual(parsed, [{ date: iso, value: 3.5 }], `${name} -> ${iso}`);
    }

    // Malformed shapes are rejected (the caller treats them as a failed fetch).
    for (const bad of [null, 'x', {}, { periods: 'x' }, { periods: [{ name: 'bad', values: ['3.4'] }] }, { periods: [{ name: '02.Xyz.26', values: ['3.4'] }] }]) {
      assert.throws(() => lib.parseBcrpSeries(bad), `rejects ${JSON.stringify(bad)}`);
    }
    // A non-numeric value that is not "n.d." is treated as no data, never as a number.
    assert.deepStrictEqual(lib.parseBcrpSeries(JSON.parse(series([['02.Nov.26', 'abc']]))), [{ date: '2026-11-02', value: null }]);
    console.log('✅ Real fixture parsed; "n.d." skipped as null; Set and Sep both parse; malformed input rejected.');
  }

  // ---------------------------------------------------------------------
  // 2. Averaging
  // ---------------------------------------------------------------------
  console.log('\n--- Test 2: average of the last 5 days with both series ---');
  {
    const compra = lib.parseBcrpSeries(JSON.parse(NOV_COMPRA));
    const venta = lib.parseBcrpSeries(JSON.parse(NOV_VENTA));
    const result = lib.computeReferenceRate(compra, venta);
    assert.ok(result, 'a rate is computed from the real fixture');
    assert.strictEqual(result!.asOf, '2026-11-12', 'asOf is the last day used, not the last day of the window');
    assert.strictEqual(result!.rate, HAND_RATE, `computed ${result!.rate}, hand calculation ${HAND_RATE}`);
    assert.strictEqual(Math.round(HAND_MEAN * 1000) / 1000, HAND_RATE, 'the hand calculation itself rounds to 3.414');
    console.log(`   computed from fixture: ${result!.rate} (asOf ${result!.asOf}); hand calculation: ${HAND_MEAN} -> ${HAND_RATE}`);

    // A day with a number in only one series is skipped (compra 12 Nov removed: 12 Nov is no longer usable).
    const compraNo12 = compra.map((p) => (p.date === '2026-11-12' ? { ...p, value: null } : p));
    const r2 = lib.computeReferenceRate(compraNo12, venta)!;
    const mids2 = ['2026-11-05', '2026-11-06', '2026-11-09', '2026-11-10', '2026-11-11'].map((d) => {
      const c = compra.find((p) => p.date === d)!.value!;
      const v = venta.find((p) => p.date === d)!.value!;
      return (c + v) / 2;
    });
    assert.strictEqual(r2.asOf, '2026-11-11');
    assert.strictEqual(r2.rate, Math.round((mids2.reduce((a, b) => a + b, 0) / 5) * 1000) / 1000);

    // Days present in only one series (different periods) are skipped as well.
    const ventaShifted = venta.filter((p) => p.date !== '2026-11-12');
    assert.strictEqual(lib.computeReferenceRate(compra, ventaShifted)!.asOf, '2026-11-11');

    // Only the last 5 usable days count: older days never change the result.
    const r3 = lib.computeReferenceRate(compra.slice(4), venta.slice(4))!;
    assert.deepStrictEqual(r3, result, 'dropping the days before the last 5 usable ones changes nothing');

    // Unordered input is sorted by date.
    const shuffled = [...compra].reverse();
    assert.deepStrictEqual(lib.computeReferenceRate(shuffled, [...venta].reverse()), result);

    // Fewer than 5 usable days: the days that exist are used; no usable day: null.
    const two = lib.computeReferenceRate(compra.slice(7, 9), venta.slice(7, 9))!;
    assert.strictEqual(two.asOf, '2026-11-12');
    assert.strictEqual(two.rate, Math.round((((3.40914285714286 + 3.41085714285714) / 2 + (3.40385714285714 + 3.40585714285714) / 2) / 2) * 1000) / 1000);
    assert.strictEqual(lib.computeReferenceRate(compra.slice(9), venta.slice(9)), null);
    assert.strictEqual(lib.computeReferenceRate([], []), null);

    // September, with both spellings across a month boundary.
    const sepC = lib.parseBcrpSeries(JSON.parse(series([['29.Set.26', '3.40'], ['30.Sep.26', '3.42'], ['01.Oct.26', '3.44']])));
    const sepV = lib.parseBcrpSeries(JSON.parse(series([['29.Sep.26', '3.42'], ['30.Set.26', '3.44'], ['01.Oct.26', '3.46']])));
    const sep = lib.computeReferenceRate(sepC, sepV)!;
    assert.strictEqual(sep.asOf, '2026-10-01');
    assert.strictEqual(sep.rate, 3.43, '(3.41 + 3.43 + 3.45) / 3');
    console.log('✅ Mean of (compra + venta) / 2 over the last 5 shared days, rounded to 3 decimals, asOf = last day used.');
  }

  // ---------------------------------------------------------------------
  // 3. Formatters and copy
  // ---------------------------------------------------------------------
  console.log('\n--- Test 3: formatSoles and copy ---');
  {
    assert.strictEqual(lib.formatSoles(1620, 3.417), 'S/ 5,536');
    assert.strictEqual(lib.formatSoles(0, 3.414), 'S/ 0');
    assert.strictEqual(lib.formatSoles(100, 3.414), 'S/ 341');
    assert.strictEqual(lib.formatSoles(100, 3.416), 'S/ 342', 'rounds to whole soles');
    assert.strictEqual(lib.formatSoles(292.8, 3.414), 'S/ 1,000');
    assert.strictEqual(lib.formatSoles(12345.678, 3.4), 'S/ 41,975');
    assert.strictEqual(lib.formatSoles(1000000, 3.5), 'S/ 3,500,000');
    assert.strictEqual(lib.formatRateDate('2026-11-12'), '12/11/2026');
    assert.strictEqual(lib.formatRateDate('2026-01-05'), '05/01/2026');
    assert.strictEqual(
      copy.exchangeRateNote({ rate: 3.417, asOf: '2026-11-12' }),
      'Tipo de cambio promedio S/ 3.417 por US$ (BCRP, al 12/11/2026). Referencial.'
    );
    assert.strictEqual(
      copy.exchangeRateNote({ rate: 3.4, asOf: '2026-11-12' }),
      'Tipo de cambio promedio S/ 3.400 por US$ (BCRP, al 12/11/2026). Referencial.',
      'always 3 decimals'
    );
    assert.strictEqual(
      copy.REFERENCE_PRICE_NOTICE,
      'Precio de referencia de NovaWorkstations, no es una oferta: confirma el precio final y la disponibilidad en la tienda de destino.'
    );
    assert.strictEqual(
      lib.buildBcrpUrl('PD04637PD', '2026-10-26', '2026-11-16'),
      'https://estadisticas.bcrp.gob.pe/estadisticas/series/api/PD04637PD/json/2026-10-26/2026-11-16/esp'
    );
    assert.deepStrictEqual(
      [lib.RATE_CACHE_TTL_MS, lib.RATE_FETCH_TIMEOUT_MS, lib.RATE_WINDOW_DAYS, lib.RATE_MAX_STALE_DAYS, lib.RATE_DAYS_USED],
      [6 * 60 * 60 * 1000, 4000, 21, 10, 5]
    );
    console.log('✅ formatSoles (no Intl), dd/mm/yyyy date, rate note, reference notice, URLs and constants.');
  }

  // ---------------------------------------------------------------------
  // 4. getReferenceRate: fetch window, cache, failure behaviour (injected fetch, injected clock)
  // ---------------------------------------------------------------------
  console.log('\n--- Test 3b: tolerant JSON (BCRP sometimes appends an HTML notice after the JSON) ---');
  {
    const body = '{"config":{"title":"Tipo de cambio"},"periods":[{"name":"02.Nov.26","values":["3.45"]}]}';
    assert.deepStrictEqual(lib.parseJsonTolerant(body), JSON.parse(body), 'plain JSON still parses');
    assert.deepStrictEqual(
      lib.parseJsonTolerant(body + '\n<br />\n<b>Notice</b>: Undefined variable { in <b>/x.php</b> on line <b>9</b><br />'),
      JSON.parse(body),
      'a trailing HTML notice (even one that contains braces) is ignored'
    );
    assert.deepStrictEqual(lib.parseJsonTolerant('{"a":"} not a brace","b":1}<br/>'), { a: '} not a brace', b: 1 }, 'braces inside strings do not end the object');
    assert.throws(() => lib.parseJsonTolerant('<html>no json here</html>'), 'no JSON object -> error');
    assert.throws(() => lib.parseJsonTolerant('{"unterminated": '), 'unterminated object -> error');
    console.log('✅ Tolerant JSON parser verified.');
  }

  console.log('\n--- Test 4: getReferenceRate (cache, failures, staleness, timeout) ---');
  {
    const T0 = Date.parse('2026-11-16T15:00:00Z');
    let nowMs = T0;
    clock.setClock(() => new Date(nowMs));
    const urls: string[] = [];
    let mode: 'ok' | 'reject' | 'http500' | 'badjson' | 'nodata' | 'hang' = 'ok';
    const respond = (body: unknown, ok = true, status = 200) => ({ ok, status, json: async () => body });
    const fetcher = async (url: string) => {
      urls.push(url);
      if (mode === 'reject') throw new Error('network down');
      if (mode === 'hang') return new Promise<never>(() => {});
      if (mode === 'http500') return respond({}, false, 500);
      if (mode === 'badjson') return respond('not an object');
      const isCompra = url.includes('/PD04637PD/');
      if (mode === 'nodata') return respond(JSON.parse(series([['13.Nov.26', 'n.d.']])));
      return respond(JSON.parse(isCompra ? NOV_COMPRA : NOV_VENTA));
    };
    const reset = () => {
      lib.__resetRateTestState();
      lib.__setRateTestHooks({ fetch: fetcher });
      urls.length = 0;
      nowMs = T0;
      mode = 'ok';
    };

    // 4.1 success: window of the last 21 days, both series, source BCRP
    reset();
    assert.deepStrictEqual(await lib.getReferenceRate(), { rate: 3.414, asOf: '2026-11-12', source: 'BCRP' });
    assert.strictEqual(urls.length, 2, 'one request per series');
    assert.ok(urls.includes('https://estadisticas.bcrp.gob.pe/estadisticas/series/api/PD04637PD/json/2026-10-26/2026-11-16/esp'), urls.join('\n'));
    assert.ok(urls.includes('https://estadisticas.bcrp.gob.pe/estadisticas/series/api/PD04638PD/json/2026-10-26/2026-11-16/esp'), urls.join('\n'));

    // 4.2 cache: 6 hours
    nowMs = T0 + lib.RATE_CACHE_TTL_MS - 1;
    await lib.getReferenceRate();
    assert.strictEqual(urls.length, 2, 'served from the cache inside the 6 hour TTL');
    nowMs = T0 + lib.RATE_CACHE_TTL_MS;
    await lib.getReferenceRate();
    assert.strictEqual(urls.length, 4, 'refetched once the TTL is over');

    // 4.3 concurrent callers share one fetch
    reset();
    const [a, b] = await Promise.all([lib.getReferenceRate(), lib.getReferenceRate()]);
    assert.deepStrictEqual(a, b);
    assert.strictEqual(urls.length, 2, 'two simultaneous renders trigger one fetch');

    // 4.4 failure with no cache -> null (never a hardcoded rate), for every kind of failure
    for (const failure of ['reject', 'http500', 'badjson', 'nodata'] as const) {
      reset();
      mode = failure;
      assert.strictEqual(await lib.getReferenceRate(), null, `${failure} without a previous value -> null`);
    }

    // 4.5 failure after a good value: reuse it while its asOf is at most 10 days old
    reset();
    await lib.getReferenceRate();
    mode = 'reject';
    nowMs = T0 + 7 * 60 * 60 * 1000;
    assert.deepStrictEqual(await lib.getReferenceRate(), { rate: 3.414, asOf: '2026-11-12', source: 'BCRP' }, 'TTL over, fetch fails, asOf is 4 days old -> previous value');
    nowMs = Date.parse('2026-11-22T15:00:00Z'); // asOf + 10 days exactly
    assert.deepStrictEqual(await lib.getReferenceRate(), { rate: 3.414, asOf: '2026-11-12', source: 'BCRP' }, '10 days old is still accepted');
    nowMs = Date.parse('2026-11-23T15:00:00Z'); // asOf + 11 days
    assert.strictEqual(await lib.getReferenceRate(), null, '11 days old is stale -> null');
    // The failure of one render does not poison the next one: when the source is back (and the backoff is over), the rate is back.
    mode = 'ok';
    nowMs += 6 * 60 * 1000;
    assert.strictEqual((await lib.getReferenceRate())?.rate, 3.414);

    // 4.5b failure backoff: after a failed fetch, renders within 5 minutes do not retry (a source that is down must not slow every page)
    reset();
    mode = 'reject';
    nowMs = T0;
    assert.strictEqual(await lib.getReferenceRate(), null);
    const afterFirstFailure = urls.length;
    nowMs = T0 + 4 * 60 * 1000;
    assert.strictEqual(await lib.getReferenceRate(), null);
    assert.strictEqual(urls.length, afterFirstFailure, 'no new fetch within the 5 minute backoff');
    mode = 'ok';
    nowMs = T0 + 6 * 60 * 1000;
    assert.strictEqual((await lib.getReferenceRate())?.rate, 3.414, 'after the backoff the source is tried again and recovers');

    // 4.6 timeout: a fetch that never answers is a failure
    reset();
    mode = 'hang';
    lib.__setRateTestHooks({ fetch: fetcher, timeoutMs: 25 });
    const started = Date.now();
    assert.strictEqual(await lib.getReferenceRate(), null);
    assert.ok(Date.now() - started < 2000, 'the timeout gives up quickly');

    // 4.7 the signal handed to the fetcher is aborted when the timeout fires
    reset();
    let signalAborted = false;
    lib.__setRateTestHooks({
      timeoutMs: 25,
      fetch: ((url: string, init?: { signal?: AbortSignal }) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener('abort', () => {
            signalAborted = true;
            reject(new Error('aborted'));
          });
        })) as any,
    });
    assert.strictEqual(await lib.getReferenceRate(), null);
    assert.ok(signalAborted, 'the request is aborted, not left running');

    // 4.8 offline guard: NOVA_RATE_OFFLINE=1 and no injected fetch -> null without touching the network
    lib.__resetRateTestState();
    const realFetch = globalThis.fetch;
    let networkTouched = false;
    (globalThis as any).fetch = async () => {
      networkTouched = true;
      throw new Error('network must not be used');
    };
    const env = process.env as Record<string, string | undefined>;
    const previous = env.NOVA_RATE_OFFLINE;
    env.NOVA_RATE_OFFLINE = '1';
    try {
      assert.strictEqual(await lib.getReferenceRate(), null);
      assert.strictEqual(networkTouched, false);
    } finally {
      if (previous === undefined) delete env.NOVA_RATE_OFFLINE;
      else env.NOVA_RATE_OFFLINE = previous;
      globalThis.fetch = realFetch;
    }

    lib.__resetRateTestState();
    clock.resetClock();
    console.log('✅ Window, two series, 6 h cache, shared in-flight fetch, null on failure, 10-day staleness limit, 4 s timeout, offline guard.');
  }

  // ---------------------------------------------------------------------
  // 5. Pages and cards
  // ---------------------------------------------------------------------
  console.log('\n--- Test 5: soles, reference notice, no stock, no offers in storefront pages ---');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-exchange-rate-'));
  const originalCwd = process.cwd();
  fs.mkdirSync(path.join(tmp, 'data'));
  const fixedCoupon = {
    id: 'b0000000-0000-4000-8000-000000000099',
    code: 'FIJO50',
    name: 'Cupón fijo de prueba',
    description: 'US$ 50 de descuento con el código FIJO50.',
    discount_type: 'fixed',
    discount_value: 50,
    min_purchase_amount: 300,
    applies_to_category: null,
    starts_at: '2026-10-01T00:00:00Z',
    ends_at: '2026-12-31T23:59:59Z',
    is_active: true,
    created_at: '2026-10-16T12:00:00.000Z',
  };
  fs.writeFileSync(
    path.join(tmp, 'data', 'db.json'),
    JSON.stringify(
      { products: initialProducts, promotions: [...initialPromotions, fixedCoupon], orders: [], store_settings: undefined },
      null,
      2
    )
  );
  process.chdir(tmp);

  try {
    const { renderToStaticMarkup } = await import('react-dom/server');
    const db = await import('../src/lib/db');
    const Home = (await import('../src/app/page')).default;
    const CategoryPage = (await import('../src/app/categoria/[slug]/page')).default;
    const ProductPage = (await import('../src/app/productos/[slug]/page')).default;
    const Promociones = (await import('../src/app/promociones/page')).default;
    const { ProductCard } = await import('../src/components/ProductCard');
    const render = async (element: unknown) => renderToStaticMarkup((await element) as React.ReactElement);

    const products = await db.getProducts();
    const CATEGORIES = ['estaciones-de-trabajo', 'monitores', 'accesorios', 'ofertas', 'liquidacion'];
    const soles = (usd: number, rate = 3.414) => `≈ ${lib.formatSoles(usd, rate)}`;

    const bcrpFetch = async (url: string) => ({
      ok: true,
      status: 200,
      json: async () => JSON.parse(url.includes('/PD04637PD/') ? NOV_COMPRA : NOV_VENTA),
    });
    const withRate = async <T>(on: boolean, fn: () => Promise<T>): Promise<T> => {
      clock.setClock(() => new Date('2026-11-16T15:00:00Z'));
      lib.__resetRateTestState();
      lib.__setRateTestHooks({
        fetch: on
          ? bcrpFetch
          : async () => {
              throw new Error('BCRP unreachable');
            },
      });
      try {
        return await fn();
      } finally {
        lib.__resetRateTestState();
        clock.resetClock();
      }
    };

    const STOCK_CLAIMS: Array<[string, RegExp]> = [
      ['"En stock"', /en\s+stock/i],
      ['"Agotado"', /agotad/i],
      ['"unidades disponibles"', /unidades?\s+disponibles?/i],
      ['a stock count in parentheses', /stock\s*\(\s*\d+\s*\)/i],
    ];
    const assertNoStock = (html: string, label: string) => {
      const text = extractVisible(html).text;
      for (const [name, re] of STOCK_CLAIMS) assert.ok(!re.test(text), `${label}: no ${name}`);
      for (const p of products) {
        assert.ok(!text.includes(`(${p.stock_quantity})`), `${label}: no stock count (${p.stock_quantity})`);
      }
    };
    const assertNoOffers = (tree: unknown, label: string) => {
      const blocks = getJsonLdBlocks(tree);
      for (const block of blocks) {
        const raw = JSON.stringify(block);
        if (block['@type'] === 'Product') {
          assert.ok(!('offers' in block), `${label}: Product JSON-LD has no offers`);
        }
        for (const word of ['"offers"', '"Offer"', 'availability', 'InStock', 'OutOfStock', 'priceValidUntil', '"seller"']) {
          assert.ok(!raw.includes(word), `${label}: JSON-LD has no ${word}`);
        }
      }
    };

    // ---- 5.1 with a rate: soles beside every USD price
    await withRate(true, async () => {
      for (const p of products) {
        const html = await render(ProductPage({ params: Promise.resolve({ slug: p.slug }) }));
        const text = extractVisible(html).text;
        assert.ok(text.includes(`US$ ${p.price.toFixed(2)}`), `${p.sku}: USD price stays`);
        assert.ok(text.includes(`US$ ${p.price.toFixed(2)} ${soles(p.price)}`), `${p.sku}: soles right after the USD price`);
        const hasDiscount = p.compare_at_price != null && p.compare_at_price > p.price;
        if (hasDiscount) {
          assert.ok(text.includes(`US$ ${p.compare_at_price!.toFixed(2)} ${soles(p.compare_at_price!)}`), `${p.sku}: soles beside the previous price`);
          assert.ok(text.includes(soles(p.compare_at_price! - p.price)), `${p.sku}: soles for the savings`);
        } else {
          assert.strictEqual(text.split('≈').length - 1, 1, `${p.sku}: one soles figure when there is no discount`);
        }
        assert.ok(
          text.includes('Tipo de cambio promedio S/ 3.414 por US$ (BCRP, al 12/11/2026). Referencial.'),
          `${p.sku}: exchange rate line with the real rate and date`
        );
        assert.strictEqual(text.split('Tipo de cambio promedio').length - 1, 1, `${p.sku}: the rate line appears once`);
        assert.ok(text.includes(copy.REFERENCE_PRICE_NOTICE), `${p.sku}: reference-price notice`);

        const card = renderToStaticMarkup(ProductCard({ product: p, rate: 3.414 }));
        const cardText = extractVisible(card).text;
        assert.ok(cardText.includes(`US$ ${p.price.toFixed(2)} ${soles(p.price)}`), `${p.sku}: card soles after USD`);
        if (hasDiscount) assert.ok(cardText.includes(`US$ ${p.compare_at_price!.toFixed(2)} ${soles(p.compare_at_price!)}`), `${p.sku}: card soles beside previous price`);
        assert.ok(!cardText.includes('Tipo de cambio'), 'cards do not repeat the rate line');
      }
      assert.strictEqual(lib.formatSoles(1620, 3.417), 'S/ 5,536');

      const home = extractVisible(await render((Home as any)())).text;
      for (const p of products.slice(0, 8)) assert.ok(home.includes(`US$ ${p.price.toFixed(2)} ${soles(p.price)}`), `home: ${p.sku} soles`);

      for (const slug of CATEGORIES) {
        const text = extractVisible(await render((CategoryPage as any)({ params: Promise.resolve({ slug }) }))).text;
        const count = (text.match(/US\$ [\d,.]+/g) || []).length;
        const soleCount = (text.match(/≈ S\/ [\d,]+/g) || []).length;
        assert.strictEqual(soleCount, count, `category ${slug}: every USD price has its soles (${soleCount}/${count})`);
      }

      const promo = extractVisible(await render((Promociones as any)())).text;
      assert.ok(promo.includes(`Mínimo: US$ 300.00 ${soles(300)}`), 'promociones: minimum purchase in soles');
      assert.ok(promo.includes(`US$ 50.00 OFF ${soles(50)}`), 'promociones: fixed discount in soles');
    });

    // ---- 5.2 without a rate: USD only, nothing else
    await withRate(false, async () => {
      const pages: Record<string, string> = {
        home: await render((Home as any)()),
        promociones: await render((Promociones as any)()),
      };
      for (const slug of CATEGORIES) pages[`category ${slug}`] = await render((CategoryPage as any)({ params: Promise.resolve({ slug }) }));
      for (const p of products) {
        pages[`product ${p.sku}`] = await render(ProductPage({ params: Promise.resolve({ slug: p.slug }) }));
        pages[`card ${p.sku}`] = renderToStaticMarkup(ProductCard({ product: p, rate: null }));
        pages[`card-default ${p.sku}`] = renderToStaticMarkup(ProductCard({ product: p }));
      }
      for (const [label, html] of Object.entries(pages)) {
        const text = extractVisible(html).text;
        assert.ok(!text.includes('≈'), `${label}: no approximate soles without a rate`);
        assert.ok(!/S\/\s?\d/.test(text), `${label}: no soles figure without a rate`);
        assert.ok(!/tipo de cambio/i.test(text), `${label}: no exchange rate line without a rate`);
      }
      for (const p of products) {
        const text = extractVisible(pages[`product ${p.sku}`]).text;
        assert.ok(text.includes(`US$ ${p.price.toFixed(2)}`), `${p.sku}: USD price still shown`);
        assert.ok(text.includes(copy.REFERENCE_PRICE_NOTICE), `${p.sku}: the reference notice does not depend on the rate`);
      }
      assert.ok(extractVisible(pages.promociones).text.includes('Mínimo: US$ 300.00'), 'promociones keeps the USD amounts');
    });

    // ---- 5.3 no stock claim and no Offer JSON-LD on any storefront page
    await withRate(true, async () => {
      for (const p of products) {
        const tree = await ProductPage({ params: Promise.resolve({ slug: p.slug }) });
        const html = renderToStaticMarkup(tree as React.ReactElement);
        assertNoStock(html, `product ${p.sku}`);
        assertNoStock(renderToStaticMarkup(ProductCard({ product: p, rate: 3.414 })), `card ${p.sku}`);
        assert.ok(!html.includes('animate-pulse'), `${p.sku}: no availability pulse dot`);

        const ld = getJsonLdBlocks(tree).find((b) => b['@type'] === 'Product');
        assert.ok(ld, `${p.sku}: Product JSON-LD present`);
        assert.deepStrictEqual(
          Object.keys(ld).sort(),
          ['@context', '@type', 'brand', 'description', 'image', 'name', 'sku', ...(p.mpn ? ['mpn'] : []), ...(p.barcode_ean ? ['gtin13'] : [])].sort(),
          `${p.sku}: Product keys without offers`
        );
        assert.strictEqual(ld.name, p.title);
        assert.strictEqual(ld.sku, p.sku);
        assert.strictEqual(ld.brand.name, p.brand);
        assertNoOffers(tree, `product ${p.sku}`);
      }
      const homeTree = await (Home as any)();
      assertNoStock(renderToStaticMarkup(homeTree), 'home');
      assertNoOffers(homeTree, 'home');
      for (const slug of CATEGORIES) {
        const tree = await (CategoryPage as any)({ params: Promise.resolve({ slug }) });
        assertNoStock(renderToStaticMarkup(tree), `category ${slug}`);
        assertNoOffers(tree, `category ${slug}`);
      }
      assertNoStock(await render((Promociones as any)()), 'promociones');

      // A product whose stock is 0 shows nothing stock-related either.
      const soldOut = { ...products[0], stock_quantity: 0 };
      const soldOutHtml = renderToStaticMarkup(ProductCard({ product: soldOut, rate: 3.414 }));
      assertNoStock(soldOutHtml, 'card with stock 0');
      assert.ok(!/agotad/i.test(soldOutHtml));

      // Stored JSON-LD (custom_head_jsonld) is cleaned too: object, @graph, string, invalid string.
      const target = products[1];
      const stored = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'Stored name',
        sku: 'STORED-SKU',
        offers: { '@type': 'Offer', price: 1, priceCurrency: 'USD', availability: 'https://schema.org/InStock', priceValidUntil: '2027-01-01', seller: { '@type': 'Organization', name: 'X' } },
      };
      const variants: Array<[string, unknown, (ld: any) => void]> = [
        ['object', stored, (ld) => assert.strictEqual(ld.name, 'Stored name')],
        ['string', JSON.stringify(stored), (ld) => assert.strictEqual(ld.sku, 'STORED-SKU')],
        ['graph', { '@context': 'https://schema.org', '@graph': [stored, { '@type': 'Organization', name: 'Kept Org' }] }, (ld) => assert.strictEqual(ld['@graph'][1].name, 'Kept Org')],
        ['invalid string', '{not json', (ld) => assert.strictEqual(ld.name, target.title)],
      ];
      for (const [label, value, check] of variants) {
        await db.updateProduct(target.id, { custom_head_jsonld: value as any });
        const tree = await ProductPage({ params: Promise.resolve({ slug: target.slug }) });
        const blocks = getJsonLdBlocks(tree).filter((b) => b['@type'] !== 'BreadcrumbList');
        assert.strictEqual(blocks.length, 1, `custom ${label}: one product block`);
        assertNoOffers(tree, `custom ${label}`);
        check(blocks[0]);
      }
      await db.updateProduct(target.id, { custom_head_jsonld: null });
    });

    console.log('✅ Soles beside every USD price (cards, detail, previous price, savings, home, categories, promociones); USD only without a rate; no stock claim; no Offer JSON-LD.');
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  console.log('\n🎉 ALL EXCHANGE RATE TESTS PASSED SUCCESSFULLY!\n');
}

run().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
