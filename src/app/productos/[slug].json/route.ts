import { NextResponse } from 'next/server';
import { getProductBySlug } from '@/lib/db';
import { getBaseUrl, formatProduct } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ [key: string]: string | string[] | undefined }> }
) {
  const baseUrl = getBaseUrl(request);
  const resolvedParams = await context.params;
  let slug = (resolvedParams?.slug as string) || '';

  // Fallback: parse slug from URL pathname if not present in params
  if (!slug && request.url) {
    try {
      const pathname = new URL(request.url).pathname;
      const match = pathname.match(/\/productos\/([^/]+)/);
      if (match) {
        slug = match[1];
      }
    } catch {
      // ignore
    }
  }

  // Strip .json suffix if present
  slug = slug.replace(/\.json$/, '');

  const product = await getProductBySlug(slug);

  if (!product) {
    return NextResponse.json(
      { error: 'Product not found' },
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  const formatted = formatProduct(product, baseUrl);

  return NextResponse.json(
    {
      product: formatted,
      ...formatted,
    },
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}
