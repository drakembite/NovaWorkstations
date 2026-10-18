// Stub CSS imports for tsx execution
require.extensions['.css'] = () => {};

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import React from 'react';
(global as any).React = React;

const ROOT = process.cwd();
const exists = (rel: string) => fs.existsSync(path.join(ROOT, rel));

function listSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) listSourceFiles(rel, out);
    else if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

async function run() {
  console.log('🧪 Starting Cart / Checkout / Order Removal Tests...');

  // ---------------------------------------------------------------------
  // 1. Removed UI, routes and modules are gone
  // ---------------------------------------------------------------------
  console.log('\n--- Test 1: removed files ---');
  {
    const removed = [
      'src/components/AddToCartButton.tsx',
      'src/components/CartView.tsx',
      'src/components/CheckoutView.tsx',
      'src/lib/cart.ts',
      'src/app/carrito',
      'src/app/checkout',
      'src/app/api/orders',
      'src/app/api/promotions/validate',
      'src/app/admin/pedidos',
      'src/app/api/admin/orders',
      'scripts/test-cart-checkout.ts',
    ];
    for (const rel of removed) assert.ok(!exists(rel), `${rel} must be removed`);
    console.log('✅ Cart, checkout, order and refund files are gone.');
  }

  // ---------------------------------------------------------------------
  // 2. Nothing references the removed features
  // ---------------------------------------------------------------------
  console.log('\n--- Test 2: no dangling references in src ---');
  {
    const forbidden: Array<[RegExp, string]> = [
      [/@\/lib\/cart|\.\/cart['"]/, 'lib/cart import'],
      [/CartView|CheckoutView|AddToCartButton/, 'removed component'],
      [/['"`]\/carrito|href=["']\/carrito/, '/carrito link'],
      [/['"`]\/checkout/, '/checkout link'],
      [/\/api\/orders|\/api\/promotions\/validate|\/api\/admin\/orders/, 'removed API route'],
      [/\/admin\/pedidos/, 'orders admin page'],
      [/\b(createOrder|getOrders|getOrderById|refundOrder)\b/, 'order data functions'],
    ];
    for (const file of listSourceFiles('src')) {
      const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
      for (const [re, label] of forbidden) {
        assert.ok(!re.test(text), `${file} still references ${label}`);
      }
    }
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(!/test-cart-checkout/.test(JSON.stringify(pkg.scripts)), 'package.json scripts must not run the removed suite');
    console.log('✅ No source file references the removed features.');
  }

  // ---------------------------------------------------------------------
  // 3. Storefront chrome has no cart
  // ---------------------------------------------------------------------
  console.log('\n--- Test 3: Navbar and Footer ---');
  {
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { Navbar } = await import('../src/components/Navbar');
    const { Footer } = await import('../src/components/Footer');
    for (const [name, Component] of [['Navbar', Navbar], ['Footer', Footer]] as const) {
      const html = renderToStaticMarkup(React.createElement(Component));
      assert.ok(!/carrito/i.test(html), `${name} must not mention the cart`);
      assert.ok(!html.includes('/checkout'), `${name} must not link to checkout`);
    }
    const navHtml = renderToStaticMarkup(React.createElement(Navbar));
    assert.ok(navHtml.includes('/categoria/monitores') && navHtml.includes('/promociones'), 'Navbar keeps its catalog links');
    console.log('✅ Navbar and Footer render without cart links.');
  }

  // ---------------------------------------------------------------------
  // 4. Data layer: no order functions, other features intact
  // ---------------------------------------------------------------------
  console.log('\n--- Test 4: data layer ---');
  {
    const db: Record<string, unknown> = await import('../src/lib/db');
    for (const name of ['createOrder', 'getOrders', 'getOrderById', 'refundOrder']) {
      assert.strictEqual(db[name], undefined, `db must not export ${name}`);
    }
    for (const name of ['getProducts', 'updateProduct', 'getPromotions', 'getPromotionByCode', 'createPromotion', 'togglePromotion', 'getStoreSettings', 'updateStoreSettings', 'createOutboundClick', 'getOutboundClicks']) {
      assert.strictEqual(typeof db[name], 'function', `db must keep ${name}`);
    }
    console.log('✅ Order functions removed; products, promotions, settings and clicks kept.');
  }

  // ---------------------------------------------------------------------
  // 5. Admin: dashboard, navigation, webhook tester, settings
  // ---------------------------------------------------------------------
  console.log('\n--- Test 5: admin surface ---');
  {
    const { renderToStaticMarkup } = await import('react-dom/server');

    const layoutSrc = fs.readFileSync(path.join(ROOT, 'src/app/admin/AdminLayoutClient.tsx'), 'utf8');
    assert.ok(!/Pedidos/.test(layoutSrc), 'admin navigation must not list Pedidos');

    const Dashboard = (await import('../src/app/admin/page')).default;
    const dashboardHtml = renderToStaticMarkup((await Dashboard()) as React.ReactElement);
    assert.ok(!/Pedidos|Devoluciones|Ventas/i.test(dashboardHtml), 'dashboard must not show orders, refunds or sales');
    assert.ok(/Clics/i.test(dashboardHtml), 'dashboard reports outbound clicks instead');

    const { POST: testWebhook } = await import('../src/app/api/admin/webhooks/test/route');
    const send = (event: string) =>
      testWebhook(
        new Request('http://localhost:3000/api/admin/webhooks/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event, url: 'http://127.0.0.1:9/never-called' }),
        })
      );
    assert.strictEqual((await send('order.paid')).status, 400, 'order.paid tester is gone');
    assert.strictEqual((await send('order.refunded')).status, 400, 'order.refunded tester is gone');

    const { SettingsManagerClient } = await import('../src/app/admin/ajustes/SettingsManagerClient');
    const { getStoreSettings } = await import('../src/lib/db');
    const settingsHtml = renderToStaticMarkup(
      React.createElement(SettingsManagerClient, { initialSettings: await getStoreSettings() })
    );
    assert.ok(settingsHtml.includes('product.updated'), 'settings keep the product.updated webhook');
    assert.ok(!settingsHtml.includes('order.paid') && !settingsHtml.includes('order.refunded'), 'order webhook fields are hidden');
    console.log('✅ Admin dashboard, navigation, webhook tester and settings no longer expose orders.');
  }

  // ---------------------------------------------------------------------
  // 6. Kept features
  // ---------------------------------------------------------------------
  console.log('\n--- Test 6: kept features ---');
  {
    const { renderToStaticMarkup } = await import('react-dom/server');
    const Promociones = (await import('../src/app/promociones/page')).default;
    const html = renderToStaticMarkup((await Promociones()) as React.ReactElement);
    assert.ok(!/p[aá]gina del carrito/i.test(html), 'promotions terms must not send buyers to a cart');
    assert.ok(/DEMO-ESTUDIO10/.test(html), 'promotions page keeps listing the promotions');
    assert.ok(!/(?<!DEMO-)ESTUDIO10/.test(html), 'promotions page never shows the retired bare ESTUDIO10 code');

    assert.ok(exists('src/components/AttributionTracker.tsx'), 'inbound attribution tracker is kept');
    assert.ok(exists('src/lib/attribution.ts'), 'attribution helpers are kept');
    assert.ok(exists('src/app/api/outbound-click/route.ts'), 'outbound click route is kept');
    assert.ok(exists('src/app/promociones/page.tsx'), 'promotions page is kept');
    console.log('✅ Promotions page, attribution tracker and outbound route are intact.');
  }

  console.log('\n🎉 ALL CART REMOVAL TESTS PASSED SUCCESSFULLY! 🎉\n');
}

run().catch((err) => {
  console.error('❌ Cart removal test failed with error:', err);
  process.exit(1);
});
