import { getProducts } from '@/lib/db';
import { getBaseUrl, STOREFRONT_UPDATED_AT } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

const STATIC_PAGES = [
  '/',
  '/envios-y-entregas',
  '/devoluciones-y-garantia',
  '/promociones',
  '/categoria/estaciones-de-trabajo',
  '/categoria/monitores',
  '/categoria/accesorios',
  '/categoria/ofertas',
  '/categoria/liquidacion',
];

export async function GET(request: Request) {
  const baseUrl = getBaseUrl(request);
  const products = await getProducts();

  // A page changes when its data or the storefront templates change, whichever is later.
  // Static pages list products, so they follow the newest product change.
  const storefront = new Date(STOREFRONT_UPDATED_AT).getTime();
  const latest = (...times: number[]) => new Date(Math.max(...times)).toISOString();
  const staticLastmod = latest(storefront, ...products.map((p) => new Date(p.updated_at).getTime()));

  const staticUrls = STATIC_PAGES.map((page) => {
    const loc = page === '/' ? `${baseUrl}/` : `${baseUrl}${page}`;
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${staticLastmod}</lastmod>
    <changefreq>${page === '/' ? 'daily' : 'weekly'}</changefreq>
    <priority>${page === '/' ? '1.0' : '0.8'}</priority>
  </url>`;
  }).join('\n');

  const productUrls = products.map((product) => {
    const loc = `${baseUrl}/productos/${product.slug}`;
    const lastmod = latest(storefront, new Date(product.updated_at).getTime());
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}
${productUrls}
</urlset>`.trim();

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}
