'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Check, Plus, Minus, ArrowRight } from 'lucide-react';
import { addToCart } from '@/lib/cart';

export interface AddToCartProduct {
  id: string;
  sku: string;
  slug: string;
  title: string;
  price: number;
  image_url?: string;
  category?: string;
  stock_quantity?: number;
}

export interface AddToCartButtonProps {
  product: AddToCartProduct;
  showQuantitySelector?: boolean;
  compact?: boolean;
  className?: string;
}

export function AddToCartButton({
  product,
  showQuantitySelector = false,
  compact = false,
  className = '',
}: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<'idle' | 'added'>('idle');
  const [showToast, setShowToast] = useState(false);

  const isOutOfStock = (product.stock_quantity ?? 1) <= 0;
  const maxStock = product.stock_quantity && product.stock_quantity > 0 ? product.stock_quantity : 99;

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuantity((prev) => Math.min(maxStock, prev + 1));
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) return;

    // Update localStorage and dispatch event
    addToCart(
      {
        id: product.id,
        sku: product.sku,
        slug: product.slug,
        title: product.title,
        price: product.price,
        image_url: product.image_url,
        category: product.category,
      },
      quantity
    );

    setStatus('added');
    setShowToast(true);

    setTimeout(() => {
      setStatus('idle');
    }, 2200);

    setTimeout(() => {
      setShowToast(false);
    }, 3500);
  };

  if (isOutOfStock) {
    return (
      <button
        type="button"
        disabled
        className={`w-full cursor-not-allowed rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-xs font-semibold text-slate-500 ${className}`}
      >
        Agotado
      </button>
    );
  }

  return (
    <div className={`relative flex flex-col gap-2.5 ${className}`}>
      {/* Optional Quantity Selector */}
      {showQuantitySelector && (
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-400">Cantidad:</span>
          <div className="flex items-center rounded-xl border border-slate-700 bg-slate-900/90 p-1">
            <button
              type="button"
              onClick={handleDecrement}
              disabled={quantity <= 1}
              aria-label="Disminuir cantidad"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-9 text-center font-mono text-sm font-bold text-white">
              {quantity}
            </span>
            <button
              type="button"
              onClick={handleIncrement}
              disabled={quantity >= maxStock}
              aria-label="Aumentar cantidad"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          {product.stock_quantity && product.stock_quantity <= 5 && (
            <span className="text-[11px] text-amber-400 font-medium">
              ¡Solo {product.stock_quantity} disponibles!
            </span>
          )}
        </div>
      )}

      {/* Action Button with immediate status feedback */}
      <button
        type="button"
        onClick={handleAddToCart}
        aria-label={
          status === 'added'
            ? 'Producto agregado al carrito'
            : `Agregar ${product.title} al carrito`
        }
        className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
          compact
            ? 'px-3.5 py-2 text-xs'
            : 'px-5 py-3 text-sm w-full'
        } ${
          status === 'added'
            ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 scale-[1.02]'
            : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-cyan-400 active:scale-[0.98]'
        }`}
      >
        {status === 'added' ? (
          <>
            <Check className="h-4 w-4 stroke-[3]" />
            <span>{compact ? '¡Agregado!' : '¡Agregado al Carrito!'}</span>
          </>
        ) : (
          <>
            <ShoppingCart className="h-4 w-4" />
            <span>{compact ? 'Agregar' : 'Agregar al Carrito'}</span>
          </>
        )}
      </button>

      {/* Floating Feedback Toast for user confirmation */}
      {showToast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl border border-cyan-500/30 bg-slate-950/95 p-4 shadow-2xl shadow-cyan-500/10 backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Check className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div className="flex flex-col pr-2">
            <span className="text-xs font-bold text-white">
              {quantity > 1 ? `${quantity} unidades añadidas` : 'Producto añadido'}
            </span>
            <span className="text-[11px] text-slate-400 line-clamp-1 max-w-[200px]">
              {product.title}
            </span>
          </div>
          <Link
            href="/carrito"
            className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1.5 text-xs font-bold text-cyan-400 hover:bg-cyan-500 hover:text-slate-950 transition-colors"
          >
            <span>Ver Carrito</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
