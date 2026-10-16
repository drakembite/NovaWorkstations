import { NextResponse } from 'next/server';
import { getOrders } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const orders = await getOrders();
    return NextResponse.json(orders, { status: 200 });
  } catch (error: any) {
    console.error('[Admin Orders GET Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
