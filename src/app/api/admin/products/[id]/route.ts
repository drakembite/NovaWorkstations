import { NextResponse } from 'next/server';
import { updateProduct, getProductById } from '@/lib/db';
import { Product } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    let id = resolvedParams?.id || '';

    if (!id && request.url) {
      const match = new URL(request.url).pathname.match(/\/api\/admin\/products\/([^/]+)/);
      if (match) id = match[1];
    }

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const product = await getProductById(id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product, { status: 200 });
  } catch (error: any) {
    console.error('[Admin Product GET Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    let id = resolvedParams?.id || '';

    if (!id && request.url) {
      const match = new URL(request.url).pathname.match(/\/api\/admin\/products\/([^/]+)/);
      if (match) id = match[1];
    }

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Verify product exists first
    const existing = await getProductById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const updates: Partial<Product> = {};

    if (body.price !== undefined) {
      const priceNum = Number(body.price);
      if (isNaN(priceNum) || priceNum < 0) {
        return NextResponse.json({ error: 'Invalid price value' }, { status: 400 });
      }
      updates.price = priceNum;
    }

    if (body.compare_at_price !== undefined) {
      if (body.compare_at_price === null || body.compare_at_price === '' || body.compare_at_price === 'null') {
        updates.compare_at_price = null;
      } else {
        const compareNum = Number(body.compare_at_price);
        if (isNaN(compareNum) || compareNum < 0) {
          return NextResponse.json({ error: 'Invalid compare_at_price value' }, { status: 400 });
        }
        updates.compare_at_price = compareNum;
      }
    }

    if (body.stock_quantity !== undefined) {
      const stockNum = parseInt(body.stock_quantity, 10);
      if (isNaN(stockNum) || stockNum < 0) {
        return NextResponse.json({ error: 'Invalid stock_quantity value' }, { status: 400 });
      }
      updates.stock_quantity = stockNum;
    }

    if (body.category !== undefined) {
      const cat = String(body.category).trim();
      if (!cat) {
        return NextResponse.json({ error: 'Category cannot be empty' }, { status: 400 });
      }
      updates.category = cat;
    }

    if (body.short_description !== undefined) {
      const desc = String(body.short_description).trim();
      if (!desc) {
        return NextResponse.json({ error: 'Short description cannot be empty' }, { status: 400 });
      }
      updates.short_description = desc;
    }

    // Additional optional fields
    if (body.title !== undefined) updates.title = String(body.title).trim();
    if (body.brand !== undefined) updates.brand = String(body.brand).trim();

    const updatedProduct = await updateProduct(id, updates);
    if (!updatedProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(updatedProduct, { status: 200 });
  } catch (error: any) {
    console.error('[Admin Product PATCH Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
