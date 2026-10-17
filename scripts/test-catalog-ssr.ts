// Stub CSS imports for tsx execution
require.extensions['.css'] = () => {};

import assert from 'assert';
import React from 'react';
(global as any).React = React;
import { getProducts, getProductBySlug } from '../src/lib/db';
import {
  normalizeCategorySlug,
  getCategoryInfo,
  filterProductsByCategory,
  KNOWN_CATEGORIES,
} from '../src/lib/catalog';
import HomePage, { metadata as homeMeta } from '../src/app/page';
import CategoryPage, {
  generateMetadata as generateCategoryMetadata,
} from '../src/app/categoria/[slug]/page';
import ProductDetailPage, {
  generateMetadata as generateProductMetadata,
} from '../src/app/productos/[slug]/page';
import { ProductCard } from '../src/components/ProductCard';
import {
  STORE_NAME,
  FALLBACK_SITE_URL,
  resolveTitle,
  countOccurrences,
  findElements,
  textLeaves,
  getJsonLdBlocks,
  withSiteUrl,
} from './seo-test-utils';

async function testCatalogSsr() {
  console.log('🧪 Starting Catalog & Product Detail SSR Tests...');

  const allProducts = await getProducts();
  assert.ok(allProducts.length > 0, 'Database should return seeded products');

  // =========================================================================
  // 1. Slug Normalization & Category Mapping
  // =========================================================================
  console.log('\n--- Test 1: Category Slug Normalization & Mapping ---');
  {
    assert.strictEqual(
      normalizeCategorySlug('Estaciones de Trabajo'),
      'estaciones-de-trabajo',
      'Should normalize Estaciones de Trabajo with hyphens'
    );
    assert.strictEqual(
      normalizeCategorySlug('Liquidación'),
      'liquidacion',
      'Should strip accent from Liquidación'
    );
    assert.strictEqual(
      normalizeCategorySlug('LIQUIDACIÓN'),
      'liquidacion',
      'Should handle uppercase with accents'
    );
    assert.strictEqual(
      normalizeCategorySlug('Monitores'),
      'monitores',
      'Should normalize Monitores'
    );
    assert.strictEqual(
      normalizeCategorySlug('Accesorios'),
      'accesorios',
      'Should normalize Accesorios'
    );
    assert.strictEqual(
      normalizeCategorySlug('Ofertas'),
      'ofertas',
      'Should normalize Ofertas'
    );

    // Verify KNOWN_CATEGORIES entries
    const knownSlugs = Object.keys(KNOWN_CATEGORIES);
    assert.ok(knownSlugs.includes('estaciones-de-trabajo'));
    assert.ok(knownSlugs.includes('monitores'));
    assert.ok(knownSlugs.includes('accesorios'));
    assert.ok(knownSlugs.includes('ofertas'));
    assert.ok(knownSlugs.includes('liquidacion'));

    // Check category info helper
    const infoLiquidacion = getCategoryInfo('liquidacion');
    assert.strictEqual(infoLiquidacion.name, 'Liquidación');
    assert.ok(infoLiquidacion.metaTitle.includes('Liquidación'));

    const infoWorkstations = getCategoryInfo('estaciones-de-trabajo');
    assert.strictEqual(infoWorkstations.name, 'Estaciones de Trabajo');

    console.log('✅ Slug normalization and category mapping verified.');
  }

  // =========================================================================
  // 2. Category Filtering across seed products
  // =========================================================================
  console.log('\n--- Test 2: Category Product Filtering ---');
  {
    const workstations = filterProductsByCategory(allProducts, 'estaciones-de-trabajo');
    assert.ok(workstations.length >= 1, 'Should find at least 1 workstation');

    const monitors = filterProductsByCategory(allProducts, 'monitores');
    assert.ok(monitors.length >= 1, 'Should find at least 1 monitor');

    const accessories = filterProductsByCategory(allProducts, 'accesorios');
    assert.ok(accessories.length >= 1, 'Should find at least 1 accessory');

    const offers = filterProductsByCategory(allProducts, 'ofertas');
    assert.ok(offers.length >= 1, 'Should find at least 1 offer');

    const liquidations = filterProductsByCategory(allProducts, 'liquidacion');
    assert.ok(liquidations.length >= 1, 'Should find at least 1 liquidation product');

    // Case-insensitive & accent-insensitive query match
    const liquidationsAccent = filterProductsByCategory(allProducts, 'Liquidación');
    assert.strictEqual(
      liquidationsAccent.length,
      liquidations.length,
      'Filtering with accented slug should yield identical results'
    );

    console.log('✅ Category product filtering verified for all 5 categories.');
  }

  // =========================================================================
  // 3. Home Page SSR
  // =========================================================================
  console.log('\n--- Test 3: Home Page SSR Component ---');
  {
    assert.ok(homeMeta.title, 'Home page must have metadata title');
    const { metadata: rootMeta } = await import('../src/app/layout');
    assert.ok(
      resolveTitle(rootMeta.title, homeMeta.title).includes('NovaWorkstations'),
      'Metadata title must include NovaWorkstations'
    );

    const homeElement = await HomePage();
    assert.ok(homeElement, 'HomePage must return a valid React element');
    assert.ok(React.isValidElement(homeElement), 'HomePage output must be a valid React element');

    console.log('✅ Home Page SSR component verified.');
  }

  // =========================================================================
  // 4. Category Page SSR & Dynamic Metadata
  // =========================================================================
  console.log('\n--- Test 4: Category Page SSR & Metadata ---');
  {
    // Test with Promise params (Next.js 15 App Router convention)
    const categoryElement = await CategoryPage({
      params: Promise.resolve({ slug: 'estaciones-de-trabajo' }),
    });
    assert.ok(categoryElement, 'CategoryPage must render for estaciones-de-trabajo');
    assert.ok(React.isValidElement(categoryElement));

    const categoryPromiseElement = await CategoryPage({
      params: Promise.resolve({ slug: 'liquidacion' }),
    });
    assert.ok(categoryPromiseElement, 'CategoryPage must handle Promise params');

    // Test metadata generation
    const meta = await generateCategoryMetadata({
      params: Promise.resolve({ slug: 'monitores' }),
    });
    assert.ok(meta.title, 'Category metadata must include title');
    assert.ok(
      String(meta.title).includes('Monitores'),
      'Category metadata title must include category name'
    );

    // Test empty category
    const emptyCategoryElement = await CategoryPage({
      params: Promise.resolve({ slug: 'categoria-inexistente' }),
    });
    assert.ok(
      emptyCategoryElement,
      'CategoryPage must render empty state gracefully for non-matching category'
    );

    console.log('✅ Category Page SSR and metadata verified.');
  }

  // =========================================================================
  // 5. Product Detail Page SSR, Metadata & Not Found
  // =========================================================================
  console.log('\n--- Test 5: Product Detail Page SSR ---');
  {
    const sampleProduct = allProducts[0];
    assert.ok(sampleProduct, 'Need sample product from seed');

    // Render product detail page
    const detailElement = await ProductDetailPage({
      params: Promise.resolve({ slug: sampleProduct.slug }),
    });
    assert.ok(detailElement, 'ProductDetailPage must render');
    assert.ok(React.isValidElement(detailElement));

    // Generate metadata
    const detailMeta = await generateProductMetadata({
      params: Promise.resolve({ slug: sampleProduct.slug }),
    });
    assert.ok(detailMeta.title, 'Product metadata must have title');
    assert.ok(
      String(detailMeta.title).includes(sampleProduct.title),
      `Metadata title must contain product title: ${sampleProduct.title}`
    );
    assert.ok(detailMeta.openGraph, 'Product metadata must have OpenGraph');

    // Verify notFound on invalid slug
    let caughtNotFound = false;
    try {
      await ProductDetailPage({
        params: Promise.resolve({ slug: 'slug-completamente-inexistente-12345' }),
      });
    } catch (err: any) {
      caughtNotFound =
        err?.digest === 'NEXT_HTTP_ERROR_FALLBACK;404' ||
        err?.message === 'NEXT_NOT_FOUND' ||
        err?.digest === 'NEXT_NOT_FOUND' ||
        String(err).includes('404');
    }
    assert.ok(caughtNotFound, 'ProductDetailPage must call notFound() when slug does not exist');

    console.log('✅ Product Detail Page SSR, metadata and notFound verified.');
  }

  // =========================================================================
  // 6. Reusable Components (ProductCard)
  // =========================================================================
  console.log('\n--- Test 6: Reusable Components (ProductCard) ---');
  {
    const sampleProduct = allProducts[0];

    const cardElement = ProductCard({ product: sampleProduct });
    assert.ok(cardElement, 'ProductCard must return React element');
    assert.ok(React.isValidElement(cardElement));

    // Also test rendering ProductCard to static HTML
    const { renderToStaticMarkup } = await import('react-dom/server');
    const cardHtml = renderToStaticMarkup(cardElement);
    assert.ok(cardHtml.includes(sampleProduct.title), 'Card HTML must include product title');
    assert.ok(cardHtml.includes(sampleProduct.brand), 'Card HTML must include product brand');
    assert.ok(cardHtml.includes(sampleProduct.shipping_text), 'Card HTML must include shipping text');
    assert.ok(!cardHtml.includes('Agregar al Carrito'), 'Card HTML must not offer a cart');

    console.log('✅ ProductCard rendering verified.');
  }

  // =========================================================================
  // 7. SEO template fixes: canonical, titles, og:type, JSON-LD (NL-3)
  // =========================================================================
  console.log('\n--- Test 7: SEO templates (canonical, titles, og:type, JSON-LD) ---');
  {
    const { metadata: rootMeta } = await import('../src/app/layout');
    const RootLayout = (await import('../src/app/layout')).default;

    // 7.1 Root layout: no canonical inherited by deeper pages, fake SearchAction removed
    assert.ok(
      !(rootMeta.alternates && (rootMeta.alternates as any).canonical),
      'Root layout must not set a canonical that deeper pages would inherit'
    );
    const layoutTree = await RootLayout({ children: null });
    const layoutLd = getJsonLdBlocks(layoutTree);
    assert.strictEqual(layoutLd.length, 1, 'Layout must emit exactly one store JSON-LD block');
    assert.strictEqual(layoutLd[0]['@type'], 'ComputerStore');
    assert.strictEqual(layoutLd[0].name, STORE_NAME);
    assert.ok(layoutLd[0].address && layoutLd[0].currenciesAccepted, 'Store JSON-LD must keep its other data');
    assert.ok(!('potentialAction' in layoutLd[0]), 'Fake SearchAction must be removed');
    assert.ok(!JSON.stringify(layoutLd[0]).includes('SearchAction'), 'No SearchAction anywhere in the store JSON-LD');

    // 7.2 Home: self canonical (static metadata, base resolved at import) + store name exactly once
    const staticSite = (process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_SITE_URL).replace(/\/+$/, '');
    assert.strictEqual((homeMeta.alternates as any)?.canonical, `${staticSite}/`, 'Home must canonicalise to itself');
    {
      const homeTitle = resolveTitle(rootMeta.title, homeMeta.title);
      assert.strictEqual(countOccurrences(homeTitle, STORE_NAME), 1, `Home title must contain the store name once: ${homeTitle}`);
    }

    for (const siteUrl of [undefined, 'https://shop.example.test/']) {
      const site = (siteUrl ?? FALLBACK_SITE_URL).replace(/\/+$/, '');
      await withSiteUrl(siteUrl, async () => {
        // 7.3 Product pages
        for (const product of allProducts) {
          const meta = await generateProductMetadata({ params: Promise.resolve({ slug: product.slug }) });
          const expectedUrl = `${site}/productos/${product.slug}`;
          assert.strictEqual((meta.alternates as any)?.canonical, expectedUrl, `Product canonical (${product.slug})`);

          const title = resolveTitle(rootMeta.title, meta.title);
          assert.strictEqual(title, `${product.title} | ${STORE_NAME}`, 'Product title: store name exactly once');
          const ogTitle = String((meta.openGraph as any)?.title);
          assert.strictEqual(countOccurrences(ogTitle, STORE_NAME), 1, `og:title must hold the store name once: ${ogTitle}`);
          assert.strictEqual((meta.openGraph as any)?.url, expectedUrl, 'og:url must match the canonical');
          assert.strictEqual((meta.openGraph as any)?.type, undefined, 'openGraph.type must not emit a second og:type');
          assert.ok(!(meta.other && 'og:type' in (meta.other as object)), 'og:type must be emitted only once');

          const tree = await ProductDetailPage({ params: Promise.resolve({ slug: product.slug }) });
          const ogTypes = findElements(tree, (el) => el.type === 'meta' && el.props?.property === 'og:type');
          assert.strictEqual(ogTypes.length, 1, 'Product page must emit exactly one og:type');
          assert.strictEqual(ogTypes[0].props.content, 'product', 'Product og:type must be "product"');

          const crumbs = getJsonLdBlocks(tree).filter((b) => b['@type'] === 'BreadcrumbList');
          assert.strictEqual(crumbs.length, 1, 'Product page must emit one BreadcrumbList');
          const items = crumbs[0].itemListElement;
          assert.deepStrictEqual(
            items.map((i: any) => [i.position, i.name, i.item]),
            [
              [1, 'Inicio', `${site}/`],
              [2, product.category, `${site}/categoria/${normalizeCategorySlug(product.category)}`],
              [3, product.title, expectedUrl],
            ],
            'BreadcrumbList must be Inicio > Category > Product with absolute URLs'
          );
          const nav = findElements(tree, (el) => el.type === 'nav' && el.props?.['aria-label'] === 'Breadcrumb');
          assert.strictEqual(nav.length, 1);
          assert.deepStrictEqual(
            textLeaves(nav[0]),
            ['Inicio', product.category, product.title],
            'Visible breadcrumb must match the JSON-LD'
          );
        }

        // 7.4 Category pages
        for (const cat of Object.values(KNOWN_CATEGORIES)) {
          const meta = await generateCategoryMetadata({ params: Promise.resolve({ slug: cat.slug }) });
          const expectedUrl = `${site}/categoria/${cat.slug}`;
          assert.strictEqual((meta.alternates as any)?.canonical, expectedUrl, `Category canonical (${cat.slug})`);
          const title = resolveTitle(rootMeta.title, meta.title);
          assert.strictEqual(countOccurrences(title, STORE_NAME), 1, `Category title must hold the store name once: ${title}`);
          const ogTitle = String((meta.openGraph as any)?.title);
          assert.strictEqual(countOccurrences(ogTitle, STORE_NAME), 1, `Category og:title once: ${ogTitle}`);
          assert.strictEqual((meta.openGraph as any)?.url, expectedUrl);

          const tree = await CategoryPage({ params: Promise.resolve({ slug: cat.slug }) });
          const crumbs = getJsonLdBlocks(tree).filter((b) => b['@type'] === 'BreadcrumbList');
          assert.strictEqual(crumbs.length, 1, 'Category page must emit one BreadcrumbList');
          assert.deepStrictEqual(
            crumbs[0].itemListElement.map((i: any) => [i.position, i.name, i.item]),
            [
              [1, 'Inicio', `${site}/`],
              [2, cat.name, expectedUrl],
            ],
            'Category BreadcrumbList must be Inicio > Category'
          );
          const nav = findElements(tree, (el) => el.type === 'nav' && el.props?.['aria-label'] === 'Breadcrumb');
          assert.deepStrictEqual(textLeaves(nav[0]), ['Inicio', cat.name], 'Visible breadcrumb must match the JSON-LD');
        }

        // 7.5 Unknown category (graceful fallback) keeps the same contract
        const fallbackMeta = await generateCategoryMetadata({ params: Promise.resolve({ slug: 'categoria-inexistente' }) });
        assert.strictEqual((fallbackMeta.alternates as any)?.canonical, `${site}/categoria/categoria-inexistente`);
        assert.strictEqual(
          countOccurrences(resolveTitle(rootMeta.title, fallbackMeta.title), STORE_NAME),
          1,
          'Fallback category title must hold the store name once'
        );

        // 7.6 Not-found product title must not double the suffix either
        const missing = await generateProductMetadata({ params: Promise.resolve({ slug: 'no-existe-xyz' }) });
        assert.strictEqual(countOccurrences(resolveTitle(rootMeta.title, missing.title), STORE_NAME), 1);
      });
    }

    console.log('✅ Canonical, single-suffix titles, og:type product, BreadcrumbList and store JSON-LD verified.');
  }

  console.log('\n🎉 ALL CATALOG & PRODUCT DETAIL SSR TESTS PASSED SUCCESSFULLY!\n');
}

testCatalogSsr().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
