import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/db';
import { getBaseUrl, formatProduct } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const baseUrl = getBaseUrl(request);
  const products = await getProducts();
  const formattedProducts = products.map((p) => formatProduct(p, baseUrl));

  return NextResponse.json(
    { products: formattedProducts },
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}
