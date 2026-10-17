// Stub CSS imports for tsx execution
require.extensions['.css'] = () => {};

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import React from 'react';
(global as any).React = React;
import { initialProducts, initialPromotions, initialStoreSettings } from '../src/lib/seed-data';
import { validateBuyNote, BUY_NOTE_MAX_LENGTH } from '../src/lib/buy-url';

const EXPECTED_NOTES: Record<string, string> = {
  'VS-BENQ-PD32': 'Modelo equivalente actual: BenQ PD3205U. El PD3220U está descontinuado.',
  'VS-LEN-P16G2':
    'Misma línea ThinkPad P16 Gen 2 en otra configuración (i7-13700HX, 32 GB): el código de parte puede diferir.',
  'VS-MSI-Z16P': 'Modelo equivalente disponible: MSI Creator Z16 (A11UET), versión anterior de la línea.',
  'VS-ASUS-H7604': 'Te lleva a los resultados de búsqueda de modelos ProArt Studiobook 16 OLED disponibles.',
};

// Fields that must stay byte-identical to what the 12 seed products carried before buy_note existed.
// (title/category/price/codes/descriptions are the experiment's intentional mess.)
const FROZEN: Record<string, { title: string; category: string; price: number; short_description: string }> = {
  'VS-LG-27UN850': {
    title: 'Monitor LG UltraFine 27 4K UHD 27UN850-W',
    category: 'Ofertas',
    price: 540.0,
    short_description: 'Monitor LG 27UN850-W de 27 pulgadas 4K IPS con excelente color.',
  },
  'VS-HP-ZBOOK16': {
    title: 'Workstation HP ZBook Studio 16 G10',
    category: 'Estaciones de Trabajo',
    price: 2290.0,
    short_description:
      'Potente estación de trabajo portátil HP ZBook de 16 pulgadas para ingeniería. Oferta válida hasta el 30 de julio.',
  },
  'VS-LEN-P16G2': {
    title: 'Workstation Lenovo ThinkPad P16 Gen 2 21FA0022US',
    category: 'Liquidación',
    price: 2320.0,
    short_description:
      'Estación de trabajo Lenovo ThinkPad P16 Gen 2 de alto rendimiento. Oferta válida hasta el 30 de julio.',
  },
};

async function run() {
  console.log('🧪 Starting Buy Note (buy_note) Tests...');

  // ---------------------------------------------------------------------
  // 1. Validation
  // ---------------------------------------------------------------------
  console.log('\n--- Test 1: buy_note validation ---');
  {
    assert.deepStrictEqual(validateBuyNote('  Nota simple  '), { ok: true, value: 'Nota simple' }, 'trimmed');
    assert.deepStrictEqual(validateBuyNote(null), { ok: true, value: null });
    assert.deepStrictEqual(validateBuyNote(undefined), { ok: true, value: null });
    assert.deepStrictEqual(validateBuyNote(''), { ok: true, value: null }, 'empty clears');
    assert.deepStrictEqual(validateBuyNote('   '), { ok: true, value: null }, 'blank clears');
    assert.strictEqual(BUY_NOTE_MAX_LENGTH, 300);
    assert.strictEqual(validateBuyNote('a'.repeat(300)).ok, true, 'exactly 300 chars accepted');
    assert.strictEqual(validateBuyNote('a'.repeat(301)).ok, false, '301 chars rejected');
    assert.strictEqual(validateBuyNote(`  ${'a'.repeat(300)}  `).ok, true, 'length is measured after trimming');
    for (const [label, bad] of [
      ['script tag', '<script>alert(1)</script>'],
      ['bold tag', 'Hola <b>mundo</b>'],
      ['lone angle bracket', 'a > b'],
      ['image tag', '<img src=x onerror=alert(1)>'],
      ['not a string', 42],
      ['object', { text: 'x' }],
      ['control character', 'Hola\u0000mundo'],
    ] as Array<[string, unknown]>) {
      assert.strictEqual(validateBuyNote(bad).ok, false, `buy_note must reject: ${label}`);
    }
    // Accented Spanish text and common punctuation stay valid.
    assert.strictEqual(validateBuyNote(EXPECTED_NOTES['VS-LEN-P16G2']).ok, true);
    console.log('✅ Notes are trimmed plain text (max 300), empty clears, HTML is rejected.');
  }

  // ---------------------------------------------------------------------
  // 2. Seed
  // ---------------------------------------------------------------------
  console.log('\n--- Test 2: seed carries exactly four notes and twelve links ---');
  {
    assert.strictEqual(initialProducts.length, 12);
    const linked = initialProducts.filter((p) => p.buy_url);
    assert.strictEqual(linked.length, 12, 'all 12 products are linked');
    const withNote = initialProducts.filter((p) => p.buy_note);
    assert.deepStrictEqual(withNote.map((p) => p.sku).sort(), Object.keys(EXPECTED_NOTES).sort(), 'exactly four notes');
    for (const p of initialProducts) {
      assert.ok('buy_note' in p, `${p.sku} declares buy_note`);
      assert.strictEqual(p.buy_note ?? null, EXPECTED_NOTES[p.sku] ?? null, `${p.sku} note`);
      if (p.buy_note) assert.strictEqual(validateBuyNote(p.buy_note).ok, true, `${p.sku} seed note is valid`);
      assert.strictEqual(p.currency, 'USD');
    }
    for (const sku of ['VS-MSI-Z16P', 'VS-ASUS-H7604']) {
      const p = initialProducts.find((x) => x.sku === sku)!;
      assert.ok(p.buy_url && p.buy_store, `${sku} has an (approximate) link and an internal store label`);
      assert.ok(p.buy_note, `${sku} says the link is approximate`);
    }
    for (const [sku, frozen] of Object.entries(FROZEN)) {
      const p = initialProducts.find((x) => x.sku === sku)!;
      assert.strictEqual(p.title, frozen.title, `${sku} title untouched`);
      assert.strictEqual(p.category, frozen.category, `${sku} category untouched`);
      assert.strictEqual(p.price, frozen.price, `${sku} price untouched`);
      assert.strictEqual(p.short_description, frozen.short_description, `${sku} description untouched`);
    }
    const benq = initialProducts.find((p) => p.sku === 'VS-BENQ-PD32')!;
    assert.strictEqual(benq.title, 'Monitor BenQ DesignVue PD3220U 32 4K', 'BenQ title keeps the discontinued model');
    console.log('✅ Seed: 12 links, 4 notes, frozen fields untouched.');
  }

  // The db module resolves its data directory from the cwd at import time: use one throwaway
  // directory (legacy-shaped file, no buy_note) for every section below.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-buy-note-'));
  const originalCwd = process.cwd();
  fs.mkdirSync(path.join(tmp, 'data'));
  const legacy: any[] = initialProducts.map((p) => {
    const { buy_note, ...rest } = p as any;
    return { ...rest };
  });
  const bySku = (sku: string) => legacy.find((p) => p.sku === sku);
  // Admin already wrote their own note on Lenovo: must survive. BenQ lacks the field entirely.
  bySku('VS-LEN-P16G2').buy_note = 'Nota editada por el admin';
  fs.writeFileSync(
    path.join(tmp, 'data', 'db.json'),
    JSON.stringify({ products: legacy, promotions: initialPromotions, orders: [], store_settings: initialStoreSettings }, null, 2)
  );
  process.chdir(tmp);
  const EXPECTED_NOTES_STORED: Record<string, string> = {
    ...EXPECTED_NOTES,
    'VS-LEN-P16G2': 'Nota editada por el admin',
  };
  try {

  // ---------------------------------------------------------------------
  // 3. Rendering
  // ---------------------------------------------------------------------
  console.log('\n--- Test 3: the note renders next to the button, escaped ---');
  {
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { BuyAction } = await import('../src/components/BuyAction');
    const { ProductCard } = await import('../src/components/ProductCard');
    const benq = initialProducts.find((p) => p.sku === 'VS-BENQ-PD32')!;
    const dell = initialProducts.find((p) => p.sku === 'VS-DELL-U27')!;
    const msi = initialProducts.find((p) => p.sku === 'VS-MSI-Z16P')!;

    const escapeHtml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    for (const compact of [false, true]) {
      const html = renderToStaticMarkup(React.createElement(BuyAction, { product: benq, compact }));
      const anchorEnd = html.indexOf('</a>');
      const noteAt = html.indexOf(escapeHtml(benq.buy_note!));
      assert.ok(anchorEnd > 0 && noteAt > anchorEnd, `note follows the button (compact=${compact})`);
      assert.ok(html.indexOf('data-buy-note') > anchorEnd, 'note carries a stable marker after the anchor');
      assert.ok(!html.slice(0, anchorEnd).includes(escapeHtml(benq.buy_note!)), 'note is outside the anchor text');

      const noNote = renderToStaticMarkup(React.createElement(BuyAction, { product: dell, compact }));
      assert.ok(!noNote.includes('data-buy-note'), 'a linked product without a note renders no note element');

      const unlinked = renderToStaticMarkup(
        React.createElement(BuyAction, { product: { ...msi, buy_url: null, buy_note: 'No debería verse' }, compact })
      );
      assert.ok(!unlinked.includes('No debería verse'), 'a note is never shown without a link');
      assert.ok(!unlinked.includes('data-buy-note'));
    }

    // A hostile stored note is escaped, never interpreted.
    const hostile = { ...benq, buy_note: '<img src=x onerror=alert(1)><script>alert(2)</script>' };
    const hostileHtml = renderToStaticMarkup(React.createElement(BuyAction, { product: hostile }));
    assert.ok(!hostileHtml.includes('<img'), 'no raw img tag from a note');
    assert.ok(!hostileHtml.includes('<script'), 'no raw script tag from a note');
    assert.ok(hostileHtml.includes('&lt;img'), 'the note text is escaped');

    // Product cards and the product page show the note for BenQ and Lenovo only.
    const cardHtml = renderToStaticMarkup(ProductCard({ product: benq }));
    assert.ok(cardHtml.includes(escapeHtml(benq.buy_note!)), 'card shows the note');
    assert.ok(!renderToStaticMarkup(ProductCard({ product: dell })).includes('data-buy-note'), 'card without note');

    {
      const db = await import('../src/lib/db');
      const ProductDetailPage = (await import('../src/app/productos/[slug]/page')).default;
      for (const product of await db.getProducts()) {
        const tree = await ProductDetailPage({ params: Promise.resolve({ slug: product.slug }) });
        const html = renderToStaticMarkup(tree as React.ReactElement);
        const expected = EXPECTED_NOTES_STORED[product.sku];
        if (expected) {
          const at = html.indexOf(escapeHtml(expected));
          assert.ok(at > html.indexOf('rel="nofollow noopener noreferrer"'), `${product.sku}: note rendered after the buy button on the page`);
        } else {
          assert.ok(!html.includes('data-buy-note'), `${product.sku}: no note element on the page`);
        }
      }
    }
    console.log('✅ Note renders right after the button on the page and cards, escaped, only with a link.');
  }

  // ---------------------------------------------------------------------
  // 4. JSON fallback, backfill, public JSON, admin API, editor
  // ---------------------------------------------------------------------
  console.log('\n--- Test 4: fallback backfill, JSON surfaces, admin API and editor ---');
    const db = await import('../src/lib/db');
    const products = await db.getProducts();
    const get = (sku: string) => products.find((p) => p.sku === sku)!;
    assert.strictEqual(get('VS-BENQ-PD32').buy_note, EXPECTED_NOTES['VS-BENQ-PD32'], 'missing note is backfilled');
    assert.strictEqual(get('VS-LEN-P16G2').buy_note, 'Nota editada por el admin', 'admin note is never overwritten');
    for (const p of products) {
      if (!EXPECTED_NOTES[p.sku]) assert.strictEqual(p.buy_note, null, `${p.sku}: null`);
    }
    assert.strictEqual(get('VS-MSI-Z16P').buy_note, EXPECTED_NOTES['VS-MSI-Z16P'], 'MSI note is backfilled');
    assert.strictEqual(get('VS-ASUS-H7604').buy_note, EXPECTED_NOTES['VS-ASUS-H7604'], 'ASUS note is backfilled');
    const onDisk = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'db.json'), 'utf8'));
    assert.strictEqual(onDisk.products.find((p: any) => p.sku === 'VS-BENQ-PD32').buy_note, EXPECTED_NOTES['VS-BENQ-PD32']);
    assert.deepStrictEqual(await db.getProducts(), products, 'backfill is idempotent');

    const { formatProduct } = await import('../src/lib/catalog');
    assert.strictEqual(formatProduct(get('VS-BENQ-PD32'), 'https://shop.test').buy_note, EXPECTED_NOTES['VS-BENQ-PD32']);
    assert.strictEqual(
      formatProduct({ ...get('VS-MSI-Z16P'), buy_note: undefined } as any, 'https://shop.test').buy_note,
      null,
      'absent note is exposed as null'
    );

    const { GET: productsJson } = await import('../src/app/products.json/route');
    const { GET: apiProducts } = await import('../src/app/api/products/route');
    const { GET: productJson } = await import('../src/app/productos/[slug].json/route');
    for (const handler of [productsJson, apiProducts]) {
      const data = await (await handler(new Request('https://shop.test/products.json'))).json();
      for (const p of data.products) {
        assert.ok('buy_note' in p, `${p.sku}: buy_note key present in the listing`);
        if (p.sku === 'VS-BENQ-PD32') assert.strictEqual(p.buy_note, EXPECTED_NOTES['VS-BENQ-PD32']);
        else if (p.sku === 'VS-LEN-P16G2') assert.strictEqual(p.buy_note, 'Nota editada por el admin');
        else assert.strictEqual(p.buy_note, EXPECTED_NOTES[p.sku] ?? null);
      }
    }
    const benq = get('VS-BENQ-PD32');
    const single = await (
      await productJson(new Request(`https://shop.test/productos/${benq.slug}.json`), { params: Promise.resolve({ slug: benq.slug }) })
    ).json();
    assert.strictEqual(single.product.buy_note, EXPECTED_NOTES['VS-BENQ-PD32']);
    assert.strictEqual(single.buy_note, EXPECTED_NOTES['VS-BENQ-PD32']);

    // Admin API
    const { PATCH } = await import('../src/app/api/admin/products/[id]/route');
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
    assert.strictEqual((await patch({ buy_note: '<b>x</b>' })).status, 400, 'HTML note rejected');
    assert.strictEqual((await patch({ buy_note: 'a'.repeat(301) })).status, 400, 'oversized note rejected');
    assert.strictEqual((await patch({ buy_note: 5 })).status, 400, 'non-string note rejected');
    assert.strictEqual((await db.getProductById(target.id))?.buy_note, null, 'rejected edits change nothing');
    const ok = await patch({ buy_note: '  Versión importada.  ' });
    assert.strictEqual(ok.status, 200);
    assert.strictEqual((await ok.json()).buy_note, 'Versión importada.', 'stored trimmed');
    const cleared = await patch({ buy_note: '' });
    assert.strictEqual(cleared.status, 200);
    assert.strictEqual((await cleared.json()).buy_note, null, 'empty clears the note');
    assert.strictEqual((await patch({ price: 99.5 })).status, 200, 'unrelated edits do not require the note');

    // Admin editor
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { ProductTableClient } = await import('../src/app/admin/productos/ProductTableClient');
    const html = renderToStaticMarkup(React.createElement(ProductTableClient, { initialProducts: await db.getProducts() }));
    assert.ok(html.includes(`aria-label="Nota de compra de VS-BENQ-PD32"`), 'note editor rendered per row');
    assert.ok(html.includes('maxLength="300"') || html.includes('maxlength="300"'), 'editor caps the note at 300');
    assert.ok(html.includes('El PD3220U está descontinuado.'), 'editor carries the stored note');
    console.log('✅ Backfill keeps edits, JSON surfaces expose buy_note, admin API and editor handle it.');
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  console.log('\n🎉 ALL BUY NOTE TESTS PASSED SUCCESSFULLY! 🎉\n');
}

run().catch((err) => {
  console.error('❌ Buy note test failed with error:', err);
  process.exit(1);
});
