// Stub CSS imports for tsx execution
require.extensions['.css'] = () => {};

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import React from 'react';
(global as any).React = React;
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { initialProducts } from '../src/lib/seed-data';
import { extractVisible } from './visible-html';
import { findElements } from './seo-test-utils';

const ROOT = path.resolve(__dirname, '..');
const SRC_APP = path.join(ROOT, 'src', 'app');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

// Fake clock: the controller never needs a real timer in tests.
function fakeClock() {
  const timers = new Map<number, { fn: () => void; ms: number }>();
  let nextId = 1;
  const schedule = (fn: () => void, ms: number) => {
    const id = nextId++;
    timers.set(id, { fn: () => (timers.delete(id), fn()), ms }); // a fired timer is gone, like a real one
    return id as unknown as ReturnType<typeof setTimeout>;
  };
  const cancel = (id: ReturnType<typeof setTimeout>) => void timers.delete(id as unknown as number);
  return { timers, schedule, cancel };
}

async function run() {
  console.log('🧪 Starting Loading State Tests (no streamed loading, client-only progress bar)...');

  // ---------------------------------------------------------------------
  // 1. No route-level loading.tsx and no Suspense on public pages
  // ---------------------------------------------------------------------
  console.log('\n--- Test 1: no loading.tsx and no Suspense under src/app ---');
  {
    const files = walk(SRC_APP);
    const loadingFiles = files.filter((f) => /(^|[\\/])loading\.(tsx|ts|jsx|js)$/.test(f));
    assert.deepStrictEqual(
      loadingFiles.map((f) => path.relative(ROOT, f)),
      [],
      'a route-level loading file wraps the page in a Suspense boundary and streams its content into hidden containers'
    );
    const offenders = files
      .filter((f) => /\.(tsx|ts|jsx|js)$/.test(f))
      .filter((f) => /\bSuspense\b/.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(ROOT, f));
    assert.deepStrictEqual(offenders, [], 'no page, layout or route may use Suspense');
    assert.ok(!fs.existsSync(path.join(ROOT, 'src/components/PageLoader.tsx')), 'the skeleton loader is gone');
    console.log('✅ No loading.tsx, no Suspense, no skeleton loader.');
  }

  // ---------------------------------------------------------------------
  // 2. Pure helper: click filtering, timeout, controller
  // ---------------------------------------------------------------------
  console.log('\n--- Test 2: navigation progress helper ---');
  const progress = await import('../src/lib/nav-progress');
  {
    assert.strictEqual(progress.NAV_PROGRESS_TIMEOUT_MS, 8000);
    const here = 'https://shop.example.test/categoria/monitores';
    const click = (over: Record<string, unknown> = {}) => ({
      button: 0,
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      defaultPrevented: false,
      ...over,
    });
    const link = (href: string, over: Record<string, unknown> = {}) => ({
      href,
      target: null as string | null,
      download: false,
      ...over,
    });
    const should = (c: ReturnType<typeof click>, a: ReturnType<typeof link> | null, cur = here) =>
      progress.shouldStartProgress(c, a, cur);

    assert.strictEqual(should(click(), link('https://shop.example.test/productos/x')), true, 'internal link starts');
    assert.strictEqual(should(click(), link('https://shop.example.test/')), true, 'home link starts');
    assert.strictEqual(
      should(click(), link('https://shop.example.test/categoria/monitores?orden=precio')),
      true,
      'same path with another query is a navigation'
    );
    assert.strictEqual(should(click(), link('https://shop.example.test/x', { target: '_self' })), true, '_self is fine');

    assert.strictEqual(should(click({ metaKey: true }), link('https://shop.example.test/x')), false, 'meta');
    assert.strictEqual(should(click({ ctrlKey: true }), link('https://shop.example.test/x')), false, 'ctrl');
    assert.strictEqual(should(click({ shiftKey: true }), link('https://shop.example.test/x')), false, 'shift');
    assert.strictEqual(should(click({ altKey: true }), link('https://shop.example.test/x')), false, 'alt');
    assert.strictEqual(should(click({ button: 1 }), link('https://shop.example.test/x')), false, 'middle click');
    assert.strictEqual(should(click({ button: 2 }), link('https://shop.example.test/x')), false, 'right click');
    assert.strictEqual(should(click({ defaultPrevented: true }), link('https://shop.example.test/x')), false, 'prevented');
    assert.strictEqual(should(click(), link('https://shop.example.test/x', { target: '_blank' })), false, 'target blank');
    assert.strictEqual(should(click(), link('https://shop.example.test/x', { download: true })), false, 'download');
    assert.strictEqual(should(click(), link('https://www.amazon.com/dp/B096D4KY27')), false, 'external origin');
    assert.strictEqual(should(click(), link('https://shop.example.test:8443/x')), false, 'other port is another origin');
    assert.strictEqual(should(click(), link('http://shop.example.test/x')), false, 'other scheme is another origin');
    assert.strictEqual(should(click(), link(`${here}#specs`)), false, 'hash-only link');
    assert.strictEqual(should(click(), link(`${here}#`)), false, 'empty hash link');
    assert.strictEqual(should(click(), link(here)), false, 'the page you are already on');
    assert.strictEqual(should(click(), link('mailto:a@b.test')), false, 'mailto');
    assert.strictEqual(should(click(), link('tel:+51123456')), false, 'tel');
    assert.strictEqual(should(click(), link('javascript:void(0)')), false, 'javascript');
    assert.strictEqual(should(click(), link('http://')), false, 'unparsable href');
    assert.strictEqual(should(click(), null), false, 'no anchor under the click');
    assert.strictEqual(should(click(), link('')), false, 'empty href');

    // Controller with a fake clock
    const clock = fakeClock();
    const states: boolean[] = [];
    const ctl = progress.createProgressController((v) => states.push(v), clock);

    ctl.start();
    assert.deepStrictEqual(states, [true], 'start shows the bar immediately');
    assert.strictEqual(clock.timers.size, 1);
    assert.strictEqual([...clock.timers.values()][0].ms, 8000, 'safety timeout is 8 s');

    ctl.start(); // another click restarts the window instead of stacking timers
    assert.strictEqual(clock.timers.size, 1, 'a second click replaces the previous timer');

    [...clock.timers.values()][0].fn();
    assert.deepStrictEqual(states, [true, true, false], 'the timeout hides the bar');
    assert.strictEqual(clock.timers.size, 0);

    ctl.start();
    ctl.finish(); // the route changed
    assert.deepStrictEqual(states.slice(-2), [true, false], 'finish hides the bar');
    assert.strictEqual(clock.timers.size, 0, 'finish cancels the timeout');
    const before = states.length;
    ctl.finish(); // nothing is showing: no churn
    assert.strictEqual(states.length, before, 'finish while hidden does not set state again');

    ctl.start();
    ctl.dispose();
    assert.strictEqual(clock.timers.size, 0, 'dispose cancels a pending timeout (unmount)');
    ctl.dispose(); // idempotent
    console.log('✅ Click filtering and the 8 s controller verified with a fake clock.');
  }

  // ---------------------------------------------------------------------
  // 3. The progress bar component adds nothing to the server HTML
  // ---------------------------------------------------------------------
  console.log('\n--- Test 3: NavigationProgress renders nothing on the server ---');
  {
    const { NavigationProgress } = await import('../src/components/NavigationProgress');
    assert.strictEqual(renderToString(React.createElement(NavigationProgress)), '', 'renderToString is empty');
    assert.strictEqual(renderToStaticMarkup(React.createElement(NavigationProgress)), '', 'static markup is empty');

    // Code only: comments may mention the things the component avoids.
    const src = fs
      .readFileSync(path.join(ROOT, 'src/components/NavigationProgress.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    assert.ok(/^['"]use client['"]/.test(src.trim()), 'it is a client component');
    assert.ok(/role="progressbar"/.test(src), 'the bar is a progressbar');
    assert.ok(/motion-reduce:/.test(src), 'it respects prefers-reduced-motion');
    assert.ok(!/preventDefault/.test(src), 'it never prevents the navigation');
    assert.ok(!/\bSuspense\b|useSearchParams/.test(src), 'no Suspense and no useSearchParams (they force a client-rendering bailout)');
    assert.ok(/document\.addEventListener\('click'/.test(src), 'one delegated click listener on document');
    assert.ok(/removeEventListener\('click'/.test(src), 'the listener is removed on unmount');
    assert.ok(/usePathname/.test(src), 'it hides when the pathname changes');

    const RootLayout = (await import('../src/app/layout')).default;
    const tree = await RootLayout({ children: null });
    const mounted = findElements(tree, (el) => el.type === NavigationProgress);
    assert.strictEqual(mounted.length, 1, 'the root layout mounts the progress bar once');
    console.log('✅ Server HTML of the bar is empty; mounted once in the root layout.');
  }

  // ---------------------------------------------------------------------
  // 4. The visible-text extractor itself (so the regression test below can fail)
  // ---------------------------------------------------------------------
  console.log('\n--- Test 4: visible-text extractor ---');
  {
    // The shape the live site returned with loading.tsx: content only inside a hidden container.
    const streamed =
      '<html><head><title>T</title></head><body><nav>Menu</nav>' +
      '<template id="B:0"></template>Cargando…<!--$?-->' +
      '<div hidden id="S:0"><h1>Producto X</h1><span>US$ 10.00</span><a href="https://s.test/x">Comprar</a></div>' +
      '<script>$RC("B:0","S:0")</script></body></html>';
    const doc = extractVisible(streamed);
    assert.strictEqual(doc.text, 'Menu Cargando…', `only the shell is visible: ${doc.text}`);
    assert.strictEqual(doc.anchors.length, 0, 'an anchor inside a hidden container is not visible');
    assert.strictEqual(doc.hiddenElements, 1);
    assert.strictEqual(doc.templates, 1);

    const plain = extractVisible(
      '<body><h1 class="a>b">Producto &amp; Co</h1><p>US$ 10.00</p><a href="/x" target="_blank">Comprar <span>ya</span></a>' +
        '<style>.x{}</style><script>var a="<b>";</script><img src="a.png"><div style="display: none">oculto</div></body>'
    );
    assert.strictEqual(plain.text, 'Producto & Co US$ 10.00 Comprar ya', `got: ${plain.text}`);
    assert.deepStrictEqual(plain.anchors.map((a) => [a.href, a.text]), [['/x', 'Comprar ya']]);
    console.log('✅ Hidden containers, templates, scripts and display:none are excluded; anchors are collected.');
  }

  // ---------------------------------------------------------------------
  // 5. SSR regression: the content is in the visible flow, in one chunk
  // ---------------------------------------------------------------------
  console.log('\n--- Test 5: product, category and home HTML expose their content without JavaScript ---');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-loading-'));
  const originalCwd = process.cwd();
  fs.mkdirSync(path.join(tmp, 'data'));
  fs.writeFileSync(
    path.join(tmp, 'data', 'db.json'),
    JSON.stringify({ products: initialProducts, promotions: [], orders: [], store_settings: undefined }, null, 2)
  );
  process.chdir(tmp);
  try {
    const db = await import('../src/lib/db');
    const RootLayout = (await import('../src/app/layout')).default;
    const Home = (await import('../src/app/page')).default;
    const ProductPage = (await import('../src/app/productos/[slug]/page')).default;
    const CategoryPage = (await import('../src/app/categoria/[slug]/page')).default;
    const { validateBuyUrl } = await import('../src/lib/buy-url');
    const { normalizeCategorySlug } = await import('../src/lib/catalog');

    const document = async (page: unknown) =>
      renderToStaticMarkup((await RootLayout({ children: await page as React.ReactNode })) as React.ReactElement);

    const products = await db.getProducts();
    const linked = products.filter((p) => validateBuyUrl(p.buy_url).ok);
    assert.ok(linked.length > 0, 'the seed has products with a buy link');
    const price = (p: { price: number }) => `US$ ${p.price.toFixed(2)}`;

    const noStreaming = (name: string, html: string) => {
      assert.ok(!html.includes('id="S:'), `${name}: no streamed boundary container (id="S:n")`);
      assert.ok(!/id="B:\d+"/.test(html), `${name}: no boundary marker`);
      assert.ok(!html.includes('$RC('), `${name}: no inline boundary completion script`);
      assert.ok(!/Cargando/.test(html), `${name}: no "Cargando" in the HTML`);
      const doc = extractVisible(html);
      assert.strictEqual(doc.hiddenElements, 0, `${name}: no element is hidden`);
      assert.strictEqual(doc.templates, 0, `${name}: no template placeholder`);
      return doc;
    };

    // Product pages: every product shows name, price and (when linked) the buy link in the visible flow.
    for (const p of products) {
      const html = await document(ProductPage({ params: Promise.resolve({ slug: p.slug }) }));
      const doc = noStreaming(`product ${p.sku}`, html);
      assert.ok(doc.text.includes(p.title), `product ${p.sku}: the name is visible`);
      assert.ok(doc.text.includes(price(p)), `product ${p.sku}: the price ${price(p)} is visible`);
      const buy = doc.anchors.filter((a) => a.text === 'Comprar');
      const expectedUrl = validateBuyUrl(p.buy_url);
      if (expectedUrl.ok && expectedUrl.value) {
        assert.ok(buy.some((a) => a.href === expectedUrl.value), `product ${p.sku}: the visible buy link points to its store page`);
      }
    }

    // Category pages: each product card (name, price, buy link) is visible.
    for (const slug of ['estaciones-de-trabajo', 'monitores', 'accesorios', 'ofertas', 'liquidacion']) {
      const html = await document((CategoryPage as any)({ params: Promise.resolve({ slug }) }));
      const doc = noStreaming(`category ${slug}`, html);
      const inCategory = products.filter(
        (p) => normalizeCategorySlug(p.category) === slug || (slug === 'ofertas' && p.compare_at_price != null && p.compare_at_price > p.price)
      );
      const shown = inCategory.filter((p) => doc.text.includes(p.title));
      assert.ok(shown.length > 0, `category ${slug}: at least one product name is visible`);
      for (const p of shown) {
        assert.ok(doc.text.includes(price(p)), `category ${slug}: ${p.sku} price is visible`);
        const expectedUrl = validateBuyUrl(p.buy_url);
        if (expectedUrl.ok && expectedUrl.value) {
          assert.ok(
            doc.anchors.some((a) => a.text === 'Comprar' && a.href === expectedUrl.value),
            `category ${slug}: ${p.sku} buy link is visible`
          );
        }
      }
    }

    // Home page
    {
      const html = await document((Home as any)());
      const doc = noStreaming('home', html);
      const shown = products.filter((p) => doc.text.includes(p.title));
      assert.ok(shown.length > 0, 'home: product names are visible');
      for (const p of shown) {
        assert.ok(doc.text.includes(price(p)), `home: ${p.sku} price is visible`);
        const expectedUrl = validateBuyUrl(p.buy_url);
        if (expectedUrl.ok && expectedUrl.value) {
          assert.ok(
            doc.anchors.some((a) => a.text === 'Comprar' && a.href === expectedUrl.value),
            `home: ${p.sku} buy link is visible`
          );
        }
      }
    }
    console.log('✅ Product, category and home HTML: name, price and buy link visible; no hidden boundary, no "Cargando".');
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  // ---------------------------------------------------------------------
  // 6. Pure pending helpers of the buy link (kept from NL-7)
  // ---------------------------------------------------------------------
  console.log('\n--- Test 6: buy pending helpers ---');
  const pending = await import('../src/lib/buy-pending');
  {
    assert.strictEqual(pending.BUY_LABEL, 'Comprar');
    assert.strictEqual(pending.BUY_PENDING_LABEL, 'Abriendo…');
    assert.strictEqual(pending.BUY_PENDING_MS, 1500);
    assert.strictEqual(pending.buyLabel(false), 'Comprar');
    assert.strictEqual(pending.buyLabel(true), 'Abriendo…');

    const clock = fakeClock();
    const states: boolean[] = [];
    const ctl = pending.createPendingTimer((v) => states.push(v), clock);

    ctl.start();
    assert.deepStrictEqual(states, [true], 'start flips the flag on immediately');
    assert.strictEqual(clock.timers.size, 1);
    assert.strictEqual([...clock.timers.values()][0].ms, 1500, 'resets after about 1.5 s');

    ctl.start();
    assert.strictEqual(clock.timers.size, 1, 'a second click replaces the previous timer');

    [...clock.timers.values()][0].fn();
    assert.deepStrictEqual(states, [true, true, false], 'the timer returns the label to "Comprar"');

    ctl.start();
    ctl.dispose();
    assert.strictEqual(clock.timers.size, 0, 'dispose cancels a pending reset (unmount)');
    ctl.dispose();
    console.log('✅ Label follows the flag; 1.5 s window; restart and dispose never leak a timer.');
  }

  // ---------------------------------------------------------------------
  // 7. BuyLink markup and click behaviour (kept from NL-7)
  // ---------------------------------------------------------------------
  console.log('\n--- Test 7: BuyLink keeps its markup and navigation untouched ---');
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

  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.deepStrictEqual(
    Object.keys(pkg.dependencies).sort(),
    ['lucide-react', 'next', 'pg', 'react', 'react-dom'],
    'no new dependency was added'
  );

  console.log('\n🎉 ALL LOADING STATE TESTS PASSED SUCCESSFULLY! 🎉\n');
}

run().catch((err) => {
  console.error('❌ Loading state test failed with error:', err);
  process.exit(1);
});
