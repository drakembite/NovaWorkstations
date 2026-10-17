// Stub CSS imports for tsx execution
require.extensions['.css'] = () => {};

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import React from 'react';
(global as any).React = React;
import { initialProducts } from '../src/lib/seed-data';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function text(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ');
}

async function run() {
  console.log('🧪 Starting Demo Store Copy Tests...');

  const policy = await import('../src/lib/store-policy');
  const { STORE_POLICY, DEMO_POLICY_LABEL } = policy;

  // ---------------------------------------------------------------------
  // 1. The declared policy numbers are the experiment's ground truth: they must not drift
  // ---------------------------------------------------------------------
  console.log('\n--- Test 1: declared policy values ---');
  {
    assert.strictEqual(DEMO_POLICY_LABEL, 'Política de la tienda de demostración');
    assert.strictEqual(STORE_POLICY.dispatchCutoff, '16:00');
    assert.strictEqual(STORE_POLICY.limaDeliveryHours, 24);
    assert.strictEqual(STORE_POLICY.provincesDeliveryHours, '48-72');
    assert.strictEqual(STORE_POLICY.freeShippingFromUsd, 150);
    assert.strictEqual(STORE_POLICY.returnDays, 30);
    assert.strictEqual(STORE_POLICY.warrantyMonths, 12);
    console.log('✅ Cutoff 16:00, 24h Lima, 48-72h provinces, free over US$ 150, 30 days, 12 months.');
  }

  // ---------------------------------------------------------------------
  // 2. One source: no other source file hardcodes a policy number
  // ---------------------------------------------------------------------
  console.log('\n--- Test 2: policy numbers live in one module ---');
  {
    const root = path.join(process.cwd(), 'src');
    const allowed = new Set([path.join(root, 'lib', 'store-policy.ts'), path.join(root, 'lib', 'seed-data.ts')]);
    const literal = /\b24\s?(?:h\b|horas)|48\s?-\s?72|\b16:00|4:00\s?PM|US\$\s?150\b|\b30\s+d[ií]as|\b12\s+meses|\b24-48|\b96\s?horas/i;
    const offenders: string[] = [];
    for (const file of walk(root)) {
      if (allowed.has(file) || file.includes(`${path.sep}admin${path.sep}`)) continue;
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (literal.test(line)) offenders.push(`${path.relative(process.cwd(), file)}:${i + 1}: ${line.trim().slice(0, 70)}`);
      });
    }
    assert.deepStrictEqual(offenders, [], `policy numbers hardcoded outside src/lib/store-policy.ts:\n${offenders.join('\n')}`);
    console.log('✅ No page, component or metadata hardcodes a policy number.');
  }

  // The db module resolves its data directory from the cwd at import time: use a throwaway one.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-demo-copy-'));
  const originalCwd = process.cwd();
  fs.mkdirSync(path.join(tmp, 'data'));
  fs.writeFileSync(
    path.join(tmp, 'data', 'db.json'),
    JSON.stringify({ products: initialProducts, promotions: [], orders: [], store_settings: undefined }, null, 2)
  );
  process.chdir(tmp);

  try {
    const { renderToStaticMarkup } = await import('react-dom/server');
    const db = await import('../src/lib/db');
    const render = async (element: unknown) => renderToStaticMarkup((await element) as React.ReactElement);

    const Home = (await import('../src/app/page')).default;
    const Shipping = (await import('../src/app/envios-y-entregas/page')).default;
    const Returns = (await import('../src/app/devoluciones-y-garantia/page')).default;
    const ProductPage = (await import('../src/app/productos/[slug]/page')).default;
    const CategoryPage = (await import('../src/app/categoria/[slug]/page')).default;
    const { Navbar } = await import('../src/components/Navbar');
    const { Footer } = await import('../src/components/Footer');
    const Promociones = (await import('../src/app/promociones/page')).default;
    const { setClock, resetClock } = await import('../src/lib/clock');

    const products = await db.getProducts();
    const pages: Record<string, string> = {
      home: await render((Home as any)()),
      shipping: await render((Shipping as any)()),
      returns: await render((Returns as any)()),
      navbar: await render(React.createElement(Navbar)),
      footer: await render(React.createElement(Footer)),
      promociones: await render((Promociones as any)()),
    };
    for (const p of products) {
      pages[`product ${p.sku}`] = await render(ProductPage({ params: Promise.resolve({ slug: p.slug }) }));
    }
    for (const slug of ['estaciones-de-trabajo', 'monitores', 'accesorios', 'ofertas', 'liquidacion']) {
      pages[`category ${slug}`] = await render((CategoryPage as any)({ params: Promise.resolve({ slug }) }));
    }

    // -------------------------------------------------------------------
    // 3. No fiscal claims and no invented mailboxes on any public page
    // -------------------------------------------------------------------
    console.log('\n--- Test 3: no fiscal claims, no @novaworkstations.com ---');
    {
      for (const [name, html] of Object.entries(pages)) {
        assert.ok(!/@novaworkstations\.com/i.test(html), `${name}: no @novaworkstations.com address`);
        assert.ok(!/\bRUC\b/.test(html), `${name}: no RUC`);
        assert.ok(!/boleta/i.test(html), `${name}: no Boleta`);
        assert.ok(!/factura/i.test(html), `${name}: no Factura`);
        assert.ok(!/mailto:/i.test(html), `${name}: no mailto link`);
      }
      const sourceHits: string[] = [];
      for (const file of walk(path.join(originalCwd, 'src'))) {
        const src = fs.readFileSync(file, 'utf8');
        if (/@novaworkstations\.com/i.test(src)) sourceHits.push(path.relative(originalCwd, file));
      }
      assert.deepStrictEqual(sourceHits, [], 'no source file carries a novaworkstations.com mailbox');
      const footerText = text(pages.footer);
      const returnsText = text(pages.returns);
      assert.ok(/no (?:cuenta con|tiene) (?:un )?buz[oó]n/i.test(footerText), 'footer says there is no customer-service mailbox');
      assert.ok(/no (?:cuenta con|tiene) (?:un )?buz[oó]n/i.test(returnsText), 'returns page says there is no customer-service mailbox');
      console.log('✅ No Factura/Boleta/RUC, no store mailbox, on any public page.');
    }

    // -------------------------------------------------------------------
    // 4. Policy pages: labelled as the demo's policy, in destination-store terms, no orders
    // -------------------------------------------------------------------
    console.log('\n--- Test 4: labelled policy pages without orders ---');
    {
      for (const name of ['shipping', 'returns']) {
        const t = text(pages[name]);
        assert.ok(t.includes(DEMO_POLICY_LABEL), `${name}: labelled "${DEMO_POLICY_LABEL}"`);
        assert.ok(!/pedido/i.test(t), `${name}: no "pedido"`);
        assert.ok(!/\bórdenes?\b|\borden de compra/i.test(t), `${name}: no orders vocabulary`);
        assert.ok(/la tienda donde compres/i.test(t), `${name}: speaks in terms of the destination store`);
        assert.ok(/no vende/i.test(t), `${name}: says this store sells nothing`);
      }
      const productHtml = pages[`product ${products[0].sku}`];
      assert.ok(text(productHtml).includes(DEMO_POLICY_LABEL), 'product page labels its policy claims as the demo policy');
      assert.ok(text(pages.home).includes(DEMO_POLICY_LABEL), 'home page labels its policy claims as the demo policy');
      console.log('✅ Policy pages and product-page claims carry the demo label; no orders vocabulary.');
    }

    // -------------------------------------------------------------------
    // 5. The same policy numbers on every page
    // -------------------------------------------------------------------
    console.log('\n--- Test 5: policy numbers are identical everywhere ---');
    {
      const P = policy;
      const mustContain: Record<string, string[]> = {
        navbar: [P.FREE_SHIPPING_LABEL, P.LIMA_DELIVERY_SHORT, P.PROVINCES_DELIVERY_SHORT],
        footer: [P.FREE_SHIPPING_LABEL, P.LIMA_DELIVERY_SHORT, P.PROVINCES_DELIVERY_SHORT, P.RETURN_WINDOW_LABEL, P.WARRANTY_LABEL],
        shipping: [P.DISPATCH_CUTOFF_LABEL, P.FREE_SHIPPING_LABEL, P.LIMA_DELIVERY_SHORT, P.PROVINCES_DELIVERY_SHORT],
        returns: [P.RETURN_WINDOW_LABEL, P.WARRANTY_LABEL],
        home: [P.LIMA_DELIVERY_SHORT, P.WARRANTY_LABEL, P.RETURN_WINDOW_LABEL],
      };
      mustContain[`product ${products[0].sku}`] = [P.LIMA_DELIVERY_SHORT, P.PROVINCES_DELIVERY_SHORT, P.WARRANTY_LABEL, P.RETURN_WINDOW_LABEL];
      for (const [name, tokens] of Object.entries(mustContain)) {
        const t = text(pages[name]).toLowerCase();
        for (const token of tokens) assert.ok(t.includes(token.toLowerCase()), `${name} states "${token}"`);
      }

      // Any hour / day / month figure on a page must be one the shared module declares.
      const allowedHours = new Set<string>(P.ALL_HOUR_FIGURES);
      for (const [name, html] of Object.entries(pages)) {
        if (name.startsWith('category ') || name === 'promociones') continue;
        let t = text(html);
        if (name.startsWith('product ')) {
          // Product pages also carry the seed's own spec text (e.g. "9H" hardness): only the
          // policy blocks, which start at the demo label, are compared with the shared policy.
          t = t
            .split(DEMO_POLICY_LABEL)
            .slice(1)
            .map((chunk) => chunk.slice(0, chunk.search(/Devolución fácil|soporte técnico local\./) + 20))
            .join(' ');
        }
        for (const m of t.matchAll(/(?<![:\d])(\d+(?:\s?-\s?\d+)?)\s?(?:h\b|hrs\b|horas\b)/gi)) {
          const figure = m[1].replace(/\s/g, '');
          assert.ok(allowedHours.has(figure), `${name}: hour figure "${m[0]}" is not in the shared policy`);
        }
        for (const m of t.matchAll(/(\d+)\s+d[ií]as\b/gi)) {
          assert.strictEqual(Number(m[1]), STORE_POLICY.returnDays, `${name}: day figure "${m[0]}" disagrees with the shared policy`);
        }
        for (const m of t.matchAll(/(\d+)\s+meses\b/gi)) {
          assert.strictEqual(Number(m[1]), STORE_POLICY.warrantyMonths, `${name}: month figure "${m[0]}"`);
        }
        for (const m of t.matchAll(/US\$\s?(\d+)\b(?![.,]\d)/g)) {
          assert.ok(
            [STORE_POLICY.freeShippingFromUsd, ...P.SHIPPING_ZONES.map((z) => z.feeBelowThresholdUsd)].includes(Number(m[1])),
            `${name}: US$ figure "${m[0]}" is not a shared policy amount`
          );
        }
      }

      // The shipping table renders the shared zones verbatim.
      const shipText = text(pages.shipping);
      for (const zone of P.SHIPPING_ZONES) {
        assert.ok(shipText.includes(zone.zone) && shipText.includes(zone.leadTime), `zone ${zone.zone} rendered from the module`);
        assert.ok(shipText.includes(`US$ ${zone.feeBelowThresholdUsd.toFixed(2)}`), `fee for ${zone.zone}`);
      }
      console.log('✅ Navbar, footer, home, product, shipping and returns agree with store-policy.ts.');
    }

    // -------------------------------------------------------------------
    // 6. Stock line is untouched
    // -------------------------------------------------------------------
    console.log('\n--- Test 6: stock line untouched ---');
    {
      for (const p of products) {
        const t = text(pages[`product ${p.sku}`]);
        if (p.stock_quantity > 0) assert.ok(t.includes(`En Stock (${p.stock_quantity} unidades disponibles)`), `${p.sku} stock line`);
      }
      console.log('✅ "En Stock (N unidades disponibles)" kept.');
    }

    // -------------------------------------------------------------------
    // 7. /promociones: event statuses computed from dates against an injectable clock
    // -------------------------------------------------------------------
    console.log('\n--- Test 7: promotion event statuses follow the clock ---');
    {
      const { COMMERCIAL_EVENTS, eventStatus } = await import('../src/lib/promo-events');
      assert.strictEqual(COMMERCIAL_EVENTS.length, 5);
      for (const e of COMMERCIAL_EVENTS) {
        assert.ok(!('status' in e), `${e.title}: no typed status label in the data`);
        assert.ok(Date.parse(e.starts_at) < Date.parse(e.ends_at), `${e.title}: has a start before its end`);
      }
      const statusesAt = async (iso: string) => {
        setClock(() => new Date(iso));
        try {
          const html = await render((Promociones as any)());
          return [...html.matchAll(/data-event-status="([^"]+)"[^>]*>([^<]+)</g)].map((m) => `${m[1]}:${m[2]}`);
        } finally {
          resetClock();
        }
      };
      assert.deepStrictEqual(await statusesAt('2026-03-15T12:00:00-05:00'), [
        'current:Vigente Ahora',
        'upcoming:Próximamente',
        'upcoming:Próximamente',
        'upcoming:Próximamente',
        'upcoming:Próximamente',
      ]);
      assert.deepStrictEqual(await statusesAt('2026-10-17T12:00:00-05:00'), [
        'ended:Finalizado',
        'ended:Finalizado',
        'current:Vigente Ahora',
        'upcoming:Próximamente',
        'upcoming:Próximamente',
      ]);
      assert.deepStrictEqual(await statusesAt('2027-01-10T12:00:00-05:00'), [
        'ended:Finalizado',
        'ended:Finalizado',
        'ended:Finalizado',
        'ended:Finalizado',
        'ended:Finalizado',
      ]);

      // Boundaries: the start instant is current, the end instant is current, one ms later is ended.
      const october = COMMERCIAL_EVENTS[2];
      assert.strictEqual(eventStatus(october, new Date(Date.parse(october.starts_at) - 1)), 'upcoming');
      assert.strictEqual(eventStatus(october, new Date(october.starts_at)), 'current');
      assert.strictEqual(eventStatus(october, new Date(october.ends_at)), 'current');
      assert.strictEqual(eventStatus(october, new Date(Date.parse(october.ends_at) + 1)), 'ended');

      // Coupons stay informational and the page says so.
      const html = await render((Promociones as any)());
      assert.ok(/no se pueden canjear/i.test(text(html)), 'promotions page keeps saying coupons are informational');
      assert.ok(!/durante el proceso de compra/i.test(text(html)), 'no claim that coupons are applied in a purchase process');
      console.log('✅ Statuses computed at three injected times, with inclusive boundaries.');
    }

    resetClock();
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  console.log('\n🎉 ALL DEMO COPY TESTS PASSED SUCCESSFULLY! 🎉\n');
}

run().catch((err) => {
  console.error('❌ Demo copy test failed with error:', err);
  process.exit(1);
});
