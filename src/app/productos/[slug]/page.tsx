import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ChevronRight,
  Truck,
  ShieldCheck,
  RotateCcw,
  Tag,
  CheckCircle2,
  FileText,
  Barcode,
  Layers,
  Sparkles,
} from 'lucide-react';
import { getProductBySlug } from '@/lib/db';
import {
  normalizeCategorySlug,
  absoluteUrl,
  buildBreadcrumbJsonLd,
  serializeJsonLd,
  STORE_NAME,
} from '@/lib/catalog';
import { BuyAction } from '@/components/BuyAction';
import { DEMO_NOTICE_LONG } from '@/lib/store-copy';

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(props: ProductPageProps): Promise<Metadata> {
  const resolved = await Promise.resolve(props.params);
  const slug = resolved?.slug || '';
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: 'Producto no encontrado',
      description: 'El producto solicitado no está disponible en el catálogo de NovaWorkstations.',
    };
  }

  const images = product.image_url ? [{ url: product.image_url }] : [];
  const canonicalUrl = absoluteUrl(`/productos/${product.slug}`);

  return {
    // The root layout title template appends the store name.
    title: product.title,
    description: product.short_description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${product.title} | ${STORE_NAME}`,
      description: product.short_description,
      url: canonicalUrl,
      siteName: STORE_NAME,
      images,
      // No `type` here: Next's openGraph.type cannot express "product", so the page
      // renders <meta property="og:type" content="product"> itself (exactly one og:type).
    },
  };
}

export default async function ProductDetailPage(props: ProductPageProps) {
  const resolved = await Promise.resolve(props.params);
  const slug = resolved?.slug || '';
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const categorySlug = normalizeCategorySlug(product.category);

  const hasDiscount =
    product.compare_at_price != null && product.compare_at_price > product.price;

  const savingsAmount = hasDiscount
    ? (product.compare_at_price! - product.price).toFixed(2)
    : null;

  const discountPercentage = hasDiscount
    ? Math.round(
        ((product.compare_at_price! - product.price) / product.compare_at_price!) * 100
      )
    : 0;

  const inStock = product.stock_quantity > 0;
  const specsEntries = Object.entries(product.specs_json || {});

  // Default JSON-LD for rich snippets if custom_head_jsonld is not provided
  const fallbackJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.image_url,
    description: product.short_description,
    sku: product.sku,
    mpn: product.mpn || undefined,
    gtin13: product.barcode_ean || undefined,
    brand: {
      '@type': 'Brand',
      name: product.brand,
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: product.currency || 'USD',
      price: product.price,
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'NovaWorkstations',
      },
    },
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Inicio', path: '/' },
    { name: product.category, path: `/categoria/${categorySlug}` },
    { name: product.title, path: `/productos/${product.slug}` },
  ]);

  const jsonLdContent = product.custom_head_jsonld
    ? typeof product.custom_head_jsonld === 'string'
      ? product.custom_head_jsonld
      : JSON.stringify(product.custom_head_jsonld)
    : JSON.stringify(fallbackJsonLd);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* 1. Inlined JSON-LD for SEO & Rich Results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdContent }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      {/* React 19 hoists <meta> into <head>. */}
      <meta property="og:type" content="product" />

      {/* 2. Breadcrumbs Navigation */}
      <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-xs text-slate-400">
        <Link href="/" className="hover:text-cyan-400 transition-colors">
          Inicio
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
        <Link href={`/categoria/${categorySlug}`} className="hover:text-cyan-400 transition-colors">
          {product.category}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
        <span className="font-semibold text-slate-200 truncate max-w-[250px] sm:max-w-md">
          {product.title}
        </span>
      </nav>

      {/* 3. Main Product Details Layout */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
        {/* Left Column: Image Gallery */}
        <div className="flex flex-col gap-4">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.image_url}
              alt={product.title}
              className="h-full w-full object-cover object-center"
              loading="eager"
            />

            {/* Badges Overlay */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              <span className="rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-700 px-3 py-1 text-xs font-bold text-cyan-400 shadow-md">
                {product.brand}
              </span>
              {hasDiscount && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500 px-2.5 py-1 text-xs font-extrabold text-white shadow-lg shadow-rose-500/30">
                  <Tag className="h-3.5 w-3.5" />
                  Ahorra -{discountPercentage}%
                </span>
              )}
            </div>
          </div>

          {/* Value Highlights under image */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3 text-center">
              <Truck className="h-5 w-5 text-cyan-400 mb-1" />
              <span className="text-[11px] font-bold text-white">Despacho 24h</span>
              <span className="text-[10px] text-slate-400">Lima y Callao</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3 text-center">
              <ShieldCheck className="h-5 w-5 text-emerald-400 mb-1" />
              <span className="text-[11px] font-bold text-white">12 Meses</span>
              <span className="text-[10px] text-slate-400">Garantía oficial</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3 text-center">
              <RotateCcw className="h-5 w-5 text-indigo-400 mb-1" />
              <span className="text-[11px] font-bold text-white">30 Días</span>
              <span className="text-[10px] text-slate-400">Devolución fácil</span>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing, Information & Purchase Actions */}
        <div className="flex flex-col">
          {/* Brand & Category */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-widest text-cyan-400">
              {product.brand}
            </span>
            <span className="text-slate-600">•</span>
            <Link
              href={`/categoria/${categorySlug}`}
              className="text-xs font-medium text-slate-400 hover:text-cyan-400 transition-colors"
            >
              {product.category}
            </Link>
          </div>

          {/* Product Title */}
          <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
            {product.title}
          </h1>

          {/* Technical IDs (SKU, MPN, Barcode EAN) */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-1 font-mono">
              <span className="text-slate-500">SKU:</span>
              <span className="text-slate-300 font-semibold">{product.sku}</span>
            </div>
            {product.mpn && (
              <>
                <span className="text-slate-700">•</span>
                <div className="flex items-center gap-1 font-mono">
                  <span className="text-slate-500">MPN:</span>
                  <span className="text-slate-300 font-semibold">{product.mpn}</span>
                </div>
              </>
            )}
            {product.barcode_ean && (
              <>
                <span className="text-slate-700">•</span>
                <div className="flex items-center gap-1 font-mono">
                  <Barcode className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-slate-500">EAN:</span>
                  <span className="text-slate-300 font-semibold">{product.barcode_ean}</span>
                </div>
              </>
            )}
          </div>

          {/* Price Box */}
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-black text-white sm:text-4xl">
                US$ {product.price.toFixed(2)}
              </span>

              {hasDiscount && (
                <>
                  <span className="text-lg text-slate-500 line-through">
                    US$ {product.compare_at_price!.toFixed(2)}
                  </span>
                  <span className="rounded-md bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-xs font-extrabold text-rose-400">
                    Ahorras US$ {savingsAmount} (-{discountPercentage}%)
                  </span>
                </>
              )}
            </div>

            {/* Live Stock Status & Shipping text badges */}
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-800 pt-4">
              {inStock ? (
                <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>En Stock ({product.stock_quantity} unidades disponibles)</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 text-xs font-bold text-rose-400">
                  <span>Agotado temporalmente</span>
                </div>
              )}

              <div className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 text-xs font-semibold text-blue-300">
                <Truck className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span>{product.shipping_text}</span>
              </div>
            </div>
          </div>

          {/* Short Description */}
          <div className="mt-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Descripción del Equipo
            </h2>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              {product.short_description}
            </p>
          </div>

          {/* Outbound purchase: this demo store sells nothing, the button leads to a real store */}
          <div className="mt-8 border-t border-slate-800 pt-6">
            <BuyAction product={product} />
            <p className="mt-3 text-xs leading-relaxed text-slate-400">{DEMO_NOTICE_LONG}</p>
          </div>

          {/* Delivery & Warranty Assurances */}
          <div className="mt-8 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Garantías de Compra en NovaWorkstations
            </span>
            <ul className="mt-3 space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-400" />
                <span>Despacho seguro en 24 horas en Lima Metropolitana y 48-72h a todo el Perú.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-400" />
                <span>12 meses de garantía de fábrica oficial con soporte técnico local.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 4. Technical Specifications Table */}
      <section className="mt-16 border-t border-slate-800 pt-12">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Especificaciones Técnicas
            </h2>
            <p className="text-xs text-slate-400">
              Detalle y configuración de hardware de fábrica para {product.title}.
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
          {specsEntries.length > 0 ? (
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-slate-800">
                {specsEntries.map(([key, value], idx) => (
                  <tr
                    key={key}
                    className={idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/70'}
                  >
                    <th
                      scope="row"
                      className="w-1/3 py-3.5 px-6 font-semibold text-slate-300 border-r border-slate-800"
                    >
                      {key}
                    </th>
                    <td className="py-3.5 px-6 font-mono text-slate-200">
                      {String(value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-sm text-slate-400">
              No se han registrado especificaciones adicionales para este producto.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
