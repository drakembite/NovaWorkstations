import { NextResponse } from 'next/server';
import { getStoreSettings, updateStoreSettings } from '@/lib/db';
import { StoreSettings } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await getStoreSettings();
    return NextResponse.json(settings, { status: 200 });
  } catch (error: any) {
    console.error('[Admin Settings GET Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const updates: Partial<StoreSettings> = {};

    if (body.store_name !== undefined) {
      const name = String(body.store_name).trim();
      if (!name) {
        return NextResponse.json({ error: 'El nombre de la tienda no puede estar vacío' }, { status: 400 });
      }
      updates.store_name = name;
    }

    if (body.custom_head_script !== undefined) {
      updates.custom_head_script =
        body.custom_head_script === null || body.custom_head_script === ''
          ? null
          : String(body.custom_head_script);
    }

    if (body.webhook_url_product_updated !== undefined) {
      updates.webhook_url_product_updated =
        body.webhook_url_product_updated === null || body.webhook_url_product_updated === ''
          ? null
          : String(body.webhook_url_product_updated).trim();
    }

    if (body.webhook_url_order_paid !== undefined) {
      updates.webhook_url_order_paid =
        body.webhook_url_order_paid === null || body.webhook_url_order_paid === ''
          ? null
          : String(body.webhook_url_order_paid).trim();
    }

    if (body.webhook_url_order_refunded !== undefined) {
      updates.webhook_url_order_refunded =
        body.webhook_url_order_refunded === null || body.webhook_url_order_refunded === ''
          ? null
          : String(body.webhook_url_order_refunded).trim();
    }

    const updated = await updateStoreSettings(updates);
    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error('[Admin Settings PUT Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
