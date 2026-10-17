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

export const STORE_NAME = 'NovaWorkstations';

/**
 * Public site origin used for canonical URLs and structured data.
 * Read lazily from NEXT_PUBLIC_SITE_URL (no trailing slash), with a safe fallback.
 */
export function getSiteUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '');
  return configured || 'https://novaworkstations.com';
}

/** Absolute URL for a site path such as `/productos/x` (or `/` for the home page). */
export function absoluteUrl(path: string): string {
  const site = getSiteUrl();
  return path === '/' ? `${site}/` : `${site}${path.startsWith('/') ? path : `/${path}`}`;
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

/** schema.org BreadcrumbList with absolute item URLs. */
export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Serialises JSON-LD for an inline <script>, neutralising `</script>` sequences. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
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
    currency: product.currency || 'USD',
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

export interface CategoryInfo {
  slug: string;
  name: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
}

export const KNOWN_CATEGORIES: Record<string, CategoryInfo> = {
  'estaciones-de-trabajo': {
    slug: 'estaciones-de-trabajo',
    name: 'Estaciones de Trabajo',
    description:
      'Laptops y workstations de grado profesional optimizadas para CAD, modelado 3D, arquitectura y computación de alto rendimiento.',
    metaTitle: 'Estaciones de Trabajo Profesionales',
    metaDescription:
      'Equipos de alta potencia para creadores e ingenieros con procesadores de alto rendimiento y tarjetas gráficas dedicadas.',
  },
  'monitores': {
    slug: 'monitores',
    name: 'Monitores',
    description:
      'Monitores 4K UHD y paneles OLED profesionales con calibración de color precisa (100% sRGB / DCI-P3) para postproducción y diseño.',
    metaTitle: 'Monitores Profesionales de Precisión',
    metaDescription:
      'Monitores con fidelidad cromática certificada de fábrica, conectividad Thunderbolt y máxima resolución.',
  },
  'accesorios': {
    slug: 'accesorios',
    name: 'Accesorios',
    description:
      'Estaciones de acoplamiento Thunderbolt 4, tabletas y pantallas interactivas de dibujo, y periféricos de grado profesional.',
    metaTitle: 'Accesorios y Periféricos Profesionales',
    metaDescription:
      'Docks Thunderbolt 4, tabletas gráficas con pantalla y periféricos diseñados para maximizar tu productividad.',
  },
  'ofertas': {
    slug: 'ofertas',
    name: 'Ofertas',
    description:
      'Hardware profesional con precios especiales y descuentos por tiempo limitado. Equipos nuevos con garantía oficial completa.',
    metaTitle: 'Ofertas Especiales en Hardware',
    metaDescription:
      'Descuentos directos en laptops, monitores y accesorios profesionales. Despacho rápido y garantía de fábrica.',
  },
  'liquidacion': {
    slug: 'liquidacion',
    name: 'Liquidación',
    description:
      'Oportunidades outlet y liquidación de inventario con precios rebajados en equipos de alta gama con garantía de 12 meses.',
    metaTitle: 'Liquidación y Outlet de Hardware',
    metaDescription:
      'Últimas unidades en liquidación y precios reducidos en hardware profesional garantizado.',
  },
};

export function normalizeCategorySlug(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getCategoryInfo(rawSlug: string): CategoryInfo {
  const normalized = normalizeCategorySlug(rawSlug);
  if (KNOWN_CATEGORIES[normalized]) {
    return KNOWN_CATEGORIES[normalized];
  }

  // Graceful fallback for non-predefined categories
  const title = rawSlug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    slug: normalized,
    name: title || 'Categoría',
    description: `Explora nuestros productos de alta gama en la categoría ${title || 'seleccionada'}.`,
    metaTitle: `${title || 'Categoría'}`,
    metaDescription: `Descubre los mejores equipos y hardware profesional en NovaWorkstations.`,
  };
}

export function filterProductsByCategory(products: Product[], categorySlug: string): Product[] {
  const target = normalizeCategorySlug(categorySlug);
  return products.filter((product) => normalizeCategorySlug(product.category) === target);
}

