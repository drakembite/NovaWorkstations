// A failing legacy coupon rename must never take the database down: init logs a warning, carries on
// and the store keeps using Postgres (no silent fallback to the local JSON store). Fake pool, no network.
process.env.DATABASE_URL = 'postgresql://fake:fake@127.0.0.1:1/fake';

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pg = require('pg');

interface Executed {
  sql: string;
  params?: any[];
}
const executed: Executed[] = [];

const fakeQuery = async (sql: string, params?: any[]) => {
  executed.push({ sql, params });
  if (/UPDATE promotions/i.test(sql)) {
    throw new Error('rename failed on the server');
  }
  if (/SELECT COUNT\(\*\)/i.test(sql)) return { rows: [{ count: '0' }], rowCount: 1 };
  return { rows: [], rowCount: 0 };
};
pg.Pool.prototype.connect = async () => ({ query: fakeQuery, release() {} });
pg.Pool.prototype.query = fakeQuery;
pg.Pool.prototype.on = function () {
  return this;
};

async function run() {
  console.log('🧪 Starting Demo Coupon Rename Failure Tests (fake pool)...');

  // Any JSON fallback would create data/db.json under this cwd: it must stay empty.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-demo-coupons-fail-'));
  const originalCwd = process.cwd();
  process.chdir(tmp);
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(' '));
  };

  try {
    const db = await import('../src/lib/db');
    const promotions = await db.getPromotions();
    console.warn = originalWarn;

    console.log('\n--- Test 1: a failing rename does not take the store down ---');
    {
      assert.ok(!warnings.some((w) => /PostgreSQL init failed/.test(w)), 'init must not report a failure');
      assert.ok(
        executed.some((e) => /SELECT \* FROM promotions/i.test(e.sql)),
        'the read goes through Postgres, not the JSON fallback'
      );
      assert.deepStrictEqual(promotions, [], 'the (faked) Postgres rows are served');
      assert.ok(!fs.existsSync(path.join(tmp, 'data')), 'no local JSON store was created');
      console.log('✅ Init stays healthy and the read uses Postgres.');
    }

    console.log('\n--- Test 2: one warning per failed rename, without parameters or secrets ---');
    {
      const renameWarnings = warnings.filter((w) => w.startsWith('[DB] legacy demo coupon rename skipped:'));
      assert.strictEqual(renameWarnings.length, 2, 'one warning per failed rename');
      assert.strictEqual(warnings.length, 2, 'nothing else is logged');
      for (const w of renameWarnings) {
        assert.ok(w.includes('rename failed on the server'), 'the error message is logged');
        for (const e of executed.filter((x) => /UPDATE promotions/i.test(x.sql))) {
          for (const p of e.params ?? []) {
            assert.ok(!w.includes(String(p)), 'SQL parameters are not logged');
          }
        }
      }
      console.log('✅ Two warnings, message only.');
    }

    console.log('\n--- Test 3: nothing else in init is skipped ---');
    {
      const attempted = executed.filter((e) => /UPDATE promotions/i.test(e.sql));
      assert.strictEqual(attempted.length, 2, 'both renames are attempted (the first failure does not stop the second)');
      const lastRename = executed.lastIndexOf(attempted[attempted.length - 1]);
      const after = executed.slice(lastRename + 1);
      assert.ok(
        after.some((e) => /SELECT COUNT\(\*\) FROM store_settings/i.test(e.sql)),
        'the settings step still runs after the failure'
      );
      assert.ok(
        after.some((e) => /INSERT INTO store_settings/i.test(e.sql)),
        'the settings seed still runs after the failure'
      );
      console.log('✅ Settings and later steps still run.');
    }
  } finally {
    console.warn = originalWarn;
    process.chdir(originalCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  console.log('\n🎉 ALL DEMO COUPON RENAME FAILURE TESTS PASSED SUCCESSFULLY! 🎉\n');
}

run().catch((err) => {
  console.error('❌ Demo coupon rename failure test failed with error:', err);
  process.exit(1);
});
