import { NextResponse } from 'next/server';
import { togglePromotion, getPromotions } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    let id = resolvedParams?.id || '';

    if (!id && request.url) {
      const match = new URL(request.url).pathname.match(/\/api\/admin\/promotions\/([^/]+)/);
      if (match) id = match[1];
    }

    if (!id) {
      return NextResponse.json({ error: 'Promotion ID is required' }, { status: 400 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Accept either is_active or isActive
    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : Boolean(body.isActive);

    const updated = await togglePromotion(id, isActive);
    if (!updated) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error('[Admin Promotions PATCH Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
