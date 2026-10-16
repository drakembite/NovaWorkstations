import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, PackageSearch, ArrowLeft, Tag, Layers } from 'lucide-react';
import { getProducts } from '@/lib/db';
import {
  getCategoryInfo,
  filterProductsByCategory,
  KNOWN_CATEGORIES,
  normalizeCategorySlug,
} from '@/lib/catalog';
import { ProductCard } from '@/components/ProductCard';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const resolved = await Promise.resolve(props.params);
  const rawSlug = resolved?.slug || '';
  const categoryInfo = getCategoryInfo(rawSlug);

  return {
    title: categoryInfo.metaTitle,
    description: categoryInfo.metaDescription,
    openGraph: {
      title: categoryInfo.metaTitle,
      description: categoryInfo.metaDescription,
      type: 'website',
    },
  };
}

export default async function CategoryPage(props: PageProps) {
  const resolved = await Promise.resolve(props.params);
  const rawSlug = resolved?.slug || '';
  const normalizedSlug = normalizeCategorySlug(rawSlug);
  const categoryInfo = getCategoryInfo(rawSlug);

  const allProducts = await getProducts();
  const filteredProducts = filterProductsByCategory(allProducts, rawSlug);

  const allCategories = Object.values(KNOWN_CATEGORIES);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-slate-400">
        <Link href="/" className="hover:text-cyan-400 transition-colors">
          Inicio
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
        <span className="text-slate-500">Categorías</span>
        <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
        <span className="font-semibold text-cyan-400">{categoryInfo.name}</span>
      </nav>

      {/* Header Banner */}
      <header className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900/50 to-slate-950 p-6 sm:p-10 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3 py-1 text-xs font-semibold text-cyan-400">
              <Layers className="h-3.5 w-3.5" />
              <span>Categoría Oficial</span>
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {categoryInfo.name}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
              {categoryInfo.description}
            </p>
          </div>

          <div className="shrink-0 self-start md:self-auto rounded-2xl border border-slate-800 bg-slate-950/80 px-5 py-3.5 text-center">
            <span className="block text-2xl font-black text-cyan-400">
              {filteredProducts.length}
            </span>
            <span className="text-xs font-medium text-slate-400">
              {filteredProducts.length === 1 ? 'producto disponible' : 'productos disponibles'}
            </span>
          </div>
        </div>

        {/* Category Pills Switcher */}
        <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-6">
          <span className="text-xs font-semibold text-slate-400 mr-2">Otras categorías:</span>
          {allCategories.map((cat) => {
            const isActive = cat.slug === normalizedSlug;
            return (
              <Link
                key={cat.slug}
                href={`/categoria/${cat.slug}`}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'border border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                {cat.name}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Product Grid or Empty State */}
      <section className="mt-10">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/40 p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/80 text-slate-400 border border-slate-700">
              <PackageSearch className="h-8 w-8 text-cyan-400" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-white">
              No se encontraron productos en esta categoría
            </h2>
            <p className="mt-2 max-w-md text-sm text-slate-400 leading-relaxed">
              Actualmente no tenemos unidades activas en {categoryInfo.name}. Nuevos ingresos de hardware y reposiciones se incorporan semanalmente.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:from-blue-500 hover:to-cyan-400 transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Volver al Inicio</span>
              </Link>
              <Link
                href="/categoria/estaciones-de-trabajo"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-all"
              >
                <span>Ver Estaciones de Trabajo</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
