import { NextRequest, NextResponse } from 'next/server';
import { createOrder, getOrders, getPromotionByCode } from '@/lib/db';
import { getAttributionFromCookies } from '@/lib/attribution';
import { isAdminRequest } from '@/lib/auth';
import { OrderItem } from '@/types/database';

interface OrderRequestBody {
  customer_name: string;
  customer_email: string;
  shipping_city: string;
  shipping_address: string;
  items: OrderItem[];
  coupon_code_used?: string | null;
  attribution_data?: Record<string, any>;
}

export async function GET(req: NextRequest | Request) {
  // Orders hold customer PII: only an admin session may read them.
  if (!(await isAdminRequest(req))) {
    return NextResponse.json(
      { success: false, error: 'No autorizado. Se requiere sesión de administrador.' },
      { status: 401 }
    );
  }

  try {
    const orders = await getOrders();
    return NextResponse.json({ success: true, orders }, { status: 200 });
  } catch (error: any) {
    console.error('[Orders GET Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Error al recuperar pedidos' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest | Request) {
  try {
    let body: OrderRequestBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Cuerpo de la petición inválido o malformado' },
        { status: 400 }
      );
    }

    const {
      customer_name,
      customer_email,
      shipping_city,
      shipping_address,
      items,
      coupon_code_used,
    } = body;

    // Validate required fields
    if (!customer_name || typeof customer_name !== 'string' || !customer_name.trim()) {
      return NextResponse.json(
        { success: false, error: 'El nombre del cliente es obligatorio' },
        { status: 400 }
      );
    }

    if (!customer_email || typeof customer_email !== 'string' || !customer_email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Correo electrónico del cliente inválido' },
        { status: 400 }
      );
    }

    if (!shipping_city || typeof shipping_city !== 'string' || !shipping_city.trim()) {
      return NextResponse.json(
        { success: false, error: 'La ciudad de entrega es obligatoria' },
        { status: 400 }
      );
    }

    if (!shipping_address || typeof shipping_address !== 'string' || !shipping_address.trim()) {
      return NextResponse.json(
        { success: false, error: 'La dirección de entrega es obligatoria' },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'El pedido debe contener al menos un producto' },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (!item.sku || Number(item.quantity) <= 0 || Number(item.unit_price) < 0) {
        return NextResponse.json(
          { success: false, error: `Ítem inválido en el pedido (SKU: ${item.sku || 'desconocido'})` },
          { status: 400 }
        );
      }
    }

    // Attribution fallback
    let attributionData = body.attribution_data;
    if (!attributionData || Object.keys(attributionData).length === 0) {
      const cookieHeader = req.headers.get('cookie') || undefined;
      attributionData = getAttributionFromCookies(cookieHeader);
    }

    // Subtotal computation
    const subtotal = Number(
      items
        .reduce((sum, item) => sum + Number(item.unit_price) * Number(item.quantity), 0)
        .toFixed(2)
    );

    // Coupon discount computation
    let discountAmount = 0;
    let validatedCouponCode: string | null = null;

    if (coupon_code_used && typeof coupon_code_used === 'string' && coupon_code_used.trim()) {
      const promo = await getPromotionByCode(coupon_code_used.trim());
      if (promo && promo.is_active) {
        const now = new Date();
        const starts = new Date(promo.starts_at);
        const ends = new Date(promo.ends_at);

        if (now >= starts && now <= ends && subtotal >= promo.min_purchase_amount) {
          validatedCouponCode = promo.code;
          if (promo.discount_type === 'percentage') {
            discountAmount = Number(((promo.discount_value / 100) * subtotal).toFixed(2));
          } else {
            discountAmount = Number(Math.min(promo.discount_value, subtotal).toFixed(2));
          }
        }
      }
    }

    // Shipping amount: Free if subtotal >= 150 else 15.00
    const shippingAmount = subtotal >= 150 ? 0.0 : 15.0;

    // Total calculation
    const totalPaidAmount = Number(
      Math.max(0, subtotal - discountAmount + shippingAmount).toFixed(2)
    );

    // Persist order via db helper (auto assigns order_number, 'paid' status, and fires webhook)
    const order = await createOrder({
      customer_name: customer_name.trim(),
      customer_email: customer_email.trim().toLowerCase(),
      shipping_city: shipping_city.trim(),
      shipping_address: shipping_address.trim(),
      status: 'paid',
      subtotal_amount: subtotal,
      discount_amount: discountAmount,
      shipping_amount: shippingAmount,
      total_paid_amount: totalPaidAmount,
      refunded_amount: 0,
      coupon_code_used: validatedCouponCode,
      items_json: items.map((i) => ({
        sku: i.sku,
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
        title: i.title || i.sku,
      })),
      attribution_data: attributionData || {},
    });

    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (error: any) {
    console.error('[Orders POST Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno al procesar el pedido' },
      { status: 500 }
    );
  }
}
