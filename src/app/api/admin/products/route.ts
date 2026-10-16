import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const products = await getProducts();
    return NextResponse.json(products, { status: 200 });
  } catch (error: any) {
    console.error('[Admin Products GET Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
