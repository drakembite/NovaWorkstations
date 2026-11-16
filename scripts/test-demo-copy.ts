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
  // 1. The declared policy: returns and warranty figures stay, no shipping promise exists
  // ---------------------------------------------------------------------
  console.log('\n--- Test 1: declared policy values ---');
  {
    assert.strictEqual(DEMO_POLICY_LABEL, 'Política de la tienda');
    assert.strictEqual(STORE_POLICY.returnDays, 30);
    assert.strictEqual(STORE_POLICY.warrantyMonths, 12);
    assert.strictEqual(STORE_POLICY.refundHours, '48-72');
    assert.strictEqual(STORE_POLICY.warrantyDiagnosisHours, 48);
    assert.strictEqual(STORE_POLICY.returnInspectionHours, '24-48');
    // This store is an intermediary: it declares no delivery time, cutoff, fee or free-shipping threshold.
    for (const key of ['dispatchCutoff', 'limaDeliveryHours', 'provincesDeliveryHours', 'freeShippingFromUsd']) {
      assert.ok(!(key in STORE_POLICY), `STORE_POLICY has no "${key}"`);
    }
    for (const name of [
      'SHIPPING_ZONES',
      'DISPATCH_CUTOFF_LABEL',
      'LIMA_DELIVERY_SHORT',
      'PROVINCES_DELIVERY_SHORT',
      'FREE_SHIPPING_LABEL',
    ]) {
      assert.ok(!(name in policy), `store-policy does not export "${name}"`);
    }
    for (const name of ['RETURN_WINDOW_LABEL', 'WARRANTY_LABEL', 'DESTINATION_STORE_NOTE', 'NO_MAILBOX_NOTE']) {
      assert.ok(name in policy, `store-policy keeps "${name}"`);
    }
    assert.strictEqual(
      policy.POLICY_BANNER,
      'NovaWorkstations es un intermediario: el envío, los plazos, las devoluciones y la garantía los define la tienda donde compres'
    );
    console.log('✅ 30 days, 12 months, returns hours kept; no shipping figures declared.');
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
    // Offline: no test reaches the BCRP. Without a rate the pages show USD only.
    (await import('../src/lib/exchange-rate')).__setRateTestHooks({
      fetch: async () => {
        throw new Error('offline test');
      },
    });
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
        assert.ok(/intermediario/i.test(t), `${name}: says this store is an intermediary`);
        assert.ok(!/tienda de demostraci[oó]n/i.test(t), `${name}: does not call itself a demonstration store`);
      }
      const productHtml = pages[`product ${products[0].sku}`];
      assert.ok(text(productHtml).includes(DEMO_POLICY_LABEL), 'product page labels its policy claims as the demo policy');
      assert.ok(text(pages.home).includes(DEMO_POLICY_LABEL), 'home page labels its policy claims as the demo policy');
      console.log('✅ Policy pages and product-page claims carry the demo label; no orders vocabulary.');
    }

    // -------------------------------------------------------------------
    // 5. Returns and warranty figures are identical everywhere
    // -------------------------------------------------------------------
    console.log('\n--- Test 5: returns and warranty figures are identical everywhere ---');
    {
      const P = policy;
      const mustContain: Record<string, string[]> = {
        footer: [P.RETURN_WINDOW_LABEL, P.WARRANTY_LABEL],
        returns: [P.RETURN_WINDOW_LABEL, P.WARRANTY_LABEL],
        home: [P.WARRANTY_LABEL, P.RETURN_WINDOW_LABEL],
      };
      mustContain[`product ${products[0].sku}`] = [P.WARRANTY_LABEL, P.RETURN_WINDOW_LABEL];
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
      }
      console.log('✅ Footer, home, product and returns agree with store-policy.ts.');
    }

    // -------------------------------------------------------------------
    // 5b. No shipping promise, no physical address or opening hours, anywhere
    // -------------------------------------------------------------------
    console.log('\n--- Test 5b: no shipping promise, no address, no opening hours ---');
    {
      const { metadata: layoutMeta } = await import('../src/app/layout');
      const { metadata: homeMeta } = await import('../src/app/page');
      const { metadata: shippingMeta } = await import('../src/app/envios-y-entregas/page');
      const { metadata: returnsMeta } = await import('../src/app/devoluciones-y-garantia/page');
      const { metadata: promoMeta } = await import('../src/app/promociones/page');
      const { KNOWN_CATEGORIES } = await import('../src/lib/catalog');

      // Everything a visitor or a crawler can read: rendered pages plus page metadata.
      const surfaces: Record<string, string> = {};
      for (const [name, html] of Object.entries(pages)) surfaces[name] = text(html);
      surfaces['meta layout'] = JSON.stringify(layoutMeta);
      surfaces['meta home'] = JSON.stringify(homeMeta);
      surfaces['meta shipping'] = JSON.stringify(shippingMeta);
      surfaces['meta returns'] = JSON.stringify(returnsMeta);
      surfaces['meta promociones'] = JSON.stringify(promoMeta);
      for (const c of Object.values(KNOWN_CATEGORIES)) surfaces[`meta category ${c.slug}`] = JSON.stringify(c);

      // A policy-block-only view of product pages (the rest is the seed's own spec text).
      const policyOnly = (t: string) =>
        t
          .split(DEMO_POLICY_LABEL)
          .slice(1)
          .map((chunk) => chunk.slice(0, chunk.search(/Devolución fácil|soporte técnico local\./) + 20))
          .join(' ');

      const promises: Array<[string, RegExp]> = [
        ['a "Despacho" promise', /despacho\s+(?:en|de|seguro|r[aá]pido|prioritario|inmediato|\d)|despachamos|despachad[oa]s? en/i],
        ['an "Envío Express" promise', /env[ií]o\s+express|env[ií]os?\s+r[aá]pidos/i],
        ['a dispatch cutoff', /hora de corte|corte a las|\b16:00\b|salen? el mismo d[ií]a/i],
        ['a shipping fee in US$', /(?:costo|tarifa|cuesta)[^.]{0,40}US\$|US\$\s?(?:10|18|25)(?:\.00)?\b/i],
        ['a free-shipping offer', /env[ií]o\s+(?:gratis|gratuito|100% bonificado)|gratis\s+en\s+compras|US\$\s?150\b/i],
        ['an own delivery time', /entrega\s+en\s+\d|entrega\s+inmediata|(?:entregamos|llega)\s+en\s+\d/i],
        ['a physical address', /San Isidro/i],
        ['opening hours', /Lunes a S[aá]bado|\b09:00\b|\b18:00\b/i],
      ];
      for (const [name, t] of Object.entries(surfaces)) {
        for (const [what, re] of promises) {
          assert.ok(!re.test(t), `${name}: must not state ${what}`);
        }
      }

      // Delivery time in hours: nowhere but the returns page (refund / warranty hours are its own content).
      for (const [name, t] of Object.entries(surfaces)) {
        if (name === 'returns' || name.startsWith('category ') || name === 'promociones') continue;
        const view = name.startsWith('product ') ? policyOnly(t) : t;
        assert.ok(!/\d\s?(?:h\b|hrs\b|horas\b)/i.test(view), `${name}: must not state a delivery time in hours`);
      }

      // The navbar banner and the footer line say the destination store decides.
      assert.ok(
        text(pages.navbar).includes(
          'NovaWorkstations es un intermediario: el envío, los plazos, las devoluciones y la garantía los define la tienda donde compres'
        ),
        'navbar banner: the destination store decides shipping, times, returns and warranty'
      );
      assert.ok(
        text(pages.footer).includes('Plazos y costos de envío según la tienda donde compres.'),
        'footer: shipping times and costs depend on the destination store'
      );

      // Home and product pages use the destination-store wording.
      const homeText = text(pages.home);
      assert.ok(homeText.includes('Envío según la tienda de destino'), 'home card title');
      assert.ok(
        homeText.includes('El despacho lo realiza la tienda donde compres (Amazon, Falabella u otra), con sus propios plazos y costos.'),
        'home card body'
      );
      for (const p of products) {
        assert.ok(text(pages[`product ${p.sku}`]).includes('Envío según la tienda de destino'), `${p.sku}: shipping highlight`);
      }

      // The shipping page: short, and says the destination store defines times, costs and coverage.
      const shipText = text(pages.shipping);
      assert.ok(/plazos/i.test(shipText) && /costos/i.test(shipText) && /cobertura/i.test(shipText), 'shipping page names times, costs and coverage');
      assert.ok(/la tienda de destino/i.test(shipText), 'shipping page points to the destination store');
      assert.ok(/(?:define|definen)/i.test(shipText), 'shipping page says the destination store defines them');
      assert.ok(/<table/i.test(pages.shipping) === false, 'shipping page has no zones table');
      assert.ok(/href="\/categoria\/estaciones-de-trabajo"/.test(pages.shipping), 'shipping page links back to products');
      assert.ok(shipText.length < 2500, `shipping page stays short (${shipText.length} chars)`);

      // The URL stays in the sitemap.
      const sitemap = fs.readFileSync(path.join(originalCwd, 'src/app/sitemap.xml/route.ts'), 'utf8');
      assert.ok(sitemap.includes("'/envios-y-entregas'"), 'shipping page stays in the sitemap');
      console.log('✅ No delivery time, cutoff, fee, free shipping, address or hours on any page or metadata.');
    }

    // -------------------------------------------------------------------
    // 6. No stock claim: the stock numbers are not the seller's, so no page shows them
    // -------------------------------------------------------------------
    console.log('\n--- Test 6: no stock claim on any page ---');
    {
      for (const [label, html] of Object.entries(pages)) {
        const t = text(html);
        assert.ok(!/en stock|agotad|unidades disponibles/i.test(t), `${label}: no stock claim`);
      }
      for (const p of products) {
        const t = text(pages[`product ${p.sku}`]);
        assert.ok(!t.includes(`${p.stock_quantity} unidades`), `${p.sku}: no stock count`);
        assert.ok(t.includes('no es una oferta'), `${p.sku}: reference-price notice instead`);
      }
      console.log('✅ No "En Stock", "Agotado" or unit counts; the reference-price notice is shown.');
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
