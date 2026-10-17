import { NextResponse } from 'next/server';
import { createOutboundClick, getProducts } from '@/lib/db';
import { getAttributionFromCookies } from '@/lib/attribution';
import {
  OUTBOUND_MAX_BODY_BYTES,
  OUTBOUND_MAX_SKU_LENGTH,
  sanitizeAttribution,
} from '@/lib/outbound';
import { validateBuyUrl } from '@/lib/buy-url';

export const dynamic = 'force-dynamic';

/**
 * Reads the request body without ever buffering more than `max` bytes.
 * Returns null when the body is larger than the cap.
 */
async function readBodyCapped(request: Request, max: number): Promise<string | null> {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > max) return null;
  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * POST /api/outbound-click  { "sku": "..." }
 *
 * First-party click attribution for the outbound buy link. The client only names the product:
 * the target URL is always the one stored for that sku, and the attribution comes from the
 * existing first-party cookie. No IP address, user agent or other personal data is stored.
 */
export async function POST(request: Request) {
  try {
    const raw = await readBodyCapped(request, OUTBOUND_MAX_BODY_BYTES);
    if (raw === null) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const sku = (body as Record<string, unknown>).sku;
    if (typeof sku !== 'string' || sku === '' || sku.length > OUTBOUND_MAX_SKU_LENGTH) {
      return NextResponse.json({ error: 'A valid sku is required' }, { status: 400 });
    }

    const products = await getProducts();
    const product = products.find((p) => p.sku === sku);
    const target = validateBuyUrl(product?.buy_url);
    if (!product || !target.ok || !target.value) {
      return NextResponse.json({ error: 'Unknown sku' }, { status: 400 });
    }

    const attribution = sanitizeAttribution(
      getAttributionFromCookies(request.headers.get('cookie') ?? '')
    );

    await createOutboundClick({
      sku: product.sku,
      target_url: target.value,
      attribution_data: attribution,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('[Outbound Click Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
