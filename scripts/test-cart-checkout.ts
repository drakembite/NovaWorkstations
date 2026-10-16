import assert from 'assert';
import { POST as validateCoupon } from '../src/app/api/promotions/validate/route';
import { POST as createOrderApi, GET as getOrdersApi } from '../src/app/api/orders/route';
import { getOrderById, getPromotionByCode } from '../src/lib/db';
import { getCartFromCookies } from '../src/lib/cart';

async function runCartCheckoutTests() {
  console.log('🧪 Starting Cart & Checkout Integration Tests...\n');

  // =========================================================================
  // 1. Coupon Validation API Tests (/api/promotions/validate)
  // =========================================================================
  console.log('--- Test 1: Coupon Validation Endpoint ---');

  // 1.1 Valid coupon ESTUDIO10 with eligible subtotal
  {
    const req = new Request('http://localhost:3000/api/promotions/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'ESTUDIO10',
        subtotal: 500.0,
      }),
    });

    const res = await validateCoupon(req);
    assert.strictEqual(res.status, 200, 'Valid coupon response should have HTTP 200');

    const data = await res.json();
    assert.strictEqual(data.valid, true, 'Coupon ESTUDIO10 should be valid');
    assert.strictEqual(data.promotion.code, 'ESTUDIO10', 'Promotion code should match');
    assert.strictEqual(data.discount_amount, 50.0, '10% of 500 should be 50.00');
    assert.ok(data.message.includes('ESTUDIO10'), 'Message should acknowledge applied coupon');
    console.log('✅ Valid coupon ESTUDIO10 (10% on $500 -> $50 discount) verified.');
  }

  // 1.2 Case insensitive code matching ('estudio10')
  {
    const req = new Request('http://localhost:3000/api/promotions/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: '  estudio10  ',
        subtotal: 1000.0,
      }),
    });

    const res = await validateCoupon(req);
    const data = await res.json();
    assert.strictEqual(data.valid, true, 'estudio10 (lowercase) should be normalized and valid');
    assert.strictEqual(data.discount_amount, 100.0, '10% of 1000 should be 100.00');
    console.log('✅ Lowercase & trimmed coupon code normalization verified.');
  }

  // 1.3 Minimum purchase requirement check
  {
    const req = new Request('http://localhost:3000/api/promotions/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'ESTUDIO10',
        subtotal: 150.0, // ESTUDIO10 requires min 300.00
      }),
    });

    const res = await validateCoupon(req);
    const data = await res.json();
    assert.strictEqual(data.valid, false, 'Subtotal $150 should not meet min purchase $300');
    assert.ok(
      data.message.toLowerCase().includes('mínimo'),
      `Message should mention minimum purchase, got: "${data.message}"`
    );
    console.log('✅ Minimum purchase amount constraint ($300 min) correctly enforced.');
  }

  // 1.4 Non-existent coupon check
  {
    const req = new Request('http://localhost:3000/api/promotions/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'CUPON_FANTASMA_99',
        subtotal: 500.0,
      }),
    });

    const res = await validateCoupon(req);
    const data = await res.json();
    assert.strictEqual(data.valid, false, 'Non-existent coupon must be marked invalid');
    assert.ok(
      data.message.toLowerCase().includes('no existe') || data.message.toLowerCase().includes('inválido'),
      'Should report that coupon does not exist'
    );
    console.log('✅ Non-existent coupon rejection verified.');
  }

  // 1.5 Missing code parameter
  {
    const req = new Request('http://localhost:3000/api/promotions/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subtotal: 500.0,
      }),
    });

    const res = await validateCoupon(req);
    assert.strictEqual(res.status, 400, 'Missing coupon code should return HTTP 400');
    const data = await res.json();
    assert.strictEqual(data.valid, false);
    console.log('✅ Missing coupon code returns 400 Bad Request.');
  }

  // =========================================================================
  // 2. Order Creation API Tests (/api/orders)
  // =========================================================================
  console.log('\n--- Test 2: Order Creation Endpoint ---');

  // 2.1 Order creation with coupon, free shipping (>= 150), and attribution cookies
  let createdOrderId: string = '';
  let createdOrderNumber: number = 0;
  {
    const attributionCookie = encodeURIComponent(
      JSON.stringify({
        utm_source: 'linkedin_ads',
        utm_medium: 'cpc',
        utm_campaign: 'cad_workstations_2026',
        aic_src: 'engineering-partner',
        landing_page: 'http://localhost:3000/productos/laptop-msi-creator-z16p-i7',
      })
    );

    const req = new Request('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `nw_attribution=${attributionCookie}`,
      },
      body: JSON.stringify({
        customer_name: 'Guillermo Arévalo',
        customer_email: 'guillermo.arevalo@estudio3d.pe',
        shipping_city: 'Lima',
        shipping_address: 'Av. Las Begonias 441, San Isidro',
        items: [
          {
            sku: 'VS-MSI-Z16P',
            title: 'Laptop MSI Creator Z16P',
            quantity: 1,
            unit_price: 1599.99,
          },
        ],
        coupon_code_used: 'ESTUDIO10',
        // Notice: attribution_data omitted in body to verify cookie fallback!
      }),
    });

    const res = await createOrderApi(req);
    assert.strictEqual(res.status, 201, 'Order creation should return HTTP 201');

    const data = await res.json();
    assert.strictEqual(data.success, true, 'Order creation must succeed');
    assert.ok(data.order, 'Order object must be returned');

    const order = data.order;
    createdOrderId = order.id;
    createdOrderNumber = order.order_number;

    assert.strictEqual(order.customer_name, 'Guillermo Arévalo');
    assert.strictEqual(order.customer_email, 'guillermo.arevalo@estudio3d.pe');
    assert.strictEqual(order.shipping_city, 'Lima');
    assert.strictEqual(order.status, 'paid', 'Initial order status must be paid');
    assert.ok(order.order_number >= 1000, `Order number ${order.order_number} should be >= 1000`);

    // Financial calculations:
    // Subtotal: 1599.99
    // Coupon ESTUDIO10 (10%): 159.999 -> 160.00
    // Shipping: Free ($0.00 because subtotal >= 150)
    // Total: 1599.99 - 160.00 + 0 = 1439.99
    assert.strictEqual(order.subtotal_amount, 1599.99, 'Subtotal should be 1599.99');
    assert.strictEqual(order.discount_amount, 160.0, 'Discount 10% of 1599.99 should be 160.00');
    assert.strictEqual(order.shipping_amount, 0.0, 'Shipping must be 0 for subtotal >= 150');
    assert.strictEqual(order.total_paid_amount, 1439.99, 'Total paid amount should be 1439.99');
    assert.strictEqual(order.coupon_code_used, 'ESTUDIO10');

    // Attribution fallback verification
    assert.ok(order.attribution_data, 'Attribution data must be present on order');
    assert.strictEqual(
      order.attribution_data.utm_source,
      'linkedin_ads',
      'utm_source must be extracted from cookie'
    );
    assert.strictEqual(
      order.attribution_data.aic_src,
      'engineering-partner',
      'aic_src must be extracted from cookie'
    );

    console.log(`✅ Order #${order.order_number} created with 'paid' status, discount, and cookie attribution.`);
  }

  // 2.2 Verify order in physical database
  {
    const dbOrder = await getOrderById(createdOrderId);
    assert.ok(dbOrder, 'Order must be retrievable from database by ID');
    assert.strictEqual(dbOrder.order_number, createdOrderNumber);
    assert.strictEqual(dbOrder.status, 'paid');
    assert.strictEqual(dbOrder.items_json.length, 1);
    assert.strictEqual(dbOrder.items_json[0].sku, 'VS-MSI-Z16P');
    console.log('✅ Physical database persistence verified for newly created order.');
  }

  // 2.3 Order with subtotal < $150 (standard shipping cost $15.00 applies)
  {
    const req = new Request('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'Beatriz Soler',
        customer_email: 'beatriz.soler@gmail.com',
        shipping_city: 'Cusco',
        shipping_address: 'Calle Santa Clara 210',
        items: [
          {
            sku: 'ACC-CABLE-DP',
            title: 'Cable DisplayPort 2.1 8K',
            quantity: 2,
            unit_price: 35.0, // 2 * 35 = 70.00 (< 150)
          },
        ],
      }),
    });

    const res = await createOrderApi(req);
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    const order = data.order;

    assert.strictEqual(order.subtotal_amount, 70.0);
    assert.strictEqual(order.shipping_amount, 15.0, 'Shipping cost should be 15.00 for subtotal < 150');
    assert.strictEqual(order.discount_amount, 0.0);
    assert.strictEqual(order.total_paid_amount, 85.0, 'Total should be 70 + 15 = 85.00');
    console.log('✅ Order with subtotal < $150 correctly applied standard $15.00 shipping fee.');
  }

  // 2.4 Missing required fields validation
  {
    const req = new Request('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: '',
        customer_email: 'invalid-email',
        shipping_city: '',
        shipping_address: '',
        items: [],
      }),
    });

    const res = await createOrderApi(req);
    assert.strictEqual(res.status, 400, 'Invalid payload should return HTTP 400');
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.ok(data.error, 'Error message must be returned');
    console.log('✅ Order validation correctly rejected invalid/empty order payload.');
  }

  // 2.5 GET /api/orders endpoint returns orders
  {
    const res = await getOrdersApi();
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.orders), 'Must return orders array');
    assert.ok(
      data.orders.some((o: any) => o.id === createdOrderId),
      'Recently created order must appear in GET /api/orders'
    );
    console.log(`✅ GET /api/orders successfully returned ${data.orders.length} orders.`);
  }

  // =========================================================================
  // 3. Cart Cookie Sync Helper Tests
  // =========================================================================
  console.log('\n--- Test 3: Cart Cookie Parsing ---');
  {
    const sampleItems = [
      {
        id: 'item-1',
        sku: 'VS-MSI-Z16P',
        slug: 'laptop-msi-creator-z16p-i7',
        title: 'Laptop MSI Creator Z16P',
        price: 1599.99,
        quantity: 2,
      },
    ];
    const cookieHeader = `nw_cart=${encodeURIComponent(JSON.stringify(sampleItems))}; other=123`;
    const parsedItems = getCartFromCookies(cookieHeader);

    assert.strictEqual(parsedItems.length, 1);
    assert.strictEqual(parsedItems[0].sku, 'VS-MSI-Z16P');
    assert.strictEqual(parsedItems[0].quantity, 2);
    console.log('✅ Cart cookie parsing verified via getCartFromCookies.');
  }

  console.log('\n🎉 ALL CART & CHECKOUT INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runCartCheckoutTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
