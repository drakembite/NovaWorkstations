// Stub CSS imports for tsx execution
require.extensions['.css'] = () => {};

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import React from 'react';
(global as any).React = React;
import { initialProducts } from '../src/lib/seed-data';
import { getJsonLdBlocks, withSiteUrl } from './seo-test-utils';

// ---------------------------------------------------------------------------
// Small HTML helpers (the pages are rendered to static markup and inspected as a crawler would)
// ---------------------------------------------------------------------------
interface Anchor {
  href: string | null;
  target: string | null;
  rel: string | null;
  text: string;
}

function parseAnchors(html: string): Anchor[] {
  const anchors: Anchor[] = [];
  const re = /<a\s([^>]*)>([\s\S]*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const attrs = m[1];
    const get = (name: string) => {
      const am = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs);
      return am ? am[1].replace(/&amp;/g, '&') : null;
    };
    anchors.push({
      href: get('href'),
      target: get('target'),
      rel: get('rel'),
      text: m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
    });
  }
  return anchors;
}

const NO_LINK_TEXT = 'Enlace de compra no disponible por el momento';

async function run() {
  console.log('🧪 Starting Outbound Buy Link Tests...');

  // The db module resolves its data directory from the cwd at import time: use a throwaway one.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-outbound-'));
  const originalCwd = process.cwd();
  fs.mkdirSync(path.join(tmp, 'data'));
  // Legacy-shaped file (no outbound_clicks collection yet): must be tolerated.
  fs.writeFileSync(
    path.join(tmp, 'data', 'db.json'),
    JSON.stringify({ products: initialProducts, promotions: [], orders: [], store_settings: undefined }, null, 2)
  );
  process.chdir(tmp);

  try {
    const { renderToStaticMarkup } = await import('react-dom/server');
    const db = await import('../src/lib/db');
    const products = await db.getProducts();
    assert.strictEqual(products.length, 12);
    const linked = products.filter((p) => p.buy_url);
    assert.strictEqual(linked.length, 12, 'every product has a link');
    assert.ok(products.every((p) => p.stock_quantity > 0 && p.buy_url), 'every product that shows stock has a buy link');

    const ProductDetailPage = (await import('../src/app/productos/[slug]/page')).default;
    const { ProductCard } = await import('../src/components/ProductCard');
    const { BuyLink } = await import('../src/components/BuyLink');

    // -------------------------------------------------------------------
    // 1. Product page
    // -------------------------------------------------------------------
    console.log('\n--- Test 1: product page outbound button and disclosure ---');
    for (const product of products) {
      const tree = await ProductDetailPage({ params: Promise.resolve({ slug: product.slug }) });
      const html = renderToStaticMarkup(tree as React.ReactElement);
      const anchors = parseAnchors(html);
      const buyAnchors = anchors.filter((a) => a.rel === 'nofollow noopener noreferrer');

      assert.ok(!html.includes('Agregar al Carrito'), `${product.sku}: no add-to-cart on the page`);
      assert.ok(!/Factura o Boleta/i.test(html) && !/\bRUC\b/.test(html), `${product.sku}: false invoice/RUC claim removed`);
      assert.ok(/tienda de demostraci[oó]n/i.test(html), `${product.sku}: demo disclosure present`);
      assert.ok(/no vende/i.test(html) && /cobra/i.test(html), `${product.sku}: disclosure says nothing is sold or charged`);
      assert.ok(/tienda independiente/i.test(html), `${product.sku}: disclosure says the button leads to an independent store`);

      if (product.buy_url) {
        assert.strictEqual(buyAnchors.length, 1, `${product.sku}: exactly one buy button`);
        const a = buyAnchors[0];
        assert.strictEqual(a.text, 'Comprar', `${product.sku}: the visible text is exactly Comprar`);
        assert.strictEqual(a.href, product.buy_url, `${product.sku}: href is the plain visible target, not a redirect`);
        assert.strictEqual(a.target, '_blank');
        assert.deepStrictEqual(
          (a.rel || '').split(/\s+/).sort(),
          ['nofollow', 'noopener', 'noreferrer'],
          `${product.sku}: rel must be exactly nofollow noopener noreferrer`
        );
        assert.ok(!html.includes(NO_LINK_TEXT), `${product.sku}: no "unavailable" text when linked`);
        assert.ok(!anchors.some((a2) => (a2.href || '').includes('/api/outbound')), 'link never points at a redirect endpoint');
      } else {
        assert.strictEqual(buyAnchors.length, 0, `${product.sku}: no buy button without a link`);
        assert.ok(html.includes(NO_LINK_TEXT), `${product.sku}: neutral message shown`);
      }

      // JSON-LD Offer is unchanged: no url / seller change introduced by the buy link.
      const productLd = getJsonLdBlocks(tree).find((b) => b['@type'] === 'Product');
      assert.ok(productLd, 'Product JSON-LD present');
      assert.deepStrictEqual(
        Object.keys(productLd.offers).sort(),
        ['@type', 'availability', 'price', 'priceCurrency', 'seller'],
        `${product.sku}: Offer keys unchanged`
      );
    }
    console.log('✅ Product pages: button for linked products, neutral text otherwise, disclosure everywhere.');

    // -------------------------------------------------------------------
    // 2. Product cards
    // -------------------------------------------------------------------
    console.log('\n--- Test 2: product card outbound button ---');
    for (const product of products) {
      const html = renderToStaticMarkup(ProductCard({ product }));
      const anchors = parseAnchors(html);
      const buyAnchors = anchors.filter((a) => a.rel === 'nofollow noopener noreferrer');
      assert.ok(!html.includes('Agregar al Carrito') && !html.includes('Añadir'), 'no add-to-cart on cards');
      assert.ok(/tienda de demostraci[oó]n/i.test(html), `${product.sku}: card carries the short demo notice`);
      if (product.buy_url) {
        assert.strictEqual(buyAnchors.length, 1);
        assert.strictEqual(buyAnchors[0].href, product.buy_url);
        assert.strictEqual(buyAnchors[0].target, '_blank');
        assert.deepStrictEqual((buyAnchors[0].rel || '').split(/\s+/).sort(), ['nofollow', 'noopener', 'noreferrer']);
        assert.strictEqual(buyAnchors[0].text, 'Comprar');
      } else {
        assert.strictEqual(buyAnchors.length, 0);
        assert.ok(html.includes(NO_LINK_TEXT));
      }
    }
    // Defence in depth: a stored URL that fails validation is never rendered as an href.
    const poisoned = { ...linked[0], buy_url: 'javascript:alert(1)' };
    const poisonedHtml = renderToStaticMarkup(ProductCard({ product: poisoned }));
    assert.ok(!poisonedHtml.includes('javascript:'), 'an invalid stored URL is never rendered');
    assert.ok(poisonedHtml.includes(NO_LINK_TEXT), 'an invalid stored URL falls back to the neutral text');
    console.log('✅ Product cards verified.');

    // -------------------------------------------------------------------
    // 2b. No external store names anywhere in the rendered markup
    // -------------------------------------------------------------------
    console.log('\n--- Test 2b: no store name in the page, card or button markup ---');
    {
      const STORE_NAMES = /falabella|amazon/i;
      // The href must stay a direct, visible link, so the destination's domain is the one place a
      // store can show up. Everything else (text, aria-label, title, alt, notes, JSON-LD) must be clean.
      const stripHrefs = (html: string) => html.replace(/\shref="[^"]*"/g, ' href=""');
      for (const product of products) {
        const tree = await ProductDetailPage({ params: Promise.resolve({ slug: product.slug }) });
        const pageHtml = renderToStaticMarkup(tree as React.ReactElement);
        const cardHtml = renderToStaticMarkup(ProductCard({ product }));
        for (const [where, html] of [['page', pageHtml], ['card', cardHtml]] as const) {
          assert.ok(!STORE_NAMES.test(stripHrefs(html)), `${product.sku}: no store name in the ${where} markup`);
          const buy = parseAnchors(html).filter((a) => a.rel === 'nofollow noopener noreferrer');
          assert.strictEqual(buy.length, 1, `${product.sku}: one buy button on the ${where}`);
          assert.strictEqual(buy[0].text, 'Comprar', `${product.sku}: the ${where} button reads exactly Comprar`);
        }
        const anchorTag = /<a\s[^>]*rel="nofollow noopener noreferrer"[^>]*>/.exec(pageHtml)![0];
        assert.ok(!/\saria-label=|\stitle=/.test(anchorTag), `${product.sku}: the buy link adds no aria-label or title`);
        assert.ok(!/buy_store/.test(pageHtml) && !/buy_store/.test(cardHtml), 'the internal store label never reaches the markup');
      }

      // A product whose link was cleared (an admin data case) keeps the neutral message and no button.
      const target = products.find((p) => p.sku === 'VS-ASUS-H7604')!;
      await db.updateProduct(target.id, { buy_url: null, buy_store: null });
      const clearedTree = await ProductDetailPage({ params: Promise.resolve({ slug: target.slug }) });
      const clearedHtml = renderToStaticMarkup(clearedTree as React.ReactElement);
      assert.ok(clearedHtml.includes(NO_LINK_TEXT), 'cleared link: neutral message on the page');
      assert.strictEqual(parseAnchors(clearedHtml).filter((a) => a.rel === 'nofollow noopener noreferrer').length, 0);
      assert.ok(renderToStaticMarkup(ProductCard({ product: { ...target, buy_url: null, buy_store: null } })).includes(NO_LINK_TEXT));
      await db.updateProduct(target.id, { buy_url: target.buy_url, buy_store: target.buy_store });
      console.log('✅ Buttons read exactly "Comprar"; no store name outside the href; neutral text only for a cleared link.');
    }

    // -------------------------------------------------------------------
    // 3. Click handler: beacon without delaying navigation
    // -------------------------------------------------------------------
    console.log('\n--- Test 3: click handler beacon ---');
    {
      const sku = linked[0].sku;
      // BuyLink keeps a pending flag, so it must be called inside a render to get its real handler.
      let el!: React.ReactElement<any>;
      const Probe = () => {
        el = BuyLink({ sku, href: linked[0].buy_url! }) as React.ReactElement<any>;
        return el;
      };
      renderToStaticMarkup(React.createElement(Probe));
      assert.strictEqual(el.type, 'a', 'BuyLink renders a plain anchor');
      assert.strictEqual(typeof el.props.onClick, 'function');
      const clickEvent = { preventDefault() { throw new Error('click must not be prevented'); } };

      const nav = globalThis as any;
      const originalNavigator = Object.getOwnPropertyDescriptor(nav, 'navigator');
      const originalFetch = nav.fetch;
      try {
        const beacons: Array<{ url: string; data: Blob }> = [];
        Object.defineProperty(nav, 'navigator', {
          configurable: true,
          value: { sendBeacon: (url: string, data: Blob) => (beacons.push({ url, data }), true) },
        });
        nav.fetch = () => {
          throw new Error('fetch must not be used when sendBeacon succeeds');
        };
        el.props.onClick(clickEvent);
        assert.strictEqual(beacons.length, 1);
        assert.strictEqual(beacons[0].url, '/api/outbound-click');
        assert.deepStrictEqual(JSON.parse(await beacons[0].data.text()), { sku }, 'beacon body carries only the sku');

        // sendBeacon refuses -> fetch keepalive fallback
        const fetches: Array<{ url: string; init: any }> = [];
        Object.defineProperty(nav, 'navigator', { configurable: true, value: { sendBeacon: () => false } });
        nav.fetch = (url: string, init: any) => (fetches.push({ url, init }), Promise.resolve(new Response(null, { status: 204 })));
        el.props.onClick(clickEvent);
        assert.strictEqual(fetches.length, 1);
        assert.strictEqual(fetches[0].url, '/api/outbound-click');
        assert.strictEqual(fetches[0].init.keepalive, true);
        assert.strictEqual(fetches[0].init.method, 'POST');
        assert.deepStrictEqual(JSON.parse(fetches[0].init.body), { sku });

        // No beacon support at all -> fetch keepalive
        Object.defineProperty(nav, 'navigator', { configurable: true, value: {} });
        el.props.onClick(clickEvent);
        assert.strictEqual(fetches.length, 2);

        // Tracking failures never break the click.
        nav.fetch = () => Promise.reject(new Error('offline'));
        el.props.onClick(clickEvent);
        Object.defineProperty(nav, 'navigator', {
          configurable: true,
          value: {
            sendBeacon: () => {
              throw new Error('blocked');
            },
          },
        });
        nav.fetch = undefined;
        el.props.onClick(clickEvent);
        await new Promise((r) => setTimeout(r, 10));
      } finally {
        if (originalNavigator) Object.defineProperty(nav, 'navigator', originalNavigator);
        else delete nav.navigator;
        nav.fetch = originalFetch;
      }
      console.log('✅ Beacon sent with sku only; falls back to fetch keepalive; never blocks the click.');
    }

    // -------------------------------------------------------------------
    // 4. Footer statement
    // -------------------------------------------------------------------
    console.log('\n--- Test 4: footer demo statement ---');
    {
      const { Footer } = await import('../src/components/Footer');
      const html = renderToStaticMarkup(React.createElement(Footer));
      assert.ok(/tienda de demostraci[oó]n/i.test(html), 'footer states this is a demonstration store');
      assert.ok(/no vende/i.test(html) && /cobra/i.test(html), 'footer states nothing is sold or charged');
      console.log('✅ Footer statement verified.');
    }

    // -------------------------------------------------------------------
    // 5. POST /api/outbound-click
    // -------------------------------------------------------------------
    console.log('\n--- Test 5: POST /api/outbound-click ---');
    {
      const route = await import('../src/app/api/outbound-click/route');
      assert.deepStrictEqual(Object.keys(route).filter((k) => /^(GET|POST|PUT|PATCH|DELETE)$/.test(k)), ['POST'], 'POST only');
      const post = (body: unknown, headers: Record<string, string> = {}, rawBody?: string) =>
        route.POST(
          new Request('https://shop.test/api/outbound-click', {
            method: 'POST',
            headers: { 'content-type': 'application/json', ...headers },
            body: rawBody ?? JSON.stringify(body),
          })
        );
      const target = linked.find((p) => p.sku === 'VS-ANKER-778')!;
      const before = (await db.getOutboundClicks()).length;
      assert.strictEqual(before, 0, 'legacy file without the collection starts empty');

      // 5.1 valid click with the first-party attribution cookie
      const attribution = {
        utm_source: 'chatgpt.com',
        utm_medium: 'assistant',
        aic_src: 'x',
        referrer: 'https://chatgpt.com/',
        landing_page: 'https://shop.test/productos/x?utm_source=chatgpt.com',
        captured_at: '2026-10-17T10:00:00.000Z',
      };
      const cookie = `other=1; vs_attribution=${encodeURIComponent(JSON.stringify(attribution))}`;
      const res = await post({ sku: target.sku }, { cookie, 'user-agent': 'Secret-UA/1.0', 'x-forwarded-for': '203.0.113.9' });
      assert.strictEqual(res.status, 204);
      assert.strictEqual(await res.text(), '', '204 has no body');
      let clicks = await db.getOutboundClicks();
      assert.strictEqual(clicks.length, 1);
      const rec = clicks[0];
      assert.deepStrictEqual(Object.keys(rec).sort(), ['attribution_data', 'created_at', 'id', 'sku', 'target_url']);
      assert.strictEqual(rec.sku, target.sku);
      assert.strictEqual(rec.target_url, target.buy_url, 'target comes from the database');
      assert.deepStrictEqual(rec.attribution_data, attribution);
      assert.ok(!Number.isNaN(Date.parse(rec.created_at)));
      const serialized = JSON.stringify(rec);
      assert.ok(!serialized.includes('203.0.113.9') && !serialized.includes('Secret-UA'), 'no IP or user agent stored');

      // 5.2 the client can never choose the target
      const evil = await post({ sku: target.sku, url: 'https://evil.example/x', target_url: 'https://evil.example/y', buy_url: 'https://evil.example/z' });
      assert.strictEqual(evil.status, 204);
      clicks = await db.getOutboundClicks();
      assert.strictEqual(clicks.length, 2);
      assert.strictEqual(clicks[1].target_url, target.buy_url, 'client supplied URL is ignored');
      assert.ok(!JSON.stringify(clicks).includes('evil.example'), 'client supplied URL is never stored');

      // 5.3 legacy cookie name, and no cookie at all
      const legacy = await post({ sku: target.sku }, { cookie: `nw_attribution=${encodeURIComponent(JSON.stringify({ utm_source: 'legacy' }))}` });
      assert.strictEqual(legacy.status, 204);
      assert.strictEqual((await db.getOutboundClicks())[2].attribution_data.utm_source, 'legacy', 'nw_attribution fallback is honoured');
      const anon = await post({ sku: target.sku });
      assert.strictEqual(anon.status, 204);
      assert.deepStrictEqual((await db.getOutboundClicks())[3].attribution_data, {}, 'no cookie -> empty attribution');

      // 5.4 attribution is whitelisted and bounded (the cookie is client controlled)
      const hostile = {
        utm_source: 'ok',
        email: 'victim@example.com',
        ip: '198.51.100.7',
        referrer: 'r'.repeat(5000),
        nested: { a: 1 },
        utm_medium: 42,
      };
      const hostileRes = await post({ sku: target.sku }, { cookie: `vs_attribution=${encodeURIComponent(JSON.stringify(hostile))}` });
      assert.strictEqual(hostileRes.status, 204);
      const stored = (await db.getOutboundClicks())[4].attribution_data;
      assert.deepStrictEqual(Object.keys(stored).sort(), ['referrer', 'utm_source']);
      assert.strictEqual(stored.utm_source, 'ok');
      assert.ok(stored.referrer.length <= 500, 'long values are truncated');
      const corrupt = await post({ sku: target.sku }, { cookie: 'vs_attribution=%7Bnot-json' });
      assert.strictEqual(corrupt.status, 204, 'a corrupt cookie is ignored, not an error');
      assert.deepStrictEqual((await db.getOutboundClicks())[5].attribution_data, {});

      // 5.5 rejections store nothing
      const count = (await db.getOutboundClicks()).length;
      assert.strictEqual((await post({ sku: 'VS-DOES-NOT-EXIST' })).status, 400, 'unknown sku -> 400');
      assert.strictEqual((await post({})).status, 400, 'missing sku -> 400');
      assert.strictEqual((await post({ sku: 123 })).status, 400, 'non-string sku -> 400');
      assert.strictEqual((await post({ sku: ['VS-ANKER-778'] })).status, 400, 'array sku -> 400');
      assert.strictEqual((await post(null, {}, 'not json')).status, 400, 'malformed JSON -> 400');
      assert.strictEqual((await post(null, {}, '[]')).status, 400, 'non-object JSON -> 400');
      const msiProduct = (await db.getProducts()).find((p) => p.sku === 'VS-MSI-Z16P')!;
      await db.updateProduct(msiProduct.id, { buy_url: null, buy_store: null }); // data case: link cleared by an admin
      assert.strictEqual((await post({ sku: 'VS-MSI-Z16P' })).status, 400, 'a product without a buy_url has nothing to attribute -> 400');
      const big = await post({ sku: target.sku, pad: 'p'.repeat(5000) });
      assert.strictEqual(big.status, 413, 'oversized body is refused');
      const declared = await post({ sku: target.sku }, { 'content-length': '999999' });
      assert.strictEqual(declared.status, 413, 'oversized declared length is refused');
      assert.strictEqual((await db.getOutboundClicks()).length, count, 'rejected requests store nothing');

      // 5.6 persisted next to the other collections
      const onDisk = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'db.json'), 'utf8'));
      assert.strictEqual(onDisk.outbound_clicks.length, count);
      console.log('✅ Route validates input, ignores client URLs, stores minimal first-party records.');
    }

    // -------------------------------------------------------------------
    // 6. Site URL fallback
    // -------------------------------------------------------------------
    console.log('\n--- Test 6: getSiteUrl fallback ---');
    {
      const { getSiteUrl, getBaseUrl } = await import('../src/lib/catalog');
      await withSiteUrl(undefined, async () => {
        assert.strictEqual(getSiteUrl(), 'https://planiaula.com', 'unset variable falls back to the deployed domain');
      });
      await withSiteUrl('   ', async () => {
        assert.strictEqual(getSiteUrl(), 'https://planiaula.com', 'blank variable falls back too');
      });
      await withSiteUrl('https://shop.example.test/', async () => {
        assert.strictEqual(getSiteUrl(), 'https://shop.example.test', 'configured value wins, trailing slash trimmed');
      });
      await withSiteUrl(undefined, async () => {
        const bare = { headers: new Headers(), url: '' } as unknown as Request;
        assert.strictEqual(getBaseUrl(bare), 'https://planiaula.com', 'request without host or url uses the same fallback');
      });
      console.log('✅ getSiteUrl falls back to https://planiaula.com.');
    }
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  console.log('\n🎉 ALL OUTBOUND BUY LINK TESTS PASSED SUCCESSFULLY! 🎉\n');
}

run().catch((err) => {
  console.error('❌ Outbound test failed with error:', err);
  process.exit(1);
});
