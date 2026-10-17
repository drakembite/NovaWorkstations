// Verifies the PostgreSQL side of the buy link feature against a recording fake pool
// (no real database, no network): additive schema, seed inserts and the non-destructive backfill.
process.env.DATABASE_URL = 'postgresql://fake:fake@127.0.0.1:1/fake';

import assert from 'assert';
import { initialProducts } from '../src/lib/seed-data';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pg = require('pg');

interface Executed {
  sql: string;
  params?: any[];
}
const executed: Executed[] = [];

const fakeQuery = async (sql: string, params?: any[]) => {
  executed.push({ sql, params });
  if (/SELECT COUNT\(\*\)/i.test(sql)) return { rows: [{ count: '0' }], rowCount: 1 };
  return { rows: [], rowCount: 0 };
};
pg.Pool.prototype.connect = async () => ({ query: fakeQuery, release() {} });
pg.Pool.prototype.query = fakeQuery;
pg.Pool.prototype.on = function () {
  return this;
};

async function run() {
  console.log('🧪 Starting Buy Link PostgreSQL Schema Tests (fake pool)...');
  const db = await import('../src/lib/db');
  await db.getProducts();

  const sqls = executed.map((e) => e.sql.replace(/\s+/g, ' '));
  const indexOf = (re: RegExp) => sqls.findIndex((s) => re.test(s));

  console.log('\n--- Test 1: additive, idempotent migration ---');
  {
    const addUrl = indexOf(/ALTER TABLE products ADD COLUMN IF NOT EXISTS buy_url TEXT/i);
    const addStore = indexOf(/ALTER TABLE products ADD COLUMN IF NOT EXISTS buy_store/i);
    const addNote = indexOf(/ALTER TABLE products ADD COLUMN IF NOT EXISTS buy_note TEXT/i);
    assert.ok(addNote >= 0, 'buy_note column is added with ADD COLUMN IF NOT EXISTS');
    assert.ok(addUrl >= 0, 'buy_url column is added with ADD COLUMN IF NOT EXISTS');
    assert.ok(addStore >= 0, 'buy_store column is added with ADD COLUMN IF NOT EXISTS');
    const firstInsert = indexOf(/INSERT INTO products/i);
    assert.ok(firstInsert > addUrl && firstInsert > addStore && firstInsert > addNote, 'columns exist before any product is inserted');
    for (const s of sqls) {
      assert.ok(!/\bDROP\b/i.test(s), `migration must not drop anything: ${s.slice(0, 60)}`);
      assert.ok(!/\bTRUNCATE\b/i.test(s), 'migration must not truncate');
    }
    console.log('✅ buy_url and buy_store are added additively before seeding.');
  }

  console.log('\n--- Test 2: seed inserts carry the buy fields ---');
  {
    const inserts = executed.filter((e) => /INSERT INTO products/i.test(e.sql));
    assert.strictEqual(inserts.length, 12);
    for (const ins of inserts) {
      assert.ok(/buy_url/.test(ins.sql) && /buy_store/.test(ins.sql), 'INSERT lists buy_url and buy_store');
      assert.ok(/buy_note/.test(ins.sql), 'INSERT lists buy_note');
    }
    const dell = initialProducts.find((p) => p.sku === 'VS-DELL-U27')!;
    const dellInsert = inserts.find((i) => i.params?.includes('VS-DELL-U27'))!;
    assert.ok(dellInsert.params!.includes(dell.buy_url), 'Dell INSERT carries its URL');
    assert.ok(dellInsert.params!.includes(dell.buy_store), 'Dell INSERT carries its store');
    const msi = initialProducts.find((p) => p.sku === 'VS-MSI-Z16P')!;
    const msiInsert = inserts.find((i) => i.params?.includes('VS-MSI-Z16P'))!;
    assert.ok(msi.buy_url && msiInsert.params!.includes(msi.buy_url), 'MSI INSERT carries its (approximate) URL');
    assert.ok(msi.buy_note && msiInsert.params!.includes(msi.buy_note), 'MSI INSERT carries its note');
    assert.strictEqual(initialProducts.filter((p) => p.buy_url).length, 12, 'all twelve seed products are linked');
    assert.strictEqual(inserts.filter((i) => i.params?.some((v) => typeof v === 'string' && v.startsWith('https://') && /amazon|falabella/.test(v))).length, 12, 'every INSERT carries a link');
    const benq = initialProducts.find((p) => p.sku === 'VS-BENQ-PD32')!;
    const benqInsert = inserts.find((i) => i.params?.includes('VS-BENQ-PD32'))!;
    assert.ok(benq.buy_note && benqInsert.params!.includes(benq.buy_note), 'BenQ INSERT carries its note');
    console.log('✅ Fresh databases are seeded with the links.');
  }

  console.log('\n--- Test 3: non-destructive backfill ---');
  {
    const updates = executed.filter((e) => /UPDATE products/i.test(e.sql) && /buy_url/.test(e.sql));
    const linked = initialProducts.filter((p) => p.buy_url);
    assert.strictEqual(updates.length, linked.length, 'one guarded backfill UPDATE per linked seed product');
    for (const u of updates) {
      const sql = u.sql.replace(/\s+/g, ' ');
      assert.ok(/buy_url = COALESCE\(NULLIF\(buy_url, ''\), \$1\)/.test(sql), 'buy_url keeps any non-empty stored value');
      assert.ok(/buy_store = COALESCE\(NULLIF\(buy_store, ''\), \$2\)/.test(sql), 'buy_store keeps any non-empty stored value');
      assert.ok(/buy_note = COALESCE\(NULLIF\(buy_note, ''\), \$3\)/.test(sql), 'buy_note keeps any non-empty stored value');
      assert.ok(/WHERE sku = \$4/.test(sql), 'backfill is scoped to one SKU');
      assert.ok(!/updated_at/.test(sql), 'backfill does not touch updated_at');
    }
    for (const p of linked) {
      const match = updates.find((u) => u.params?.[3] === p.sku);
      assert.ok(match, `backfill exists for ${p.sku}`);
      assert.deepStrictEqual(match!.params, [p.buy_url, p.buy_store, p.buy_note, p.sku]);
    }
    console.log('✅ Backfill only fills null/empty values and never overwrites an edit.');
  }

  console.log('\n--- Test 4: outbound_clicks table and insert (first party, minimal) ---');
  {
    const create = sqls.find((s) => /CREATE TABLE IF NOT EXISTS outbound_clicks/i.test(s));
    assert.ok(create, 'outbound_clicks is created additively');
    for (const col of ['sku', 'target_url', 'attribution_data', 'created_at']) {
      assert.ok(new RegExp(`\\b${col}\\b`).test(create!), `outbound_clicks has ${col}`);
    }
    assert.ok(!/\b(ip|ip_address|user_agent|email)\b/i.test(create!), 'no personal data columns');

    executed.length = 0;
    const click = await db.createOutboundClick({
      sku: 'VS-ANKER-778',
      target_url: 'https://www.amazon.com/dp/X',
      attribution_data: { utm_source: 'chatgpt.com' },
    });
    const insert = executed.find((e) => /INSERT INTO outbound_clicks/i.test(e.sql));
    assert.ok(insert, 'createOutboundClick inserts into outbound_clicks');
    assert.ok(insert!.params!.includes('VS-ANKER-778') && insert!.params!.includes('https://www.amazon.com/dp/X'));
    assert.ok(insert!.params!.includes(JSON.stringify({ utm_source: 'chatgpt.com' })));
    assert.ok(click.id && click.created_at, 'returns the stored record');
    console.log('✅ outbound_clicks is additive and stores only sku, target, attribution and time.');
  }

  console.log('\n🎉 ALL BUY LINK POSTGRESQL TESTS PASSED SUCCESSFULLY! 🎉\n');
}

run().catch((err) => {
  console.error('❌ Buy link PostgreSQL test failed with error:', err);
  process.exit(1);
});
