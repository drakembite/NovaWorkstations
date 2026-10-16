import { NextRequest, NextResponse } from 'next/server';
import { getPromotionByCode } from '@/lib/db';

interface ValidateRequestBody {
  code?: string;
  subtotal?: number;
  items?: Array<{
    category?: string;
    price: number;
    quantity: number;
  }>;
}

export async function POST(req: NextRequest | Request) {
  try {
    let body: ValidateRequestBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { valid: false, message: 'Cuerpo de la petición inválido o malformado' },
        { status: 400 }
      );
    }

    const { code, subtotal = 0, items } = body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json(
        { valid: false, message: 'Código de cupón requerido' },
        { status: 400 }
      );
    }

    const promotion = await getPromotionByCode(code.trim());
    if (!promotion) {
      return NextResponse.json(
        { valid: false, message: 'El cupón ingresado no existe' },
        { status: 200 }
      );
    }

    if (!promotion.is_active) {
      return NextResponse.json(
        { valid: false, message: 'El cupón no está activo en este momento' },
        { status: 200 }
      );
    }

    const now = new Date();
    const startsAt = new Date(promotion.starts_at);
    const endsAt = new Date(promotion.ends_at);

    if (now < startsAt) {
      return NextResponse.json(
        { valid: false, message: 'La promoción aún no ha comenzado' },
        { status: 200 }
      );
    }

    if (now > endsAt) {
      return NextResponse.json(
        { valid: false, message: 'El cupón ha expirado' },
        { status: 200 }
      );
    }

    const numericSubtotal = Number(subtotal) || 0;
    if (numericSubtotal < promotion.min_purchase_amount) {
      return NextResponse.json(
        {
          valid: false,
          message: `El monto mínimo de compra para este cupón es de $${promotion.min_purchase_amount.toFixed(2)} (Subtotal actual: $${numericSubtotal.toFixed(2)})`,
        },
        { status: 200 }
      );
    }

    let eligibleSubtotal = numericSubtotal;
    if (promotion.applies_to_category) {
      if (Array.isArray(items) && items.length > 0) {
        const matchingItems = items.filter(
          (item) => item.category === promotion.applies_to_category
        );
        if (matchingItems.length === 0) {
          return NextResponse.json(
            {
              valid: false,
              message: `Este cupón solo aplica para productos de la categoría "${promotion.applies_to_category}"`,
            },
            { status: 200 }
          );
        }
        eligibleSubtotal = matchingItems.reduce(
          (sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1),
          0
        );
      }
    }

    let discountAmount = 0;
    if (promotion.discount_type === 'percentage') {
      discountAmount = (promotion.discount_value / 100) * eligibleSubtotal;
    } else {
      discountAmount = Math.min(promotion.discount_value, eligibleSubtotal);
    }

    discountAmount = Number(Math.max(0, discountAmount).toFixed(2));

    return NextResponse.json({
      valid: true,
      promotion,
      discount_amount: discountAmount,
      message: `¡Cupón "${promotion.code}" aplicado con éxito!`,
    });
  } catch (error: any) {
    console.error('[Promotion Validate Error]:', error);
    return NextResponse.json(
      { valid: false, message: 'Error interno al validar el cupón' },
      { status: 500 }
    );
  }
}
