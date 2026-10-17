import http from 'http';
import assert from 'assert';
import {
  getProducts,
  updateProduct,
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

    // Clean up store settings
    await updateStoreSettings({
      webhook_url_product_updated: null,
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
