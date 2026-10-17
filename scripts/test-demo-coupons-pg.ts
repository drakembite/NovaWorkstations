// Verifies the PostgreSQL side of the demo coupon rename against a recording fake pool
// (no real database, no network): guarded, additive, old-code-only and non-destructive.
process.env.DATABASE_URL = 'postgresql://fake:fake@127.0.0.1:1/fake';

import assert from 'assert';
import { initialPromotions } from '../src/lib/seed-data';

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

const OLD_ESTUDIO_DESCRIPTION =
  '10% de descuento directo en estaciones de trabajo y monitores aplicando el código en el carrito.';
const OLD_BLACKFRIDAY_DESCRIPTION = '15% de descuento en equipos seleccionados del 20 al 30 de noviembre.';

async function run() {
  console.log('🧪 Starting Demo Coupon PostgreSQL Tests (fake pool)...');
  const db = await import('../src/lib/db');
  await db.getPromotions();

  const squash = (s: string) => s.replace(/\s+/g, ' ').trim();
  const renames = executed.filter((e) => /UPDATE promotions/i.test(e.sql));

  console.log('\n--- Test 1: one guarded UPDATE per demo coupon, after the schema exists ---');
  {
    assert.strictEqual(renames.length, 2, 'exactly one rename statement per demo coupon');
    const createIdx = executed.findIndex((e) => /CREATE TABLE IF NOT EXISTS promotions/i.test(e.sql));
    assert.ok(createIdx >= 0, 'promotions table is created');
    for (const r of renames) {
      assert.ok(executed.indexOf(r) > createIdx, 'rename runs after the promotions table exists');
    }
    const params = renames.map((r) => r.params);
    assert.deepStrictEqual(params[0]!.slice(0, 2), ['DEMO-ESTUDIO10', 'ESTUDIO10']);
    assert.deepStrictEqual(params[1]!.slice(0, 2), ['DEMO-BLACKFRIDAY15', 'BLACKFRIDAY15']);
    assert.ok(params[0]!.includes(initialPromotions[0].description), 'ESTUDIO carries the new seed description');
    assert.ok(params[0]!.includes(OLD_ESTUDIO_DESCRIPTION), 'ESTUDIO only refreshes the exact old seed text');
    assert.ok(params[1]!.includes(initialPromotions[1].description), 'BLACKFRIDAY carries the new seed description');
    assert.ok(params[1]!.includes(OLD_BLACKFRIDAY_DESCRIPTION), 'BLACKFRIDAY only refreshes the exact old seed text');
    console.log('✅ Two renames, ordered after CREATE TABLE.');
  }

  console.log('\n--- Test 2: the statement is old-code-only, skips when the new code exists, keeps edits ---');
  {
    for (const r of renames) {
      const sql = squash(r.sql);
      assert.ok(/SET code = \$1/i.test(sql), 'sets the new code');
      assert.ok(/WHERE UPPER\(legacy\.code\) = \$2/i.test(sql), 'matches the OLD code only');
      assert.ok(
        /AND NOT EXISTS \(SELECT 1 FROM promotions AS existing WHERE UPPER\(existing\.code\) = \$5\)/i.test(sql),
        'does nothing when a row already has the new code'
      );
      assert.strictEqual(r.params![4], r.params![0], '$5 is the new code, the same value as $1');
      assert.ok(
        /description = CASE WHEN legacy\.description = \$3 THEN \$4 ELSE legacy\.description END/i.test(sql),
        'description only changes when it still is the exact old seed text'
      );
      assert.ok(!/WHERE[^;]*\bid\b/i.test(sql), 'never matches by id');
      assert.ok(!/\b(name|discount_value|discount_type|starts_at|ends_at|is_active|min_purchase_amount)\s*=/i.test(sql), 'touches only code and description');
    }
    console.log('✅ Guarded by the old code and by the absence of the new one.');
  }

  console.log('\n--- Test 3: nothing destructive, no seed re-insert ---');
  {
    for (const e of executed) {
      const sql = squash(e.sql);
      assert.ok(!/\bDROP\b/i.test(sql), 'no DROP');
      assert.ok(!/\bTRUNCATE\b/i.test(sql), 'no TRUNCATE');
      assert.ok(!/DELETE FROM promotions/i.test(sql), 'no DELETE on promotions');
    }
    console.log('✅ Migration is additive.');
  }

  console.log('\n🎉 ALL DEMO COUPON POSTGRESQL TESTS PASSED SUCCESSFULLY! 🎉\n');
}

run().catch((err) => {
  console.error('❌ Demo coupon PostgreSQL test failed with error:', err);
  process.exit(1);
});
