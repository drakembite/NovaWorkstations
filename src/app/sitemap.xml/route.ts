import { getProducts } from '@/lib/db';
import { getBaseUrl } from '@/lib/catalog';

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

  const staticUrls = STATIC_PAGES.map((page) => {
    const loc = page === '/' ? `${baseUrl}/` : `${baseUrl}${page}`;
    return `  <url>
    <loc>${loc}</loc>
    <changefreq>${page === '/' ? 'daily' : 'weekly'}</changefreq>
    <priority>${page === '/' ? '1.0' : '0.8'}</priority>
  </url>`;
  }).join('\n');

  const productUrls = products.map((product) => {
    const loc = `${baseUrl}/productos/${product.slug}`;
    const lastmod = new Date(product.updated_at).toISOString();
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
