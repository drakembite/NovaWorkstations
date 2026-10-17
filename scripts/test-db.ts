import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  getProducts,
  getProductBySlug,
  getProductById,
  updateProduct,
  getPromotions,
  getPromotionByCode,
  createPromotion,
  togglePromotion,
  getStoreSettings,
  updateStoreSettings,
} from '../src/lib/db';

async function runTests() {
  console.log('🧪 Starting Database Abstraction Layer Tests...');

  // 1. Verify Seed Initialization & Products
  console.log('\n--- Test 1: Seed & getProducts() ---');
  const products = await getProducts();
  assert.strictEqual(products.length, 12, `Expected 12 products, got ${products.length}`);
  console.log(`✅ Loaded ${products.length} products from seed data.`);

  // Verify first product data structure
  const firstProd = products[0];
  assert.ok(firstProd.id, 'Product id is required');
  assert.ok(firstProd.sku, 'Product sku is required');
  assert.ok(firstProd.slug, 'Product slug is required');
  assert.ok(typeof firstProd.price === 'number', 'Product price must be a number');
  assert.ok(!firstProd.image_url.includes('['), 'Product image_url must not have markdown brackets');
  console.log(`✅ Verified product schema integrity on: "${firstProd.title}"`);

  // 2. getProductBySlug
  console.log('\n--- Test 2: getProductBySlug() ---');
  const msi = await getProductBySlug('laptop-msi-creator-z16p-i7');
  assert.ok(msi !== null, 'Product should be found by slug');
  assert.strictEqual(msi?.sku, 'VS-MSI-Z16P');
  console.log(`✅ getProductBySlug found: ${msi.title} (${msi.sku})`);

  // 3. getProductById
  console.log('\n--- Test 3: getProductById() ---');
  const foundById = await getProductById(msi.id);
  assert.strictEqual(foundById?.slug, msi.slug);
  console.log(`✅ getProductById matched slug: ${foundById?.slug}`);

  // 4. updateProduct
  console.log('\n--- Test 4: updateProduct() ---');
  const oldPrice = msi.price;
  const newPrice = 1599.99;
  const updatedProd = await updateProduct(msi.id, { price: newPrice, stock_quantity: 15 });
  assert.ok(updatedProd !== null, 'Product update should return updated product');
  assert.strictEqual(updatedProd?.price, newPrice);
  assert.strictEqual(updatedProd?.stock_quantity, 15);
  assert.notStrictEqual(updatedProd?.updated_at, msi.updated_at);
  console.log(`✅ Updated product price from ${oldPrice} to ${updatedProd?.price}`);

  // Restore price
  await updateProduct(msi.id, { price: oldPrice, stock_quantity: msi.stock_quantity });

  // 5. Promotions
  console.log('\n--- Test 5: Promotions ---');
  const promos = await getPromotions();
  assert.ok(promos.length >= 2, `Expected at least 2 promotions, got ${promos.length}`);
  console.log(`✅ Found ${promos.length} promotions`);

  const code10 = await getPromotionByCode('demo-estudio10'); // Case insensitive check
  assert.ok(code10 !== null, 'Should find promotion by code case-insensitively');
  assert.strictEqual(code10?.discount_value, 10);
  console.log(`✅ Found promo code ${code10?.code} with ${code10?.discount_value}% discount`);

  const newPromo = await createPromotion({
    code: 'TESTCODE20',
    name: 'Test Coupon 20',
    description: 'Testing promo creation',
    discount_type: 'percentage',
    discount_value: 20,
    min_purchase_amount: 100,
    applies_to_category: null,
    starts_at: '2026-10-01T00:00:00Z',
    ends_at: '2026-12-31T23:59:59Z',
    is_active: true,
  });
  assert.strictEqual(newPromo.code, 'TESTCODE20');
  console.log(`✅ Created test promo: ${newPromo.code}`);

  const toggled = await togglePromotion(newPromo.id, false);
  assert.strictEqual(toggled?.is_active, false);
  console.log(`✅ Toggled promo active status to false`);

  // 6. Store Settings
  console.log('\n--- Test 6: Store Settings ---');
  const settings = await getStoreSettings();
  assert.strictEqual(settings.store_name, 'NovaWorkstations');
  console.log(`✅ Store name is correctly: ${settings.store_name}`);

  const updatedSettings = await updateStoreSettings({
    custom_head_script: '<!-- test script -->',
  });
  assert.strictEqual(updatedSettings.custom_head_script, '<!-- test script -->');
  console.log(`✅ Updated store settings: custom_head_script set`);

  // 7. Verify db.json file exists
  console.log('\n--- Test 7: Physical DB file check ---');
  const dbFile = path.join(process.cwd(), 'data', 'db.json');
  assert.ok(fs.existsSync(dbFile), 'data/db.json should exist');
  const fileContent = fs.readFileSync(dbFile, 'utf8');
  const parsed = JSON.parse(fileContent);
  assert.strictEqual(parsed.products.length, 12);
  console.log(`✅ data/db.json verified on disk with ${parsed.products.length} products.`);

  console.log('\n🎉 ALL DATABASE ABSTRACTION LAYER TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
