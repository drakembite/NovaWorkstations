import { NextResponse } from 'next/server';
import { getPromotions, createPromotion, getPromotionByCode } from '@/lib/db';
import { DiscountType } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const promotions = await getPromotions();
    return NextResponse.json(promotions, { status: 200 });
  } catch (error: any) {
    console.error('[Admin Promotions GET Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
      code,
      name,
      description,
      discount_type,
      discount_value,
      min_purchase_amount,
      applies_to_category,
      starts_at,
      ends_at,
      is_active,
    } = body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json({ error: 'El código de cupón es obligatorio' }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();

    // Check duplicate code
    const existing = await getPromotionByCode(normalizedCode);
    if (existing) {
      return NextResponse.json(
        { error: `El cupón con código '${normalizedCode}' ya existe` },
        { status: 409 }
      );
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'El nombre de la promoción es obligatorio' }, { status: 400 });
    }

    const validDiscountTypes: DiscountType[] = ['percentage', 'fixed'];
    if (!discount_type || !validDiscountTypes.includes(discount_type)) {
      return NextResponse.json(
        { error: "Tipo de descuento inválido. Debe ser 'percentage' o 'fixed'" },
        { status: 400 }
      );
    }

    const discountVal = Number(discount_value);
    if (isNaN(discountVal) || discountVal <= 0) {
      return NextResponse.json({ error: 'El valor de descuento debe ser mayor a 0' }, { status: 400 });
    }

    if (discount_type === 'percentage' && discountVal > 100) {
      return NextResponse.json({ error: 'El porcentaje de descuento no puede ser mayor a 100%' }, { status: 400 });
    }

    const minPurchase = min_purchase_amount !== undefined ? Number(min_purchase_amount) : 0;
    if (isNaN(minPurchase) || minPurchase < 0) {
      return NextResponse.json({ error: 'Monto de compra mínima inválido' }, { status: 400 });
    }

    const now = new Date();
    const startsAt = starts_at ? new Date(starts_at).toISOString() : now.toISOString();
    const endsAt = ends_at
      ? new Date(ends_at).toISOString()
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const newPromotion = await createPromotion({
      code: normalizedCode,
      name: name.trim(),
      description: (description || '').trim(),
      discount_type,
      discount_value: discountVal,
      min_purchase_amount: minPurchase,
      applies_to_category: applies_to_category ? String(applies_to_category).trim() : null,
      starts_at: startsAt,
      ends_at: endsAt,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
    });

    return NextResponse.json(newPromotion, { status: 201 });
  } catch (error: any) {
    console.error('[Admin Promotions POST Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
