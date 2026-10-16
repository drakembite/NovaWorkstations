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
import { AddToCartButton } from '../src/components/AddToCartButton';

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
    assert.ok(
      String(homeMeta.title).includes('NovaWorkstations'),
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
  // 6. Reusable Components (ProductCard & AddToCartButton)
  // =========================================================================
  console.log('\n--- Test 6: Reusable Components (ProductCard & AddToCartButton) ---');
  {
    const sampleProduct = allProducts[0];

    const cardElement = ProductCard({ product: sampleProduct });
    assert.ok(cardElement, 'ProductCard must return React element');
    assert.ok(React.isValidElement(cardElement));

    // AddToCartButton is a client component ('use client'). Validate element creation.
    const cartButtonElement = React.createElement(AddToCartButton, {
      product: sampleProduct,
      showQuantitySelector: true,
    });
    assert.ok(React.isValidElement(cartButtonElement), 'AddToCartButton element must be valid');

    const compactButtonElement = React.createElement(AddToCartButton, {
      product: sampleProduct,
      compact: true,
    });
    assert.ok(React.isValidElement(compactButtonElement), 'Compact AddToCartButton element must be valid');

    // Also test rendering ProductCard to static HTML
    const { renderToStaticMarkup } = await import('react-dom/server');
    const cardHtml = renderToStaticMarkup(cardElement);
    assert.ok(cardHtml.includes(sampleProduct.title), 'Card HTML must include product title');
    assert.ok(cardHtml.includes(sampleProduct.brand), 'Card HTML must include product brand');
    assert.ok(cardHtml.includes(sampleProduct.shipping_text), 'Card HTML must include shipping text');

    // Render AddToCartButton to static HTML
    const buttonHtml = renderToStaticMarkup(cartButtonElement);
    assert.ok(buttonHtml.includes('Agregar al Carrito'), 'AddToCartButton HTML must include action text');
    assert.ok(buttonHtml.includes('Cantidad:'), 'AddToCartButton with quantity selector must render quantity label');

    console.log('✅ ProductCard and AddToCartButton rendering verified.');
  }

  console.log('\n🎉 ALL CATALOG & PRODUCT DETAIL SSR TESTS PASSED SUCCESSFULLY!\n');
}

testCatalogSsr().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
