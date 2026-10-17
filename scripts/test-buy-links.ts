// Stub CSS imports for tsx execution
require.extensions['.css'] = () => {};

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import React from 'react';
(global as any).React = React;
import { initialProducts, initialPromotions, initialStoreSettings } from '../src/lib/seed-data';
import { validateBuyUrl, validateBuyStore, BUY_URL_MAX_LENGTH } from '../src/lib/buy-url';

// The six products that have a verified store page today. Adding a link later is a data-only
// change: replace `buy_url: null` / `buy_store: null` in src/lib/seed-data.ts.
const EXPECTED_LINKS: Record<string, { buy_store: string; buy_url: string }> = {
  'VS-DELL-U27': {
    buy_store: 'Falabella Perú',
    buy_url: 'https://www.falabella.com.pe/falabella-pe/product/146298115/Monitor-4K-Dell-UltraSharp-27-U2725QE',
  },
  'VS-ASUS-PA329': {
    buy_store: 'Falabella Perú',
    buy_url:
      'https://www.falabella.com.pe/falabella-pe/product/156636837/monitor-asus-proart-pa329crv-32-ips-4k-uhd-srgb-adobe-rgb-pivot-altavoz-dp-hdmi',
  },
  'VS-HUION-K16': {
    buy_store: 'Falabella Perú',
    buy_url: 'https://www.falabella.com.pe/falabella-pe/product/144813643/HUION-Kamvas-Pro-16-4K-UHD-Tableta-Grafica-con-Pantalla',
  },
  'VS-WACOM-C16': {
    buy_store: 'Amazon',
    buy_url: 'https://www.amazon.com/Wacom-Cintiq-Drawing-Tablet-DTK1660K0A/dp/B07L77GTTY',
  },
  'VS-CALDIGIT-TS4': {
    buy_store: 'Amazon',
    buy_url: 'https://www.amazon.com/dp/B09GK8LBWS',
  },
  'VS-ANKER-778': {
    buy_store: 'Amazon',
    buy_url: 'https://www.amazon.com/Anker-Thunderbolt-Docking-Charging-Ethernet/dp/B0BMXSR2L7',
  },
};

async function run() {
  console.log('🧪 Starting Buy Link (buy_url / buy_store) Tests...');

  // ---------------------------------------------------------------------
  // 1. Validation rules
  // ---------------------------------------------------------------------
  console.log('\n--- Test 1: buy_url / buy_store validation ---');
  {
    const ok = validateBuyUrl('  https://www.amazon.com/dp/B09GK8LBWS  ');
    assert.deepStrictEqual(ok, { ok: true, value: 'https://www.amazon.com/dp/B09GK8LBWS' }, 'valid https URL is trimmed and accepted');
    assert.deepStrictEqual(validateBuyUrl(null), { ok: true, value: null }, 'null clears the link');
    assert.deepStrictEqual(validateBuyUrl(''), { ok: true, value: null }, 'empty string clears the link');
    assert.deepStrictEqual(validateBuyUrl('   '), { ok: true, value: null }, 'blank string clears the link');

    const rejected: Array<[string, unknown]> = [
      ['javascript scheme', 'javascript:alert(1)'],
      ['javascript scheme with mixed case', 'JaVaScRiPt:alert(1)'],
      ['data scheme', 'data:text/html,<script>alert(1)</script>'],
      ['http only', 'http://www.amazon.com/dp/B09GK8LBWS'],
      ['relative path', '/productos/x'],
      ['protocol relative', '//evil.example/x'],
      ['no scheme', 'www.amazon.com/dp/B09GK8LBWS'],
      ['scheme without slashes', 'https:www.amazon.com/dp/B09GK8LBWS'],
      ['ftp scheme', 'ftp://example.com/file'],
      ['embedded credentials', 'https://user:secret@www.amazon.com/dp/B09GK8LBWS'],
      ['inner whitespace', 'https://www.amazon.com/dp/B09 GK8LBWS'],
      ['control character', 'https://www.amazon.com/dp/B09\u0000GK8LBWS'],
      ['empty host', 'https:///path'],
      ['not a string', 12345],
      ['object', { href: 'https://example.com' }],
    ];
    for (const [label, value] of rejected) {
      const res = validateBuyUrl(value);
      assert.strictEqual(res.ok, false, `buy_url must reject: ${label}`);
    }

    const prefix = 'https://example.com/';
    const atLimit = prefix + 'a'.repeat(BUY_URL_MAX_LENGTH - prefix.length);
    assert.strictEqual(atLimit.length, BUY_URL_MAX_LENGTH);
    assert.strictEqual(validateBuyUrl(atLimit).ok, true, 'a URL of exactly 2000 chars is accepted');
    assert.strictEqual(validateBuyUrl(atLimit + 'a').ok, false, 'a URL over 2000 chars is rejected');

    assert.deepStrictEqual(validateBuyStore(' Amazon '), { ok: true, value: 'Amazon' });
    assert.deepStrictEqual(validateBuyStore(null), { ok: true, value: null });
    assert.deepStrictEqual(validateBuyStore('  '), { ok: true, value: null });
    assert.strictEqual(validateBuyStore('x'.repeat(121)).ok, false, 'store name over 120 chars is rejected');
    assert.strictEqual(validateBuyStore(42).ok, false, 'store name must be a string');
    console.log('✅ Validation accepts absolute https URLs only and caps lengths.');
  }

  // ---------------------------------------------------------------------
  // 2. Seed data
  // ---------------------------------------------------------------------
  console.log('\n--- Test 2: seed carries the six verified links ---');
  {
    assert.strictEqual(initialProducts.length, 12);
    for (const p of initialProducts) {
      assert.ok('buy_url' in p && 'buy_store' in p, `seed product ${p.sku} must declare buy_url and buy_store`);
      const expected = EXPECTED_LINKS[p.sku];
      if (expected) {
        assert.strictEqual(p.buy_url, expected.buy_url, `${p.sku} buy_url`);
        assert.strictEqual(p.buy_store, expected.buy_store, `${p.sku} buy_store`);
        assert.strictEqual(validateBuyUrl(p.buy_url).ok, true, `${p.sku} seed URL must pass validation`);
      } else {
        assert.strictEqual(p.buy_url, null, `${p.sku} has no link yet`);
        assert.strictEqual(p.buy_store, null, `${p.sku} has no store yet`);
      }
      assert.strictEqual(p.currency, 'USD', 'currency stays USD');
    }
    assert.strictEqual(Object.keys(EXPECTED_LINKS).length, 6);
    console.log('✅ Six products linked, six empty, currency untouched.');
  }

  // ---------------------------------------------------------------------
  // 3. JSON fallback: tolerate legacy files, non-destructive backfill
  // ---------------------------------------------------------------------
  console.log('\n--- Test 3: JSON fallback legacy tolerance and backfill ---');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-buy-links-'));
  const originalCwd = process.cwd();
  try {
    fs.mkdirSync(path.join(tmp, 'data'));
    const legacyProducts: any[] = initialProducts.map((p) => {
      const { buy_url, buy_store, ...legacy } = p as any;
      return { ...legacy };
    });
    const bySku = (sku: string) => legacyProducts.find((p) => p.sku === sku);
    // Admin already set a custom link and store on Dell: must survive the backfill.
    bySku('VS-DELL-U27').buy_url = 'https://www.dell.com/custom-admin-link';
    bySku('VS-DELL-U27').buy_store = 'Dell Perú';
    // Empty strings count as "no value": Wacom is backfilled.
    bySku('VS-WACOM-C16').buy_url = '';
    bySku('VS-WACOM-C16').buy_store = '';
    // Store edited by hand but URL missing: only the URL is backfilled.
    bySku('VS-HUION-K16').buy_store = 'Mi tienda';
    fs.writeFileSync(
      path.join(tmp, 'data', 'db.json'),
      JSON.stringify(
        { products: legacyProducts, promotions: initialPromotions, orders: [], store_settings: initialStoreSettings },
        null,
        2
      )
    );
    process.chdir(tmp);

    const db = await import('../src/lib/db');
    const products = await db.getProducts();
    assert.strictEqual(products.length, 12);
    const get = (sku: string) => products.find((p) => p.sku === sku)!;

    assert.strictEqual(get('VS-DELL-U27').buy_url, 'https://www.dell.com/custom-admin-link', 'admin URL is never overwritten');
    assert.strictEqual(get('VS-DELL-U27').buy_store, 'Dell Perú', 'admin store is never overwritten');
    assert.strictEqual(get('VS-WACOM-C16').buy_url, EXPECTED_LINKS['VS-WACOM-C16'].buy_url, 'empty URL is backfilled');
    assert.strictEqual(get('VS-WACOM-C16').buy_store, 'Amazon', 'empty store is backfilled');
    assert.strictEqual(get('VS-HUION-K16').buy_url, EXPECTED_LINKS['VS-HUION-K16'].buy_url, 'missing URL is backfilled');
    assert.strictEqual(get('VS-HUION-K16').buy_store, 'Mi tienda', 'existing store is kept');
    for (const sku of ['VS-ASUS-PA329', 'VS-CALDIGIT-TS4', 'VS-ANKER-778']) {
      assert.strictEqual(get(sku).buy_url, EXPECTED_LINKS[sku].buy_url, `${sku} backfilled`);
      assert.strictEqual(get(sku).buy_store, EXPECTED_LINKS[sku].buy_store, `${sku} backfilled store`);
    }
    for (const p of products) {
      if (!EXPECTED_LINKS[p.sku]) {
        assert.strictEqual(p.buy_url, null, `${p.sku}: missing field normalises to null`);
        assert.strictEqual(p.buy_store, null, `${p.sku}: missing field normalises to null`);
      }
    }

    // Persisted to disk, and a second read is a no-op.
    const onDisk = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'db.json'), 'utf8'));
    const diskDell = onDisk.products.find((p: any) => p.sku === 'VS-DELL-U27');
    assert.strictEqual(diskDell.buy_url, 'https://www.dell.com/custom-admin-link');
    assert.strictEqual(onDisk.products.find((p: any) => p.sku === 'VS-ANKER-778').buy_url, EXPECTED_LINKS['VS-ANKER-778'].buy_url);
    const again = await db.getProducts();
    assert.deepStrictEqual(again, products, 'backfill is idempotent');

    // An admin edit that clears a value is a normal update and is persisted as such.
    const wacom = get('VS-WACOM-C16');
    const edited = await db.updateProduct(wacom.id, { buy_url: 'https://www.amazon.com/dp/EDITED', buy_store: 'Amazon US' });
    assert.strictEqual(edited?.buy_url, 'https://www.amazon.com/dp/EDITED');
    const reread = await db.getProductBySlug(wacom.slug);
    assert.strictEqual(reread?.buy_url, 'https://www.amazon.com/dp/EDITED', 'an edit survives the next read (no re-backfill over it)');
    assert.strictEqual(reread?.buy_store, 'Amazon US');

    // Legacy-shaped file where the whole fields are absent and the product is unknown to the seed.
    const custom = await db.getProductById(get('VS-MSI-Z16P').id);
    assert.strictEqual(custom?.buy_url, null);
    console.log('✅ Legacy rows tolerated; backfill fills only null/empty values and never overwrites.');

    // -------------------------------------------------------------------
    // 4. Public JSON surfaces
    // -------------------------------------------------------------------
    console.log('\n--- Test 4: /products.json, /api/products and /productos/[slug].json ---');
    {
      const { formatProduct } = await import('../src/lib/catalog');
      const formatted = formatProduct(get('VS-ANKER-778'), 'https://shop.test');
      assert.strictEqual(formatted.buy_url, EXPECTED_LINKS['VS-ANKER-778'].buy_url);
      assert.strictEqual(formatted.buy_store, 'Amazon');
      const empty = formatProduct({ ...get('VS-MSI-Z16P'), buy_url: undefined, buy_store: undefined } as any, 'https://shop.test');
      assert.strictEqual(empty.buy_url, null, 'absent buy_url is exposed as null');
      assert.strictEqual(empty.buy_store, null, 'absent buy_store is exposed as null');

      const { GET: productsJson } = await import('../src/app/products.json/route');
      const { GET: apiProducts } = await import('../src/app/api/products/route');
      const { GET: productJson } = await import('../src/app/productos/[slug].json/route');

      for (const handler of [productsJson, apiProducts]) {
        const res = await handler(new Request('https://shop.test/products.json'));
        const data = await res.json();
        assert.strictEqual(data.products.length, 12);
        for (const p of data.products) {
          assert.ok('buy_url' in p && 'buy_store' in p, `${p.sku}: fields present in the listing`);
          const expected = EXPECTED_LINKS[p.sku];
          if (p.sku === 'VS-WACOM-C16') {
            assert.strictEqual(p.buy_url, 'https://www.amazon.com/dp/EDITED');
          } else if (p.sku === 'VS-DELL-U27') {
            assert.strictEqual(p.buy_url, 'https://www.dell.com/custom-admin-link');
          } else if (p.sku === 'VS-HUION-K16') {
            assert.strictEqual(p.buy_url, expected.buy_url);
            assert.strictEqual(p.buy_store, 'Mi tienda');
          } else if (expected) {
            assert.strictEqual(p.buy_url, expected.buy_url);
            assert.strictEqual(p.buy_store, expected.buy_store);
          } else {
            assert.strictEqual(p.buy_url, null);
            assert.strictEqual(p.buy_store, null);
          }
        }
      }

      const anker = get('VS-ANKER-778');
      const single = await productJson(new Request(`https://shop.test/productos/${anker.slug}.json`), {
        params: Promise.resolve({ slug: anker.slug }),
      });
      const singleData = await single.json();
      assert.strictEqual(singleData.product.buy_url, EXPECTED_LINKS['VS-ANKER-778'].buy_url);
      assert.strictEqual(singleData.buy_store, 'Amazon');
      const msi = get('VS-MSI-Z16P');
      const noLink = await (
        await productJson(new Request(`https://shop.test/productos/${msi.slug}.json`), { params: Promise.resolve({ slug: msi.slug }) })
      ).json();
      assert.strictEqual(noLink.product.buy_url, null);
      assert.strictEqual(noLink.buy_store, null);
      console.log('✅ buy_url and buy_store exposed on all three public JSON surfaces (null when absent).');
    }

    // -------------------------------------------------------------------
    // 5. Admin API validation
    // -------------------------------------------------------------------
    console.log('\n--- Test 5: PATCH /api/admin/products/[id] buy link rules ---');
    {
      const { PATCH, GET } = await import('../src/app/api/admin/products/[id]/route');
      const target = get('VS-CALDIGIT-TS4');
      const patch = (body: unknown) =>
        PATCH(
          new Request(`http://localhost:3000/api/admin/products/${target.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }),
          { params: Promise.resolve({ id: target.id }) }
        );
      const current = async () => (await (await GET(new Request('http://x'), { params: Promise.resolve({ id: target.id }) })).json());

      for (const bad of [
        'javascript:alert(1)',
        'data:text/html;base64,AAAA',
        'http://www.amazon.com/dp/B09GK8LBWS',
        '/relative/path',
        'https://' + 'a'.repeat(2000) + '.com/',
      ]) {
        const res = await patch({ buy_url: bad, buy_store: 'Amazon' });
        assert.strictEqual(res.status, 400, `admin API must reject buy_url ${bad.slice(0, 30)}`);
      }
      assert.strictEqual((await current()).buy_url, EXPECTED_LINKS['VS-CALDIGIT-TS4'].buy_url, 'rejected edits do not change the stored value');

      const longStore = await patch({ buy_store: 'x'.repeat(121) });
      assert.strictEqual(longStore.status, 400, 'oversized buy_store is rejected');

      const good = await patch({ buy_url: 'https://www.amazon.com/dp/NEWASIN', buy_store: 'Amazon Perú' });
      assert.strictEqual(good.status, 200);
      const goodJson = await good.json();
      assert.strictEqual(goodJson.buy_url, 'https://www.amazon.com/dp/NEWASIN');
      assert.strictEqual(goodJson.buy_store, 'Amazon Perú');

      // A link without a store name would render "Comprar en undefined": the pair must stay coherent.
      const clearStore = await patch({ buy_store: null });
      assert.strictEqual(clearStore.status, 400, 'cannot clear buy_store while a buy_url remains');

      const clearBoth = await patch({ buy_url: '', buy_store: '' });
      assert.strictEqual(clearBoth.status, 200, 'clearing both fields is allowed');
      const cleared = await clearBoth.json();
      assert.strictEqual(cleared.buy_url, null);
      assert.strictEqual(cleared.buy_store, null);

      const urlWithoutStore = await patch({ buy_url: 'https://www.amazon.com/dp/NEWASIN' });
      assert.strictEqual(urlWithoutStore.status, 400, 'a buy_url needs a buy_store');

      const other = await patch({ price: 123.45 });
      assert.strictEqual(other.status, 200, 'unrelated edits still work without touching the link fields');
      console.log('✅ Admin API accepts only absolute https URLs and keeps url/store coherent.');
    }

    // -------------------------------------------------------------------
    // 6. Admin editor renders both fields
    // -------------------------------------------------------------------
    console.log('\n--- Test 6: admin product editor exposes buy_url and buy_store ---');
    {
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { ProductTableClient } = await import('../src/app/admin/productos/ProductTableClient');
      const fresh = await db.getProducts();
      const html = renderToStaticMarkup(React.createElement(ProductTableClient, { initialProducts: fresh }));
      const anker = fresh.find((p) => p.sku === 'VS-ANKER-778')!;
      assert.ok(html.includes(`aria-label="Enlace de compra de ${anker.sku}"`), 'buy_url input rendered per row');
      assert.ok(html.includes(`aria-label="Tienda de ${anker.sku}"`), 'buy_store input rendered per row');
      assert.ok(html.includes(`value="${anker.buy_url}"`), 'buy_url input carries the stored value');
      assert.ok(html.includes('value="Amazon"'), 'buy_store input carries the stored value');
      console.log('✅ Admin editor renders editable buy_url and buy_store inputs.');
    }
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  console.log('\n🎉 ALL BUY LINK TESTS PASSED SUCCESSFULLY! 🎉\n');
}

run().catch((err) => {
  console.error('❌ Buy link test failed with error:', err);
  process.exit(1);
});
