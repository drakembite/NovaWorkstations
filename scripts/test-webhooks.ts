import http from 'http';
import assert from 'assert';
import {
  getProducts,
  updateProduct,
  createOrder,
  refundOrder,
  updateStoreSettings,
} from '../src/lib/db';

async function testWebhooks() {
  console.log('🧪 Starting Webhook Dispatch Tests...');

  const receivedEvents: Array<{ event: string; body: any }> = [];

  // 1. Create a local mock webhook server
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(raw);
        receivedEvents.push({ event: parsed.event, body: parsed });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ received: true }));
      } catch (err) {
        res.writeHead(400);
        res.end();
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;
  const webhookUrl = `http://127.0.0.1:${port}/webhook`;
  console.log(`📡 Mock webhook receiver listening at: ${webhookUrl}`);

  try {
    // 2. Configure store settings with mock webhook URL
    await updateStoreSettings({
      webhook_url_product_updated: webhookUrl,
      webhook_url_order_paid: webhookUrl,
      webhook_url_order_refunded: webhookUrl,
    });

    // 3. Trigger product update
    const products = await getProducts();
    const prod = products[0];
    await updateProduct(prod.id, { price: 1619.0 });

    // Wait a brief moment for async webhook dispatch
    await new Promise((r) => setTimeout(r, 200));

    const productEvent = receivedEvents.find((e) => e.event === 'product.updated');
    assert.ok(productEvent, 'product.updated webhook should have been received');
    assert.strictEqual(productEvent.body.product.sku, prod.sku);
    assert.strictEqual(productEvent.body.product.price, 1619.0);
    console.log(`✅ Received product.updated webhook for SKU: ${prod.sku}`);

    // 4. Trigger createOrder (order.paid)
    const newOrder = await createOrder({
      customer_name: 'Webhook Tester',
      customer_email: 'tester@example.com',
      shipping_city: 'Lima',
      shipping_address: 'Calle Las Begonias 456',
      status: 'paid',
      subtotal_amount: 1650.0,
      discount_amount: 0,
      shipping_amount: 0,
      total_paid_amount: 1650.0,
      refunded_amount: 0,
      coupon_code_used: null,
      items_json: [
        { sku: 'VS-ASUS-H7604', quantity: 1, unit_price: 1650.0 },
      ],
      attribution_data: { utm_source: 'webhook_test' },
    });

    await new Promise((r) => setTimeout(r, 200));

    const orderPaidEvent = receivedEvents.find((e) => e.event === 'order.paid');
    assert.ok(orderPaidEvent, 'order.paid webhook should have been received');
    assert.strictEqual(orderPaidEvent.body.order.id, newOrder.id);
    assert.strictEqual(orderPaidEvent.body.order.status, 'paid');
    console.log(`✅ Received order.paid webhook for Order #${orderPaidEvent.body.order.order_number}`);

    // 5. Trigger refundOrder (order.refunded)
    await refundOrder(newOrder.id, 500.0);

    await new Promise((r) => setTimeout(r, 200));

    const orderRefundedEvent = receivedEvents.find((e) => e.event === 'order.refunded');
    assert.ok(orderRefundedEvent, 'order.refunded webhook should have been received');
    assert.strictEqual(orderRefundedEvent.body.order.id, newOrder.id);
    assert.strictEqual(orderRefundedEvent.body.order.status, 'partially_refunded');
    assert.strictEqual(orderRefundedEvent.body.order.refunded_amount, 500.0);
    console.log(`✅ Received order.refunded webhook for Order #${orderRefundedEvent.body.order.order_number}`);

    // Clean up store settings
    await updateStoreSettings({
      webhook_url_product_updated: null,
      webhook_url_order_paid: null,
      webhook_url_order_refunded: null,
    });

    console.log('\n🎉 ALL WEBHOOK DISPATCH TESTS PASSED SUCCESSFULLY! 🎉\n');
  } finally {
    server.close();
  }
}

testWebhooks().catch((err) => {
  console.error('❌ Webhook test failed:', err);
  process.exit(1);
});
