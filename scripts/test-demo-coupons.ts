// Demo coupons: the seed no longer creates coupons; stores that still hold the old rows are migrated
// by an additive rename (legacy codes -> DEMO- codes) and then a retirement (deactivated, demo text
// replaced) on the JSON fallback side. The storefront shows none of them; the admin still lists them.
// The Postgres side lives in test-demo-coupons-pg.ts (it needs a faked pool before the import).
require.extensions['.css'] = () => {};

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import React from 'react';
(global as any).React = React;
import { initialProducts, initialPromotions, initialStoreSettings } from '../src/lib/seed-data';
import type { Promotion } from '../src/types/database';

const NEW_ESTUDIO = 'DEMO-ESTUDIO10';
const NEW_BLACKFRIDAY = 'DEMO-BLACKFRIDAY15';
const OLD_ESTUDIO = 'ESTUDIO10';
const OLD_BLACKFRIDAY = 'BLACKFRIDAY15';
const OLD_ESTUDIO_DESCRIPTION =
  '10% de descuento directo en estaciones de trabajo y monitores aplicando el código en el carrito.';
const OLD_BLACKFRIDAY_DESCRIPTION = '15% de descuento en equipos seleccionados del 20 al 30 de noviembre.';

const DEMO_ESTUDIO_DESCRIPTION =
  '10% de descuento en estaciones de trabajo y monitores con el código DEMO-ESTUDIO10. Cupón de demostración: no es canjeable en ninguna tienda real.';
const DEMO_BLACKFRIDAY_DESCRIPTION =
  '15% de descuento en equipos seleccionados del 20 al 30 de noviembre con el código DEMO-BLACKFRIDAY15. Cupón de demostración: no es canjeable en ninguna tienda real.';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

/** The two rows the seed used to create, as stores that ran it still hold them. */
function demoPromotions(): Promotion[] {
  const row = (id: string, code: string, description: string, value: number): Promotion => ({
    id,
    code,
    name: `Demo ${code}`,
    description,
    discount_type: 'percentage',
    discount_value: value,
    min_purchase_amount: 300,
    applies_to_category: null,
    starts_at: '2026-10-01T00:00:00Z',
    ends_at: '2026-12-31T23:59:59Z',
    is_active: true,
    created_at: '2026-10-16T12:00:00.000Z',
  });
  return [
    row('b0000000-0000-4000-8000-000000000001', NEW_ESTUDIO, DEMO_ESTUDIO_DESCRIPTION, 10),
    row('b0000000-0000-4000-8000-000000000002', NEW_BLACKFRIDAY, DEMO_BLACKFRIDAY_DESCRIPTION, 15),
  ];
}

function legacyPromotions(): Promotion[] {
  const promos = demoPromotions();
  promos[0].code = OLD_ESTUDIO;
  promos[0].description = OLD_ESTUDIO_DESCRIPTION;
  promos[1].code = OLD_BLACKFRIDAY;
  promos[1].description = OLD_BLACKFRIDAY_DESCRIPTION;
  return promos;
}

function adminPromo(code: string, description = 'Created by an admin.'): Promotion {
  return {
    id: `c0000000-0000-4000-8000-${code.length.toString().padStart(12, '0')}`,
    code,
    name: `Admin ${code}`,
    description,
    discount_type: 'fixed',
    discount_value: 25,
    min_purchase_amount: 0,
    applies_to_category: null,
    starts_at: '2026-01-01T00:00:00Z',
    ends_at: '2026-12-31T23:59:59Z',
    is_active: true,
    created_at: '2026-10-01T00:00:00.000Z',
  };
}

async function run() {
  console.log('🧪 Starting Demo Coupon Code Tests...');

  // ---------------------------------------------------------------------
  // 1. Seed
  // ---------------------------------------------------------------------
  console.log('\n--- Test 1: the seed creates no coupons ---');
  {
    assert.deepStrictEqual(initialPromotions, []);
    assert.strictEqual(initialProducts.length, 12, 'the products are untouched');
    console.log('✅ The seed has no coupons.');
  }

  // ---------------------------------------------------------------------
  // 2. The pure rename: matching rules and idempotency
  // ---------------------------------------------------------------------
  // db.ts resolves its data directory when it is first imported: set up the temp cwd before that.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-demo-coupons-'));
  const originalCwd = process.cwd();
  fs.mkdirSync(path.join(tmp, 'data'));
  const dbFile = path.join(tmp, 'data', 'db.json');
  const stored = [...legacyPromotions(), adminPromo('VERANO20')];
  fs.writeFileSync(
    dbFile,
    JSON.stringify(
      { products: initialProducts, promotions: stored, orders: [], store_settings: initialStoreSettings },
      null,
      2
    )
  );
  process.chdir(tmp);
  const db = await import('../src/lib/db');

  console.log('\n--- Test 2: rename rules ---');
  {
    assert.deepStrictEqual(
      db.LEGACY_DEMO_COUPON_RENAMES.map((r) => [r.from, r.to]),
      [
        [OLD_ESTUDIO, NEW_ESTUDIO],
        [OLD_BLACKFRIDAY, NEW_BLACKFRIDAY],
      ]
    );

    // Old -> new, description refreshed only because it still is the old seed text.
    const fresh = legacyPromotions();
    assert.strictEqual(db.renameLegacyDemoCoupons(fresh), true);
    assert.deepStrictEqual(fresh.map((p) => p.code), [NEW_ESTUDIO, NEW_BLACKFRIDAY]);
    assert.strictEqual(fresh[0].description, DEMO_ESTUDIO_DESCRIPTION);
    assert.strictEqual(fresh[1].description, DEMO_BLACKFRIDAY_DESCRIPTION);
    // Everything else on the row is untouched, ids included.
    const demo = demoPromotions();
    for (const i of [0, 1]) {
      assert.deepStrictEqual(fresh[i], demo[i], 'only code and the untouched seed description change');
    }

    // Idempotent: the second run changes nothing and reports nothing.
    const snapshot = clone(fresh);
    assert.strictEqual(db.renameLegacyDemoCoupons(fresh), false, 'second run reports no change');
    assert.deepStrictEqual(fresh, snapshot);

    // An edited description is never overwritten.
    const edited = legacyPromotions();
    edited[0].description = 'Texto editado por un administrador.';
    edited[1].description = '15% off, editado a mano.';
    assert.strictEqual(db.renameLegacyDemoCoupons(edited), true);
    assert.deepStrictEqual(edited.map((p) => p.code), [NEW_ESTUDIO, NEW_BLACKFRIDAY]);
    assert.strictEqual(edited[0].description, 'Texto editado por un administrador.');
    assert.strictEqual(edited[1].description, '15% off, editado a mano.');

    // Matching is by the old code only: other rows, even look-alikes, are left alone.
    const mixed = [...legacyPromotions(), adminPromo('VERANO20'), adminPromo('ESTUDIO10-EXTRA'), adminPromo('MIESTUDIO10')];
    const mixedBefore = clone(mixed.slice(2));
    db.renameLegacyDemoCoupons(mixed);
    assert.deepStrictEqual(mixed.slice(2), mixedBefore, 'admin-created promotions are not touched');
    assert.deepStrictEqual(mixed.slice(0, 2).map((p) => p.code), [NEW_ESTUDIO, NEW_BLACKFRIDAY]);

    // Only unrelated promotions: nothing changes.
    const unrelated = [adminPromo('VERANO20'), adminPromo('OTOÑO5')];
    const unrelatedBefore = clone(unrelated);
    assert.strictEqual(db.renameLegacyDemoCoupons(unrelated), false);
    assert.deepStrictEqual(unrelated, unrelatedBefore);

    // The new code already exists: both rows stay exactly as they are.
    for (const [oldCode, newCode] of [
      [OLD_ESTUDIO, NEW_ESTUDIO],
      [OLD_BLACKFRIDAY, NEW_BLACKFRIDAY],
    ]) {
      const both = [adminPromo(oldCode, 'old row'), adminPromo(newCode, 'new row')];
      both[1].id = 'c0000000-0000-4000-8000-0000000000ff';
      const bothBefore = clone(both);
      assert.strictEqual(db.renameLegacyDemoCoupons(both), false, `${newCode} exists: no rename`);
      assert.deepStrictEqual(both, bothBefore, `${oldCode} and ${newCode} are both left untouched`);
    }

    // The check is case-insensitive like the rest of the coupon lookups.
    const lower = [adminPromo('estudio10', OLD_ESTUDIO_DESCRIPTION)];
    assert.strictEqual(db.renameLegacyDemoCoupons(lower), true);
    assert.strictEqual(lower[0].code, NEW_ESTUDIO);
    const lowerBoth = [adminPromo('estudio10'), adminPromo('demo-estudio10')];
    assert.strictEqual(db.renameLegacyDemoCoupons(lowerBoth), false, 'a lowercase new code counts as existing');
    console.log('✅ Rename is old-code-only, keeps edits, skips when the new code exists and is idempotent.');
  }

  // ---------------------------------------------------------------------
  // 2b. The pure retirement: matching rules and idempotency
  // ---------------------------------------------------------------------
  console.log('\n--- Test 2b: retirement rules ---');
  {
    assert.deepStrictEqual(db.DEMO_COUPON_DESCRIPTIONS, {
      [NEW_ESTUDIO]: DEMO_ESTUDIO_DESCRIPTION,
      [NEW_BLACKFRIDAY]: DEMO_BLACKFRIDAY_DESCRIPTION,
    });
    assert.ok(!/demostraci[oó]n|DEMO-|\d+\s*%/i.test(db.RETIRED_DEMO_COUPON_DESCRIPTION), 'the retired text names no code and no discount');

    // Both demo rows: deactivated, demo text replaced, everything else untouched.
    const rows = demoPromotions();
    assert.strictEqual(db.retireDemoCoupons(rows), true);
    const demo = demoPromotions();
    for (const i of [0, 1]) {
      assert.deepStrictEqual(rows[i], { ...demo[i], is_active: false, description: db.RETIRED_DEMO_COUPON_DESCRIPTION });
    }

    // Runs once: a row an admin turns back on afterwards stays on.
    rows[0].is_active = true;
    const snapshot = clone(rows);
    assert.strictEqual(db.retireDemoCoupons(rows), false, 'second run reports no change');
    assert.deepStrictEqual(rows, snapshot, 'the re-activated row is left on');

    // An edited description means an admin owns the row: it is left alone.
    const edited = demoPromotions();
    edited[0].description = 'Texto editado por un administrador.';
    assert.strictEqual(db.retireDemoCoupons(edited), true);
    assert.strictEqual(edited[0].is_active, true);
    assert.strictEqual(edited[0].description, 'Texto editado por un administrador.');
    assert.strictEqual(edited[1].is_active, false, 'the untouched demo row is still retired');

    // Matching needs both the demo code (case-insensitive) and its exact demo text.
    const lower = demoPromotions();
    lower[0].code = 'demo-estudio10';
    assert.strictEqual(db.retireDemoCoupons(lower), true);
    assert.strictEqual(lower[0].is_active, false);
    const swapped = [adminPromo('VERANO20', DEMO_ESTUDIO_DESCRIPTION), adminPromo(NEW_ESTUDIO), adminPromo('OTOÑO5')];
    const swappedBefore = clone(swapped);
    assert.strictEqual(db.retireDemoCoupons(swapped), false, 'demo text on another code, or a demo code with other text, is not retired');
    assert.deepStrictEqual(swapped, swappedBefore);

    // Nothing is deleted.
    const counted = [...demoPromotions(), adminPromo('VERANO20')];
    db.retireDemoCoupons(counted);
    assert.strictEqual(counted.length, 3);
    console.log('✅ Retirement deactivates only the untouched demo rows, deletes nothing and runs once.');
  }

  // ---------------------------------------------------------------------
  // 3. JSON fallback end to end (fresh process state, temp cwd)
  // ---------------------------------------------------------------------
  console.log('\n--- Test 3: JSON store migrates on first read and persists ---');
  try {
    const freshDb = db;
    const promos = await freshDb.getPromotions();
    assert.deepStrictEqual(
      promos.map((p: Promotion) => p.code).sort(),
      [NEW_BLACKFRIDAY, NEW_ESTUDIO, 'VERANO20'].sort()
    );
    assert.ok(await freshDb.getPromotionByCode(NEW_ESTUDIO), 'the new code resolves');
    assert.strictEqual(await freshDb.getPromotionByCode(OLD_ESTUDIO), null, 'the old code no longer resolves');

    const onDisk = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
    assert.deepStrictEqual(
      onDisk.promotions.map((p: Promotion) => p.code),
      [NEW_ESTUDIO, NEW_BLACKFRIDAY, 'VERANO20'],
      'the rename is persisted, order and the admin row preserved'
    );
    assert.strictEqual(onDisk.promotions[2].description, 'Created by an admin.');
    assert.strictEqual(onDisk.promotions[2].is_active, true, 'the admin row stays active');
    assert.strictEqual(onDisk.promotions[0].id, 'b0000000-0000-4000-8000-000000000001', 'ids are stable');
    for (const row of onDisk.promotions.slice(0, 2)) {
      assert.strictEqual(row.is_active, false, `${row.code}: renamed, then retired`);
      assert.strictEqual(row.description, db.RETIRED_DEMO_COUPON_DESCRIPTION, `${row.code}: carries the retired text`);
    }

    const again = await freshDb.getPromotions();
    assert.deepStrictEqual(again, promos, 'a second read is a no-op');
    console.log('✅ The JSON store renames and retires on first read, persists, keeps admin rows and is idempotent.');

    // ---------------------------------------------------------------
    // 4. The storefront shows no retired coupon; the admin still lists them
    // ---------------------------------------------------------------
    console.log('\n--- Test 4: promotions page hides the retired coupons, admin lists them ---');
    {
      const { renderToStaticMarkup } = await import('react-dom/server');
      // Offline: no test reaches the BCRP.
      (await import('../src/lib/exchange-rate')).__setRateTestHooks({
        fetch: async () => {
          throw new Error('offline test');
        },
      });
      const Promociones = (await import('../src/app/promociones/page')).default;
      const html = renderToStaticMarkup((await Promociones()) as React.ReactElement);
      assert.ok(!/ESTUDIO10|BLACKFRIDAY15/.test(html), 'the promotions page shows none of the retired codes');
      assert.ok(!/demostraci[oó]n|canjeable/i.test(html), 'no demo or unredeemable-coupon wording');
      assert.ok(html.includes('VERANO20'), 'an active admin coupon is still listed');
      assert.ok(!/carrito/i.test(html.replace(/<[^>]+>/g, ' ')), 'no promotion text sends people to a cart');

      const AdminPage = (await import('../src/app/admin/promociones/page')).default;
      const adminHtml = renderToStaticMarkup((await AdminPage()) as React.ReactElement);
      assert.ok(adminHtml.includes(NEW_ESTUDIO) && adminHtml.includes(NEW_BLACKFRIDAY), 'admin lists the new codes');
      assert.ok(!/(?<!DEMO-)\bESTUDIO10\b/.test(adminHtml), 'no bare ESTUDIO10 in the admin');
      assert.ok(!/(?<!DEMO-)\bBLACKFRIDAY15\b/.test(adminHtml), 'no bare BLACKFRIDAY15 in the admin');
      console.log('✅ The storefront hides the retired coupons; the admin still lists them to turn back on.');
    }
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  console.log('\n🎉 ALL DEMO COUPON TESTS PASSED SUCCESSFULLY! 🎉\n');
}

run().catch((err) => {
  console.error('❌ Demo coupon test failed with error:', err);
  process.exit(1);
});
