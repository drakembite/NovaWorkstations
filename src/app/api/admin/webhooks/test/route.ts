import { NextResponse } from 'next/server';
import { WebhookEvent } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { event, url } = body;

    if (!event || !['product.updated', 'order.paid', 'order.refunded'].includes(event)) {
      return NextResponse.json(
        { error: "Evento inválido. Debe ser 'product.updated', 'order.paid' o 'order.refunded'" },
        { status: 400 }
      );
    }

    if (!url || typeof url !== 'string' || !url.trim()) {
      return NextResponse.json({ error: 'La URL del webhook es requerida' }, { status: 400 });
    }

    const trimmedUrl = url.trim();
    try {
      new URL(trimmedUrl);
    } catch {
      return NextResponse.json({ error: 'La URL especificada no tiene un formato válido' }, { status: 400 });
    }

    // Build payload according to event type
    let testPayload: any;
    const nowIso = new Date().toISOString();

    if (event === 'product.updated') {
      testPayload = {
        event: 'product.updated',
        timestamp: nowIso,
        test: true,
        product: {
          id: 'test-product-uuid',
          sku: 'NW-PRO-TEST',
          slug: 'laptop-msi-creator-z16p-test',
          price: 2499.99,
          stock_quantity: 12,
          short_description: 'Payload de prueba para evento product.updated enviado desde NovaWorkstations Admin.',
          updated_at: nowIso,
        },
      };
    } else if (event === 'order.paid') {
      testPayload = {
        event: 'order.paid',
        timestamp: nowIso,
        test: true,
        order: {
          id: 'test-order-uuid',
          order_number: 9991,
          status: 'paid',
          total_paid_amount: 1485.0,
          refunded_amount: 0,
          coupon_code_used: 'TESTPROMO',
          items: [
            {
              sku: 'VS-MSI-Z16P',
              quantity: 1,
              unit_price: 1485.0,
            },
          ],
          attribution_data: {
            utm_source: 'admin_test_suite',
            utm_medium: 'webhook_tester',
          },
        },
      };
    } else {
      testPayload = {
        event: 'order.refunded',
        timestamp: nowIso,
        test: true,
        order: {
          id: 'test-order-uuid',
          order_number: 9991,
          status: 'refunded',
          total_paid_amount: 1485.0,
          refunded_amount: 1485.0,
          coupon_code_used: 'TESTPROMO',
          items: [
            {
              sku: 'VS-MSI-Z16P',
              quantity: 1,
              unit_price: 1485.0,
            },
          ],
          attribution_data: {
            utm_source: 'admin_test_suite',
          },
        },
      };
    }

    const startTime = performance.now();
    try {
      const response = await fetch(trimmedUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'NovaWorkstations-WebhookTester/1.0',
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(8000),
      });

      const latencyMs = Math.round(performance.now() - startTime);

      return NextResponse.json(
        {
          success: response.ok,
          statusCode: response.status,
          latencyMs,
          message: response.ok
            ? `Webhook despachado exitosamente (HTTP ${response.status}) en ${latencyMs}ms`
            : `El servidor remoto respondió con error HTTP ${response.status} en ${latencyMs}ms`,
        },
        { status: 200 }
      );
    } catch (fetchErr: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      return NextResponse.json(
        {
          success: false,
          statusCode: 0,
          latencyMs,
          error: fetchErr.name === 'TimeoutError'
            ? 'Timeout: El servidor remoto no respondió dentro de los 8 segundos.'
            : `Error de red: ${fetchErr.message || 'No se pudo conectar con el destino'}`,
        },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error('[Admin Webhook Test Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
