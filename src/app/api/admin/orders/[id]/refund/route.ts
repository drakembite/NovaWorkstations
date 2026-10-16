import { NextResponse } from 'next/server';
import { getOrderById, refundOrder } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    let id = resolvedParams?.id || '';

    if (!id && request.url) {
      const match = new URL(request.url).pathname.match(/\/api\/admin\/orders\/([^/]+)\/refund/);
      if (match) id = match[1];
    }

    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const totalPaid = Number(order.total_paid_amount);
    const alreadyRefunded = Number(order.refunded_amount || 0);
    const remainingRefundable = Math.max(0, Number((totalPaid - alreadyRefunded).toFixed(2)));

    if (remainingRefundable <= 0 || order.status === 'refunded') {
      return NextResponse.json(
        { error: 'El pedido ya ha sido reembolsado en su totalidad' },
        { status: 400 }
      );
    }

    let amountToRefund = 0;
    const isFull = Boolean(body.is_full || body.isFull);

    if (isFull) {
      amountToRefund = remainingRefundable;
    } else {
      const parsedAmount = Number(body.refund_amount ?? body.refundAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json(
          { error: 'El monto a reembolsar debe ser mayor a 0' },
          { status: 400 }
        );
      }
      if (parsedAmount > remainingRefundable) {
        return NextResponse.json(
          {
            error: `El monto excede el saldo reembolsable disponible ($${remainingRefundable.toFixed(2)})`,
          },
          { status: 400 }
        );
      }
      amountToRefund = Number(parsedAmount.toFixed(2));
    }

    const updatedOrder = await refundOrder(id, amountToRefund);
    if (!updatedOrder) {
      return NextResponse.json({ error: 'Error al procesar el reembolso en base de datos' }, { status: 500 });
    }

    return NextResponse.json(updatedOrder, { status: 200 });
  } catch (error: any) {
    console.error('[Admin Refund POST Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
