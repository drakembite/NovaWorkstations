import assert from 'assert';
import { GET as getProductsJson } from '../src/app/products.json/route';
import { GET as getApiProducts } from '../src/app/api/products/route';
import { GET as getProductBySlugJson } from '../src/app/productos/[slug].json/route';
import { GET as getSitemapXml } from '../src/app/sitemap.xml/route';
import { GET as getRobotsTxt } from '../src/app/robots.txt/route';
import { getProducts } from '../src/lib/db';

async function testEndpoints() {
  console.log('🧪 Starting Public E-Commerce Endpoints Tests...');

  const dbProducts = await getProducts();
  assert.ok(dbProducts.length >= 12, 'Must have at least 12 products in DB');

  // =========================================================================
  // 1. GET /products.json
  // =========================================================================
  console.log('\n--- Test 1: GET /products.json ---');
  {
    const req = new Request('http://localhost:3000/products.json');
    const res = await getProductsJson(req);

    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert.ok(
      res.headers.get('content-type')?.includes('application/json'),
      `Content-Type should be application/json, got ${res.headers.get('content-type')}`
    );

    const data = await res.json();
    assert.ok(Array.isArray(data.products), 'Response must have products array');
    assert.strictEqual(data.products.length, dbProducts.length, 'Products count should match DB');

    // Verify first product field requirements
    const p1 = data.products[0];
    const requiredFields = [
      'id',
      'sku',
      'slug',
      'title',
      'brand',
      'mpn',
      'barcode_ean',
      'category',
      'price',
      'compare_at_price',
      'stock_quantity',
      'in_stock',
      'short_description',
      'specs',
      'shipping_text',
      'url',
      'updated_at',
    ];

    for (const field of requiredFields) {
      assert.ok(field in p1, `Field "${field}" must exist on product JSON`);
    }

    assert.strictEqual(typeof p1.in_stock, 'boolean', 'in_stock must be a boolean');
    assert.strictEqual(p1.in_stock, p1.stock_quantity > 0, 'in_stock must match stock_quantity > 0');
    assert.strictEqual(
      p1.url,
      `http://localhost:3000/productos/${p1.slug}`,
      'url should match origin'
    );

    // Test with host and proto headers
    const reqForwarded = new Request('http://placeholder/products.json', {
      headers: {
        'x-forwarded-host': 'shop.novaworkstations.com',
        'x-forwarded-proto': 'https',
      },
    });
    const resForwarded = await getProductsJson(reqForwarded);
    const dataForwarded = await resForwarded.json();
    assert.strictEqual(
      dataForwarded.products[0].url,
      `https://shop.novaworkstations.com/productos/${p1.slug}`,
      'url should dynamically resolve from forwarded host/proto headers'
    );

    console.log(`✅ /products.json returned ${data.products.length} products with all required fields`);
  }

  // =========================================================================
  // 2. GET /api/products
  // =========================================================================
  console.log('\n--- Test 2: GET /api/products ---');
  {
    const req = new Request('https://novaworkstations.com/api/products');
    const res = await getApiProducts(req);

    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert.ok(
      res.headers.get('content-type')?.includes('application/json'),
      'Content-Type should be application/json'
    );

    const data = await res.json();
    assert.ok(Array.isArray(data.products), 'Response must have products array');
    assert.strictEqual(data.products.length, dbProducts.length);
    assert.strictEqual(
      data.products[0].url,
      `https://novaworkstations.com/productos/${data.products[0].slug}`
    );

    console.log(`✅ /api/products returned ${data.products.length} products correctly`);
  }

  // =========================================================================
  // 3. GET /productos/[slug].json
  // =========================================================================
  console.log('\n--- Test 3: GET /productos/[slug].json ---');
  {
    const testProduct = dbProducts[0];

    // Case 3a: Success with resolved params
    const req = new Request(`https://novaworkstations.com/productos/${testProduct.slug}.json`);
    const res = await getProductBySlugJson(req, {
      params: Promise.resolve({ slug: testProduct.slug }),
    });

    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert.ok(
      res.headers.get('content-type')?.includes('application/json'),
      'Content-Type should be application/json'
    );

    const data = await res.json();
    assert.ok(data.product, 'Response must include product object');
    assert.strictEqual(data.product.id, testProduct.id);
    assert.strictEqual(data.product.sku, testProduct.sku);
    assert.strictEqual(data.product.slug, testProduct.slug);
    assert.strictEqual(data.product.price, testProduct.price);
    assert.strictEqual(data.product.in_stock, testProduct.stock_quantity > 0);
    assert.strictEqual(
      data.product.url,
      `https://novaworkstations.com/productos/${testProduct.slug}`
    );

    // Verify top-level convenience fields
    assert.strictEqual(data.id, testProduct.id, 'Top-level id should match');
    assert.strictEqual(data.title, testProduct.title, 'Top-level title should match');
    assert.strictEqual(data.slug, testProduct.slug, 'Top-level slug should match');

    console.log(`✅ Found product by slug: "${testProduct.title}" (${testProduct.sku})`);

    // Case 3b: Slug parameter containing .json suffix
    const resWithSuffix = await getProductBySlugJson(req, {
      params: Promise.resolve({ slug: `${testProduct.slug}.json` }),
    });
    assert.strictEqual(resWithSuffix.status, 200);
    const dataWithSuffix = await resWithSuffix.json();
    assert.strictEqual(dataWithSuffix.product.id, testProduct.id);
    console.log('✅ Handled slug with .json extension in params');

    // Case 3c: Slug parsed from URL pathname fallback
    const reqFallback = new Request(
      `https://novaworkstations.com/productos/${testProduct.slug}.json`
    );
    const resFallback = await getProductBySlugJson(reqFallback, {
      params: Promise.resolve({}),
    });
    assert.strictEqual(resFallback.status, 200);
    const dataFallback = await resFallback.json();
    assert.strictEqual(dataFallback.product.id, testProduct.id);
    console.log('✅ Fallback to URL pathname parsing when params empty');

    // Case 3d: 404 for non-existent slug
    const req404 = new Request('https://novaworkstations.com/productos/non-existent-device.json');
    const res404 = await getProductBySlugJson(req404, {
      params: Promise.resolve({ slug: 'non-existent-device' }),
    });
    assert.strictEqual(res404.status, 404, 'Status should be 404');
    const data404 = await res404.json();
    assert.strictEqual(data404.error, 'Product not found', 'Error message must match');
    console.log('✅ 404 returned correctly with { error: "Product not found" }');
  }

  // =========================================================================
  // 4. GET /sitemap.xml
  // =========================================================================
  console.log('\n--- Test 4: GET /sitemap.xml ---');
  {
    const req = new Request('https://novaworkstations.com/sitemap.xml');
    const res = await getSitemapXml(req);

    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert.ok(
      res.headers.get('content-type')?.includes('application/xml'),
      `Content-Type should be application/xml, got ${res.headers.get('content-type')}`
    );

    const xml = await res.text();
    assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), 'Must start with XML header');
    assert.ok(
      xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'),
      'Must contain urlset namespace'
    );

    // Verify static pages
    const expectedStaticPages = [
      'https://novaworkstations.com/',
      'https://novaworkstations.com/envios-y-entregas',
      'https://novaworkstations.com/devoluciones-y-garantia',
      'https://novaworkstations.com/promociones',
      'https://novaworkstations.com/categoria/estaciones-de-trabajo',
      'https://novaworkstations.com/categoria/monitores',
      'https://novaworkstations.com/categoria/accesorios',
      'https://novaworkstations.com/categoria/ofertas',
      'https://novaworkstations.com/categoria/liquidacion',
    ];

    for (const page of expectedStaticPages) {
      assert.ok(xml.includes(`<loc>${page}</loc>`), `Sitemap must contain static page: ${page}`);
    }

    // Verify dynamic products
    for (const prod of dbProducts) {
      const prodUrl = `https://novaworkstations.com/productos/${prod.slug}`;
      assert.ok(xml.includes(`<loc>${prodUrl}</loc>`), `Sitemap must contain product: ${prodUrl}`);
      assert.ok(
        xml.includes(`<lastmod>${new Date(prod.updated_at).toISOString()}</lastmod>`),
        `Sitemap must include lastmod for product: ${prod.slug}`
      );
    }

    console.log(`✅ /sitemap.xml contains 9 static pages and ${dbProducts.length} dynamic products`);
  }

  // =========================================================================
  // 5. GET /robots.txt
  // =========================================================================
  console.log('\n--- Test 5: GET /robots.txt ---');
  {
    const req = new Request('https://novaworkstations.com/robots.txt');
    const res = await getRobotsTxt(req);

    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert.ok(
      res.headers.get('content-type')?.includes('text/plain'),
      `Content-Type should be text/plain, got ${res.headers.get('content-type')}`
    );

    const txt = await res.text();
    const requiredAgents = [
      'User-agent: *',
      'User-agent: OAI-SearchBot',
      'User-agent: ChatGPT-User',
      'User-agent: Googlebot',
      'User-agent: Google-Extended',
      'User-agent: ClaudeBot',
      'User-agent: PerplexityBot',
      'User-agent: bingbot',
    ];

    for (const agent of requiredAgents) {
      assert.ok(txt.includes(agent), `robots.txt must contain "${agent}"`);
    }

    assert.ok(txt.includes('Allow: /'), 'robots.txt must allow /');
    assert.ok(
      txt.includes('Sitemap: https://novaworkstations.com/sitemap.xml'),
      'robots.txt must specify Sitemap URL dynamically'
    );

    console.log('✅ /robots.txt allows all required AI and search crawler user-agents');
  }

  console.log('\n🎉 ALL PUBLIC E-COMMERCE ENDPOINT TESTS PASSED SUCCESSFULLY! 🎉\n');
}

testEndpoints().catch((err) => {
  console.error('❌ Endpoint test failed with error:', err);
  process.exit(1);
});
