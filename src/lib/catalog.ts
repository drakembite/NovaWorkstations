import { Product } from '@/types/database';

export function getBaseUrl(request: Request): string {
  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host');
  const proto =
    request.headers.get('x-forwarded-proto') ||
    (request.url?.startsWith('https') ? 'https' : 'http') ||
    'https';

  if (host) {
    return `${proto}://${host}`;
  }

  if (request.url) {
    try {
      const parsed = new URL(request.url);
      if (parsed.host) {
        return `${parsed.protocol}//${parsed.host}`;
      }
    } catch {
      // ignore
    }
  }

  return 'https://novaworkstations.com';
}

export function formatProduct(product: Product, baseUrl: string) {
  return {
    id: product.id,
    sku: product.sku,
    slug: product.slug,
    title: product.title,
    brand: product.brand,
    mpn: product.mpn,
    barcode_ean: product.barcode_ean,
    category: product.category,
    price: product.price,
    compare_at_price: product.compare_at_price,
    stock_quantity: product.stock_quantity,
    in_stock: product.stock_quantity > 0,
    short_description: product.short_description,
    specs: product.specs_json,
    shipping_text: product.shipping_text,
    image_url: product.image_url,
    url: `${baseUrl}/productos/${product.slug}`,
    updated_at: product.updated_at,
  };
}
