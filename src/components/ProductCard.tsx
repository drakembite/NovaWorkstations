import React from 'react';
import Link from 'next/link';
import { Truck, Tag } from 'lucide-react';
import { Product } from '@/types/database';
import { normalizeCategorySlug } from '@/lib/catalog';
import { DEMO_NOTICE_SHORT } from '@/lib/store-copy';
import { BuyAction } from './BuyAction';

export interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className = '' }: ProductCardProps) {
  const hasDiscount =
    product.compare_at_price != null && product.compare_at_price > product.price;

  const discountPercentage = hasDiscount
    ? Math.round(
        ((product.compare_at_price! - product.price) / product.compare_at_price!) * 100
      )
    : 0;

  const inStock = product.stock_quantity > 0;
  const categorySlug = normalizeCategorySlug(product.category);

  return (
    <article
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-4 transition-all duration-300 hover:border-cyan-500/40 hover:bg-slate-900/90 hover:shadow-xl hover:shadow-cyan-500/5 ${className}`}
    >
      {/* Product Image and Badges */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-950">
        <Link
          href={`/productos/${product.slug}`}
          className="block h-full w-full"
          tabIndex={-1}
          aria-hidden="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image_url}
            alt={product.title}
            className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </Link>

        {/* Floating Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <Link
            href={`/categoria/${categorySlug}`}
            className="pointer-events-auto rounded-md bg-slate-950/80 backdrop-blur-md border border-slate-700/80 px-2 py-0.5 text-[11px] font-semibold text-slate-200 hover:border-cyan-400 hover:text-cyan-400 transition-colors shadow-sm"
          >
            {product.category}
          </Link>

          {hasDiscount && (
            <span className="inline-flex items-center gap-1 rounded-md bg-rose-500 px-2 py-0.5 text-[11px] font-extrabold text-white shadow-md shadow-rose-500/30">
              <Tag className="h-3 w-3" />
              -{discountPercentage}%
            </span>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="mt-4 flex flex-1 flex-col">
        {/* Brand & Stock indicator */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
            {product.brand}
          </span>

          {inStock ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              En stock ({product.stock_quantity})
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-rose-400">
              Agotado
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="mt-1.5 flex-1 text-sm font-bold leading-snug text-white">
          <Link
            href={`/productos/${product.slug}`}
            className="transition-colors hover:text-cyan-400 line-clamp-2"
          >
            {product.title}
          </Link>
        </h3>

        {/* Shipping Preview */}
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-400">
          <Truck className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
          <span className="truncate">{product.shipping_text}</span>
        </div>

        {/* Price and outbound buy link row */}
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-800/80 pt-3">
          <div className="flex flex-col">
            {hasDiscount && (
              <span className="text-xs text-slate-500 line-through">
                US$ {product.compare_at_price!.toFixed(2)}
              </span>
            )}
            <span className="text-base font-extrabold tracking-tight text-white">
              US$ {product.price.toFixed(2)}
            </span>
          </div>

          <div className="shrink-0 text-right">
            <BuyAction product={product} compact={true} />
          </div>
        </div>
        <p className="mt-2 text-[10px] leading-snug text-slate-500">{DEMO_NOTICE_SHORT}</p>
      </div>
    </article>
  );
}
