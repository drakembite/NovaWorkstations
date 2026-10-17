// Demo coupon codes: the seed carries the DEMO- prefixed codes, existing stores are migrated by an
// additive rename (JSON fallback side), and the storefront and admin render the new codes.
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

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

function legacyPromotions(): Promotion[] {
  const promos = clone(initialPromotions);
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
  console.log('\n--- Test 1: seed has exactly the two DEMO- codes and no cart wording ---');
  {
    assert.deepStrictEqual(initialPromotions.map((p) => p.code), [NEW_ESTUDIO, NEW_BLACKFRIDAY]);
    for (const p of initialPromotions) {
      assert.ok(!/carrito/i.test(p.description), `${p.code}: description must not mention a cart`);
      assert.ok(!/carrito/i.test(p.name), `${p.code}: name must not mention a cart`);
      assert.ok(p.description.includes(p.code), `${p.code}: description names its own code`);
      assert.ok(/demostraci[oó]n/i.test(p.description), `${p.code}: description says it is a demonstration coupon`);
      assert.ok(/no es canjeable/i.test(p.description), `${p.code}: description says it cannot be redeemed`);
    }
    const [estudio, black] = initialPromotions;
    assert.strictEqual(estudio.discount_value, 10);
    assert.strictEqual(black.discount_value, 15);
    assert.strictEqual(black.starts_at, '2026-11-20T00:00:00Z');
    assert.strictEqual(black.ends_at, '2026-11-30T23:59:59Z');
    assert.ok(/15%/.test(black.description) && /20 al 30 de noviembre/.test(black.description), 'BLACKFRIDAY keeps its percentage and dates');
    assert.ok(/10%/.test(estudio.description), 'ESTUDIO keeps its percentage');
    assert.strictEqual(initialProducts.length, 12, 'the products are untouched');
    console.log('✅ Seed carries DEMO-ESTUDIO10 and DEMO-BLACKFRIDAY15 and nothing about a cart.');
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
    assert.strictEqual(fresh[0].description, initialPromotions[0].description);
    assert.strictEqual(fresh[1].description, initialPromotions[1].description);
    // Everything else on the row is untouched, ids included.
    for (const i of [0, 1]) {
      const { code: _c, description: _d, ...rest } = fresh[i];
      const { code: _c2, description: _d2, ...restSeed } = initialPromotions[i];
      assert.deepStrictEqual(rest, restSeed, 'only code and the untouched seed description change');
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
    assert.strictEqual(onDisk.promotions[0].id, initialPromotions[0].id, 'ids are stable');

    const again = await freshDb.getPromotions();
    assert.deepStrictEqual(again, promos, 'a second read is a no-op');
    console.log('✅ The JSON store renames on first read, persists, keeps admin rows and is idempotent.');

    // ---------------------------------------------------------------
    // 4. Storefront and admin render the new codes
    // ---------------------------------------------------------------
    console.log('\n--- Test 4: promotions page and admin render the DEMO- codes ---');
    {
      const { renderToStaticMarkup } = await import('react-dom/server');
      const Promociones = (await import('../src/app/promociones/page')).default;
      const html = renderToStaticMarkup((await Promociones()) as React.ReactElement);
      assert.ok(html.includes(NEW_ESTUDIO), 'promotions page lists DEMO-ESTUDIO10');
      assert.ok(html.includes(NEW_BLACKFRIDAY), 'promotions page lists DEMO-BLACKFRIDAY15 (card and event)');
      assert.ok(!/(?<!DEMO-)\bESTUDIO10\b/.test(html), 'no bare ESTUDIO10 on the promotions page');
      assert.ok(!/(?<!DEMO-)\bBLACKFRIDAY15\b/.test(html), 'no bare BLACKFRIDAY15 on the promotions page');
      assert.ok(!/carrito/i.test(html.replace(/<[^>]+>/g, ' ')), 'no promotion text sends people to a cart');

      const AdminPage = (await import('../src/app/admin/promociones/page')).default;
      const adminHtml = renderToStaticMarkup((await AdminPage()) as React.ReactElement);
      assert.ok(adminHtml.includes(NEW_ESTUDIO) && adminHtml.includes(NEW_BLACKFRIDAY), 'admin lists the new codes');
      assert.ok(!/(?<!DEMO-)\bESTUDIO10\b/.test(adminHtml), 'no bare ESTUDIO10 in the admin');
      assert.ok(!/(?<!DEMO-)\bBLACKFRIDAY15\b/.test(adminHtml), 'no bare BLACKFRIDAY15 in the admin');

      const { COMMERCIAL_EVENTS } = await import('../src/lib/promo-events');
      const blackEvent = COMMERCIAL_EVENTS.find((e) => /Black Friday/.test(e.title))!;
      assert.ok(blackEvent.description.includes(NEW_BLACKFRIDAY), 'the Black Friday event names the DEMO- code');
      assert.ok(!/(?<!DEMO-)BLACKFRIDAY15/.test(blackEvent.description));
      console.log('✅ Storefront and admin show only the DEMO- codes.');
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
