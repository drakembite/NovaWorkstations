// Stub CSS imports for tsx execution
require.extensions['.css'] = () => {};

import assert from 'assert';
import { getAttributionFromCookies } from '../src/lib/attribution';
import { getStoreSettings, getPromotions } from '../src/lib/db';
import { CustomHeadScript } from '../src/components/CustomHeadScript';
import EnviosPage, { metadata as enviosMeta } from '../src/app/envios-y-entregas/page';
import DevolucionesGarantiaPage, { metadata as devMeta } from '../src/app/devoluciones-y-garantia/page';
import PromocionesPage, { metadata as promoMeta } from '../src/app/promociones/page';

async function testLayoutAndInfo() {
  console.log('🧪 Starting Storefront Layout, Attribution & Info Pages Tests...');

  // =========================================================================
  // 1. Attribution Cookie Parsing & Backward Compatibility
  // =========================================================================
  console.log('\n--- Test 1: Attribution Library ---');
  {
    // Empty cookie header
    const emptyResult = getAttributionFromCookies('');
    assert.deepStrictEqual(emptyResult, {}, 'Empty cookie header must return empty object');

    // nw_attribution cookie
    const nwPayload = {
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'spring_sale',
      aic_src: 'fb_ad_1',
      aic_sku: 'VS-MSI-Z16P',
      referrer: 'https://google.com',
    };
    const nwCookie = `other=123; nw_attribution=${encodeURIComponent(JSON.stringify(nwPayload))}; session=xyz`;
    const nwResult = getAttributionFromCookies(nwCookie);
    assert.strictEqual(nwResult.utm_source, 'google');
    assert.strictEqual(nwResult.utm_medium, 'cpc');
    assert.strictEqual(nwResult.utm_campaign, 'spring_sale');
    assert.strictEqual(nwResult.aic_src, 'fb_ad_1');
    assert.strictEqual(nwResult.aic_sku, 'VS-MSI-Z16P');
    assert.strictEqual(nwResult.referrer, 'https://google.com');

    // vs_attribution legacy cookie fallback
    const vsPayload = {
      utm_source: 'linkedin',
      utm_medium: 'sponsored',
      utm_campaign: 'b2b_cad',
    };
    const vsCookie = `vs_attribution=${encodeURIComponent(JSON.stringify(vsPayload))}`;
    const vsResult = getAttributionFromCookies(vsCookie);
    assert.strictEqual(vsResult.utm_source, 'linkedin');
    assert.strictEqual(vsResult.utm_medium, 'sponsored');
    assert.strictEqual(vsResult.utm_campaign, 'b2b_cad');

    // Corrupted cookie resilience
    const corruptedCookie = 'nw_attribution=invalid-json-content; other=456';
    const corruptedResult = getAttributionFromCookies(corruptedCookie);
    assert.deepStrictEqual(corruptedResult, {}, 'Corrupted JSON must not throw and return empty object');

    console.log('✅ Attribution cookie parsing and fallback verified.');
  }

  // =========================================================================
  // 2. Custom Head Script Parsing
  // =========================================================================
  console.log('\n--- Test 2: Custom Head Script Component ---');
  {
    // Null / empty script
    const nullComponent = CustomHeadScript({ script: null });
    assert.strictEqual(nullComponent, null, 'Null script should return null');

    const emptyComponent = CustomHeadScript({ script: '   ' });
    assert.strictEqual(emptyComponent, null, 'Whitespace script should return null');

    // Raw script without <script> tag
    const rawJs = 'console.log("analytics initialised");';
    const rawComponent: any = CustomHeadScript({ script: rawJs });
    assert.ok(rawComponent, 'Raw JS should render script element');
    assert.strictEqual(rawComponent.type, 'script');
    assert.strictEqual(rawComponent.props.dangerouslySetInnerHTML.__html, rawJs);

    // Script tag with src and async
    const scriptWithSrc = '<script src="https://example.com/tracker.js" async></script>';
    const srcComponent: any = CustomHeadScript({ script: scriptWithSrc });
    assert.ok(srcComponent, 'Should render parsed script element');
    // React fragment containing children
    const childScripts = srcComponent.props.children;
    assert.ok(Array.isArray(childScripts), 'Fragment should contain script children');
    assert.strictEqual(childScripts[0].props.src, 'https://example.com/tracker.js');
    assert.strictEqual(childScripts[0].props.async, true);

    // Script tag with inline content
    const scriptWithInline = '<script>window.tagData = { id: 42 };</script>';
    const inlineComponent: any = CustomHeadScript({ script: scriptWithInline });
    const inlineChildren = inlineComponent.props.children;
    assert.strictEqual(
      inlineChildren[0].props.dangerouslySetInnerHTML.__html,
      'window.tagData = { id: 42 };'
    );

    console.log('✅ CustomHeadScript parsing and injection verified.');
  }

  // =========================================================================
  // 3. Layout Metadata & Store Settings
  // =========================================================================
  console.log('\n--- Test 3: Root Layout & Metadata ---');
  {
    const { metadata: layoutMeta } = await import('../src/app/layout');
    assert.ok(layoutMeta.title, 'Root layout must have title');
    assert.ok(
      String(layoutMeta.title).includes('NovaWorkstations'),
      `Title should contain NovaWorkstations, got: ${layoutMeta.title}`
    );
    assert.ok(layoutMeta.description, 'Root layout must have description');

    const settings = await getStoreSettings();
    assert.ok(settings, 'Store settings must exist in database');
    assert.strictEqual(settings.store_name, 'NovaWorkstations');

    console.log('✅ Layout metadata and store settings verified.');
  }

  // =========================================================================
  // 4. Informational Pages: Envíos y Entregas
  // =========================================================================
  console.log('\n--- Test 4: Envíos y Entregas Page ---');
  {
    assert.ok(enviosMeta.title, 'Envíos page must have title');
    assert.ok(String(enviosMeta.title).includes('Envíos'), 'Title must mention Envíos');

    const pageElement = EnviosPage();
    assert.ok(pageElement, 'EnviosPage must return React element');

    console.log('✅ Envíos y Entregas page verified.');
  }

  // =========================================================================
  // 5. Informational Pages: Devoluciones y Garantía
  // =========================================================================
  console.log('\n--- Test 5: Devoluciones y Garantía Page ---');
  {
    assert.ok(devMeta.title, 'Devoluciones page must have title');
    assert.ok(
      String(devMeta.title).includes('Devoluciones'),
      'Title must mention Devoluciones'
    );

    const pageElement = DevolucionesGarantiaPage();
    assert.ok(pageElement, 'DevolucionesGarantiaPage must return React element');

    console.log('✅ Devoluciones y Garantía page verified.');
  }

  // =========================================================================
  // 6. Informational Pages: Promociones Page & Active Coupons
  // =========================================================================
  console.log('\n--- Test 6: Promociones Page ---');
  {
    assert.ok(promoMeta.title, 'Promociones page must have title');
    assert.ok(String(promoMeta.title).includes('Promociones'), 'Title must mention Promociones');

    const promotions = await getPromotions();
    assert.ok(promotions.length >= 2, 'Must have at least 2 seed promotions');

    const promoCodes = promotions.map((p) => p.code);
    assert.ok(promoCodes.includes('ESTUDIO10'), 'ESTUDIO10 coupon must exist');
    assert.ok(promoCodes.includes('BLACKFRIDAY15'), 'BLACKFRIDAY15 coupon must exist');

    const pageElement = await PromocionesPage();
    assert.ok(pageElement, 'PromocionesPage must render successfully');

    console.log('✅ Promociones page and coupons verified.');
  }

  console.log('\n🎉 ALL STOREFRONT LAYOUT & INFO PAGE TESTS PASSED SUCCESSFULLY!\n');
}

testLayoutAndInfo().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
