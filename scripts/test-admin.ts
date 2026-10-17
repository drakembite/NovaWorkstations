import assert from 'assert';
import http from 'http';
import { AddressInfo } from 'net';
import { PATCH as updateProductApi, GET as getProductApi } from '../src/app/api/admin/products/[id]/route';
import { GET as getProductsApi } from '../src/app/api/admin/products/route';
import { POST as createPromotionApi, GET as getPromotionsApi } from '../src/app/api/admin/promotions/route';
import { PATCH as togglePromotionApi } from '../src/app/api/admin/promotions/[id]/route';
import { GET as getSettingsApi, PUT as updateSettingsApi } from '../src/app/api/admin/settings/route';
import { POST as testWebhookApi } from '../src/app/api/admin/webhooks/test/route';
import { getProducts } from '../src/lib/db';

async function runAdminTests() {
  console.log('🧪 Starting NovaWorkstations Admin API & Feature Tests...\n');

  // =========================================================================
  // 1. Product Inline Update API (/api/admin/products/[id])
  // =========================================================================
  console.log('--- Test 1: Product Inline Update Endpoint ---');
  {
    const products = await getProducts();
    assert.ok(products.length > 0, 'Database should contain products');
    const target = products[0];
    const prevUpdatedAt = target.updated_at;

    // Small delay to ensure timestamp advances
    await new Promise((r) => setTimeout(r, 20));

    const newPrice = 2199.99;
    const newStock = 7;
    const newCompareAt = 2499.00;
    const newCategory = 'estaciones-de-trabajo';
    const newShortDesc = 'Descripción editada en prueba unitaria de panel de administración.';

    const patchReq = new Request(`http://localhost:3000/api/admin/products/${target.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        price: newPrice,
        compare_at_price: newCompareAt,
        stock_quantity: newStock,
        category: newCategory,
        short_description: newShortDesc,
      }),
    });

    const patchRes = await updateProductApi(patchReq, {
      params: Promise.resolve({ id: target.id }),
    });

    assert.strictEqual(patchRes.status, 200, 'PATCH should return HTTP 200');
    const updated = await patchRes.json();

    assert.strictEqual(updated.id, target.id);
    assert.strictEqual(updated.price, newPrice, 'Price should be updated');
    assert.strictEqual(updated.compare_at_price, newCompareAt, 'Compare at price should be updated');
    assert.strictEqual(updated.stock_quantity, newStock, 'Stock quantity should be updated');
    assert.strictEqual(updated.category, newCategory, 'Category should be updated');
    assert.strictEqual(updated.short_description, newShortDesc, 'Short description should be updated');
    assert.notStrictEqual(updated.updated_at, prevUpdatedAt, 'updated_at timestamp must change');

    // Test GET /api/admin/products/[id]
    const getReq = new Request(`http://localhost:3000/api/admin/products/${target.id}`);
    const getRes = await getProductApi(getReq, {
      params: Promise.resolve({ id: target.id }),
    });
    assert.strictEqual(getRes.status, 200);
    const fetched = await getRes.json();
    assert.strictEqual(fetched.price, newPrice);

    // Test invalid product ID -> 404
    const notFoundReq = new Request('http://localhost:3000/api/admin/products/non-existent-uuid', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 100 }),
    });
    const notFoundRes = await updateProductApi(notFoundReq, {
      params: Promise.resolve({ id: 'non-existent-uuid' }),
    });
    assert.strictEqual(notFoundRes.status, 404, 'Non-existent ID must return 404');

    // Test GET /api/admin/products list route
    const listRes = await getProductsApi();
    assert.strictEqual(listRes.status, 200);
    const allProducts = await listRes.json();
    assert.ok(Array.isArray(allProducts) && allProducts.length >= 12);

    console.log('✅ Product inline update, timestamp change, and list endpoints verified.');
  }

  // =========================================================================
  // 2. Promotions Management (/api/admin/promotions)
  // =========================================================================
  console.log('\n--- Test 2: Promotions Creation and Status Toggle ---');
  {
    const uniqueCode = `ADMTEST_${Date.now()}`;
    const createReq = new Request('http://localhost:3000/api/admin/promotions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: uniqueCode,
        name: 'Descuento Admin Test Suite',
        description: 'Cupón generado para validación de API',
        discount_type: 'percentage',
        discount_value: 20,
        min_purchase_amount: 100,
        applies_to_category: 'estaciones-de-trabajo',
        starts_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + 86400000 * 15).toISOString(),
        is_active: true,
      }),
    });

    const createRes = await createPromotionApi(createReq);
    assert.strictEqual(createRes.status, 201, 'POST /api/admin/promotions should return 201');
    const created = await createRes.json();
    assert.strictEqual(created.code, uniqueCode);
    assert.strictEqual(created.discount_value, 20);
    assert.strictEqual(created.is_active, true);

    // Duplicate code must return 409 Conflict
    const dupReq = new Request('http://localhost:3000/api/admin/promotions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: uniqueCode,
        name: 'Descuento Duplicado Test',
        discount_type: 'percentage',
        discount_value: 10,
      }),
    });
    const dupRes = await createPromotionApi(dupReq);
    assert.strictEqual(dupRes.status, 409, 'Duplicate promo code must return 409 Conflict');

    // Test toggle status via PATCH /api/admin/promotions/[id]
    const toggleReq = new Request(`http://localhost:3000/api/admin/promotions/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: false }),
    });
    const toggleRes = await togglePromotionApi(toggleReq, {
      params: Promise.resolve({ id: created.id }),
    });
    assert.strictEqual(toggleRes.status, 200, 'Toggle status should return 200');
    const toggled = await toggleRes.json();
    assert.strictEqual(toggled.is_active, false, 'Promo is_active must now be false');

    // GET all promotions
    const getPromosRes = await getPromotionsApi();
    assert.strictEqual(getPromosRes.status, 200);
    const promoList = await getPromosRes.json();
    assert.ok(promoList.some((p: any) => p.code === uniqueCode));

    console.log('✅ Promotion creation, conflict handling, and active toggling verified.');
  }

  // =========================================================================
  // 3. Store Settings API (/api/admin/settings)
  // =========================================================================
  console.log('\n--- Test 3: Store Settings Update Endpoint ---');
  {
    // Update settings
    const updateReq = new Request('http://localhost:3000/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        store_name: 'NovaWorkstations Engineering',
        custom_head_script: '<script src="https://example.com/admin-test.js" async></script>',
        webhook_url_product_updated: 'https://webhook.site/admin-test-product',
      }),
    });

    const updateRes = await updateSettingsApi(updateReq);
    assert.strictEqual(updateRes.status, 200, 'PUT /api/admin/settings must return 200');
    const updatedSettings = await updateRes.json();
    assert.strictEqual(updatedSettings.store_name, 'NovaWorkstations Engineering');
    assert.strictEqual(
      updatedSettings.custom_head_script,
      '<script src="https://example.com/admin-test.js" async></script>'
    );
    assert.strictEqual(
      updatedSettings.webhook_url_product_updated,
      'https://webhook.site/admin-test-product'
    );

    // Verify GET /api/admin/settings reflects updates
    const getRes = await getSettingsApi();
    assert.strictEqual(getRes.status, 200);
    const currentSettings = await getRes.json();
    assert.strictEqual(currentSettings.store_name, 'NovaWorkstations Engineering');

    // Restore store_name to NovaWorkstations and webhook URLs to null
    const restoreReq = new Request('http://localhost:3000/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        store_name: 'NovaWorkstations',
        custom_head_script: null,
        webhook_url_product_updated: null,
      }),
    });
    const restoreRes = await updateSettingsApi(restoreReq);
    assert.strictEqual(restoreRes.status, 200);

    console.log('✅ Store settings retrieval and update endpoints verified.');
  }

  // =========================================================================
  // 4. Webhook Test Dispatcher (/api/admin/webhooks/test)
  // =========================================================================
  console.log('\n--- Test 4: Webhook Dispatch Tester Endpoint ---');
  {
    // Set up local mock server to receive test webhook
    let receivedPayload: any = null;
    const mockServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        receivedPayload = JSON.parse(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ received: true }));
      });
    });

    await new Promise<void>((resolve) => {
      mockServer.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (mockServer.address() as AddressInfo).port;
    const testUrl = `http://127.0.0.1:${port}/test-webhook`;

    try {
      // 4.1 Test product.updated
      const testReq1 = new Request('http://localhost:3000/api/admin/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'product.updated',
          url: testUrl,
        }),
      });

      const testRes1 = await testWebhookApi(testReq1);
      assert.strictEqual(testRes1.status, 200);
      const data1 = await testRes1.json();
      assert.strictEqual(data1.success, true);
      assert.strictEqual(data1.statusCode, 200);
      assert.ok(data1.latencyMs >= 0);
      assert.strictEqual(receivedPayload.event, 'product.updated');

      // 4.2 Order events no longer exist (orders were removed with the cart)
      for (const orderEvent of ['order.paid', 'order.refunded']) {
        receivedPayload = null;
        const orderRes = await testWebhookApi(
          new Request('http://localhost:3000/api/admin/webhooks/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: orderEvent, url: testUrl }),
          })
        );
        assert.strictEqual(orderRes.status, 400, `${orderEvent} must be rejected`);
        assert.strictEqual(receivedPayload, null, `${orderEvent} must not be dispatched`);
      }

      // 4.3 Test invalid event
      const testReqInvalid = new Request('http://localhost:3000/api/admin/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'invalid.event',
          url: testUrl,
        }),
      });
      const invalidRes = await testWebhookApi(testReqInvalid);
      assert.strictEqual(invalidRes.status, 400);

      console.log('✅ Webhook tester dispatched payload, verified HTTP 200 and latency metrics.');
    } finally {
      await new Promise<void>((resolve) => mockServer.close(() => resolve()));
    }
  }

  console.log('\n🎉 ALL ADMIN API & FEATURE TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runAdminTests().catch((err) => {
  console.error('❌ Admin test failed:', err);
  process.exit(1);
});
