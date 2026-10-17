// Stub CSS imports for tsx execution
require.extensions['.css'] = () => {};

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import React from 'react';
(global as any).React = React;
import { renderToStaticMarkup } from 'react-dom/server';

const STORE_NAMES = /falabella|amazon/i;
const ROOT = path.resolve(__dirname, '..');

const LOADING_ROUTES: Array<[string, string]> = [
  ['home', 'src/app/loading.tsx'],
  ['category', 'src/app/categoria/[slug]/loading.tsx'],
  ['product', 'src/app/productos/[slug]/loading.tsx'],
];

async function run() {
  console.log('🧪 Starting Loading State Tests...');

  // ---------------------------------------------------------------------
  // 1. loading.tsx modules
  // ---------------------------------------------------------------------
  console.log('\n--- Test 1: loading.tsx for home, category and product ---');
  for (const [name, rel] of LOADING_ROUTES) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `${name}: ${rel} exists`);
    const mod = await import(path.join(ROOT, rel));
    assert.strictEqual(typeof mod.default, 'function', `${name}: default export is a component`);
    const html = renderToStaticMarkup(React.createElement(mod.default));

    assert.ok(/role="status"/.test(html), `${name}: renders a role="status" element`);
    assert.ok(/aria-live="polite"/.test(html), `${name}: announces politely`);
    assert.ok(/aria-busy="true"/.test(html), `${name}: marked busy`);
    const hidden = /<[a-z]+ [^>]*class="[^"]*\bsr-only\b[^"]*"[^>]*>([^<]*)</.exec(html);
    assert.ok(hidden, `${name}: has a visually hidden element`);
    assert.strictEqual(hidden![1], 'Cargando…', `${name}: the hidden text is "Cargando…"`);
    assert.ok(/motion-reduce:animate-none/.test(html), `${name}: animations respect prefers-reduced-motion`);
    assert.ok(!STORE_NAMES.test(html), `${name}: no store name in the loader`);
    assert.ok(!/<(html|body|nav|footer|header)\b/.test(html), `${name}: renders inside the layout (navbar and footer stay)`);
    assert.ok(!/<script/.test(html), `${name}: no script`);
  }
  // The loaders are plain server components: no extra dependency, no client JS.
  for (const [, rel] of LOADING_ROUTES) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert.ok(!/['"]use client['"]/.test(src), `${rel} is a server component`);
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.deepStrictEqual(
    Object.keys(pkg.dependencies).sort(),
    ['lucide-react', 'next', 'pg', 'react', 'react-dom'],
    'no new dependency was added for the loaders'
  );
  console.log('✅ Three loaders: status role, hidden "Cargando…", reduced motion, no store name, inside the layout.');

  // ---------------------------------------------------------------------
  // 2. Pure pending helpers
  // ---------------------------------------------------------------------
  console.log('\n--- Test 2: buy pending helpers ---');
  const pending = await import('../src/lib/buy-pending');
  {
    assert.strictEqual(pending.BUY_LABEL, 'Comprar');
    assert.strictEqual(pending.BUY_PENDING_LABEL, 'Abriendo…');
    assert.strictEqual(pending.BUY_PENDING_MS, 1500);
    assert.strictEqual(pending.buyLabel(false), 'Comprar');
    assert.strictEqual(pending.buyLabel(true), 'Abriendo…');
    assert.ok(!STORE_NAMES.test(pending.BUY_LABEL + pending.BUY_PENDING_LABEL), 'labels name no store');

    // Fake clock: the controller never needs a real timer in tests.
    const timers = new Map<number, { fn: () => void; ms: number }>();
    let nextId = 1;
    const schedule = (fn: () => void, ms: number) => {
      const id = nextId++;
      timers.set(id, { fn: () => (timers.delete(id), fn()), ms }); // a fired timer is gone, like a real one
      return id as unknown as ReturnType<typeof setTimeout>;
    };
    const cancel = (id: ReturnType<typeof setTimeout>) => void timers.delete(id as unknown as number);
    const states: boolean[] = [];
    const ctl = pending.createPendingTimer((v) => states.push(v), { schedule, cancel });

    ctl.start();
    assert.deepStrictEqual(states, [true], 'start flips the flag on immediately');
    assert.strictEqual(timers.size, 1);
    assert.strictEqual([...timers.values()][0].ms, 1500, 'resets after about 1.5 s');

    ctl.start(); // a second click restarts the window instead of stacking timers
    assert.strictEqual(timers.size, 1, 'a second click replaces the previous timer');

    [...timers.values()][0].fn();
    assert.deepStrictEqual(states, [true, true, false], 'the timer returns the label to "Comprar"');

    ctl.start();
    ctl.dispose();
    assert.strictEqual(timers.size, 0, 'dispose cancels a pending reset (unmount)');
    ctl.dispose(); // idempotent
    console.log('✅ Label follows the flag; 1.5 s window; restart and dispose never leak a timer.');
  }

  // ---------------------------------------------------------------------
  // 3. BuyLink markup and click behaviour
  // ---------------------------------------------------------------------
  console.log('\n--- Test 3: BuyLink keeps its markup and navigation untouched ---');
  {
    const { BuyLink } = await import('../src/components/BuyLink');
    const href = 'https://www.amazon.com/dp/B096D4KY27';
    const html = renderToStaticMarkup(React.createElement(BuyLink, { sku: 'VS-MSI-Z16P', href }));
    const tag = /<a\s[^>]*>/.exec(html)![0];
    assert.ok(tag.includes(`href="${href}"`), 'href is the plain destination');
    assert.ok(tag.includes('target="_blank"'));
    assert.ok(tag.includes('rel="nofollow noopener noreferrer"'));
    assert.ok(!/aria-busy|aria-label|title=/.test(tag), 'server HTML is not pending and adds no aria-label or title');
    assert.strictEqual(html.replace(/<[^>]+>/g, '').trim(), 'Comprar', 'server-rendered text is exactly Comprar');
    assert.ok(!html.includes('Abriendo'), 'the pending text is client-only');

    // Drive the real click handler inside a render, the way React would hand it to the browser.
    let el: React.ReactElement<any> | undefined;
    const Probe = () => {
      el = BuyLink({ sku: 'VS-MSI-Z16P', href }) as React.ReactElement<any>;
      return el;
    };
    renderToStaticMarkup(React.createElement(Probe));
    assert.ok(el, 'BuyLink rendered inside a component');
    assert.strictEqual(el!.type, 'a');
    assert.strictEqual(el!.props.href, href);

    const g = globalThis as any;
    const realSetTimeout = g.setTimeout;
    const realClearTimeout = g.clearTimeout;
    const originalNavigator = Object.getOwnPropertyDescriptor(g, 'navigator');
    const scheduled: number[] = [];
    try {
      g.setTimeout = (_fn: () => void, ms: number) => (scheduled.push(ms), 1);
      g.clearTimeout = () => {};
      const beacons: string[] = [];
      Object.defineProperty(g, 'navigator', {
        configurable: true,
        value: { sendBeacon: (url: string) => (beacons.push(url), true) },
      });
      el!.props.onClick({
        preventDefault() {
          throw new Error('click must not be prevented');
        },
      });
      assert.deepStrictEqual(beacons, ['/api/outbound-click'], 'the click beacon still fires');
      assert.deepStrictEqual(scheduled, [1500], 'the pending window is scheduled, not awaited');
    } finally {
      g.setTimeout = realSetTimeout;
      g.clearTimeout = realClearTimeout;
      if (originalNavigator) Object.defineProperty(g, 'navigator', originalNavigator);
      else delete g.navigator;
    }
    console.log('✅ Same href/target/rel, server text "Comprar", beacon intact, nothing prevented or delayed.');
  }

  console.log('\n🎉 ALL LOADING STATE TESTS PASSED SUCCESSFULLY! 🎉\n');
}

run().catch((err) => {
  console.error('❌ Loading state test failed with error:', err);
  process.exit(1);
});
