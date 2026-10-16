'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Tag,
  CheckCircle2,
  AlertCircle,
  Truck,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Loader2,
  X,
} from 'lucide-react';
import {
  CartItem,
  getCart,
  updateCartQuantity,
  removeFromCart,
  clearCart,
  subscribeToCartUpdates,
  getAppliedCoupon,
  saveAppliedCoupon,
} from '@/lib/cart';

const FREE_SHIPPING_THRESHOLD = 150;
const STANDARD_SHIPPING_COST = 15.0;

export function CartView() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Initialize and subscribe
  useEffect(() => {
    setMounted(true);
    setItems(getCart());
    const savedCoupon = getAppliedCoupon();
    if (savedCoupon) {
      setAppliedCoupon(savedCoupon);
      setCouponInput(savedCoupon);
    }

    const unsubscribe = subscribeToCartUpdates((newItems) => {
      setItems(newItems);
    });

    return () => unsubscribe();
  }, []);

  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
    0
  );

  // Validate coupon against API
  const validateCoupon = useCallback(
    async (codeToValidate: string, currentItems: CartItem[], currentSubtotal: number) => {
      if (!codeToValidate.trim()) return;
      setIsValidating(true);
      setCouponError(null);

      try {
        const res = await fetch('/api/promotions/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: codeToValidate.trim(),
            subtotal: currentSubtotal,
            items: currentItems.map((i) => ({
              category: i.category,
              price: i.price,
              quantity: i.quantity,
            })),
          }),
        });

        const data = await res.json();

        if (data.valid) {
          setAppliedCoupon(data.promotion.code);
          saveAppliedCoupon(data.promotion.code);
          setDiscountAmount(Number(data.discount_amount) || 0);
          setCouponMessage(data.message || `Cupón ${data.promotion.code} aplicado`);
          setCouponError(null);
        } else {
          setAppliedCoupon(null);
          saveAppliedCoupon(null);
          setDiscountAmount(0);
          setCouponMessage(null);
          setCouponError(data.message || 'Cupón inválido o no aplicable');
        }
      } catch (err) {
        setAppliedCoupon(null);
        saveAppliedCoupon(null);
        setDiscountAmount(0);
        setCouponError('Error al conectar con el servicio de cupones');
      } finally {
        setIsValidating(false);
      }
    },
    []
  );

  // Re-validate applied coupon whenever items or subtotal changes
  useEffect(() => {
    if (mounted && appliedCoupon && items.length > 0) {
      validateCoupon(appliedCoupon, items, subtotal);
    } else if (items.length === 0 && appliedCoupon) {
      setDiscountAmount(0);
    }
  }, [items, subtotal, mounted, appliedCoupon, validateCoupon]);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    await validateCoupon(couponInput, items, subtotal);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    saveAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponMessage(null);
    setCouponError(null);
    setCouponInput('');
  };

  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_COST;
  const shippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const freeShippingProgress = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
  const finalTotal = Math.max(0, subtotal - discountAmount + shippingCost);

  if (!mounted) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl py-16 px-4 text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-500 shadow-xl">
          <ShoppingCart className="h-12 w-12 stroke-[1.5]" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
          Tu carrito de compras está vacío
        </h1>
        <p className="mt-3 text-base text-slate-400 max-w-md mx-auto">
          No tienes productos en tu carrito. Explora nuestra gama de workstations profesionales, servidores y monitores para ingeniería y diseño 3D.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-cyan-400 transition-all"
          >
            <span>Explorar Catálogo Completo</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/promociones"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-6 py-3.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Tag className="h-4 w-4 text-cyan-400" />
            <span>Ver Cupones Activos</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Carrito de Compras
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Revisa tus estaciones de trabajo, componentes y accesorios antes de proceder al checkout.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => clearCart()}
            className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Vaciar Carrito</span>
          </button>
          <span className="text-slate-700">|</span>
          <span className="text-xs font-semibold text-slate-300">
            {items.reduce((acc, i) => acc + i.quantity, 0)} {items.length === 1 && items[0].quantity === 1 ? 'artículo' : 'artículos'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Cart Items List */}
        <div className="lg:col-span-8 space-y-4">
          {items.map((item) => {
            const itemLineTotal = (item.price * item.quantity).toFixed(2);
            return (
              <div
                key={item.sku}
                className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-slate-800/90 bg-slate-900/60 p-4 sm:p-5 backdrop-blur-sm transition-all hover:border-slate-700 hover:bg-slate-900/90"
              >
                {/* Product Image & Details */}
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.title}
                        fill
                        className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-600">
                        <ShoppingCart className="h-8 w-8" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {item.category && (
                      <span className="inline-block text-[11px] font-semibold text-cyan-400 uppercase tracking-wider mb-0.5">
                        {item.category}
                      </span>
                    )}
                    <Link
                      href={`/productos/${item.slug}`}
                      className="block text-sm font-bold text-white hover:text-cyan-400 transition-colors line-clamp-1"
                    >
                      {item.title}
                    </Link>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                      <span className="font-mono text-slate-500">SKU: {item.sku}</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-200">
                        ${item.price.toFixed(2)} c/u
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quantity Controls & Line Total */}
                <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                  {/* Quantity Stepper */}
                  <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950/80 p-1">
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.sku, item.quantity - 1)}
                      aria-label="Reducir cantidad"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center font-mono text-sm font-bold text-white">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.sku, item.quantity + 1)}
                      aria-label="Aumentar cantidad"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-right min-w-[90px]">
                    <div className="font-mono text-base font-bold text-white">
                      ${itemLineTotal}
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                      Subtotal
                    </span>
                  </div>

                  {/* Delete Item */}
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.sku)}
                    aria-label={`Eliminar ${item.title}`}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Value Props Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-800/60 bg-slate-900/40 p-3 text-xs text-slate-300">
              <Truck className="h-4 w-4 text-cyan-400 shrink-0" />
              <span>Envío gratis en compras sobre $150</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-800/60 bg-slate-900/40 p-3 text-xs text-slate-300">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Garantía oficial directa de fábrica</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-800/60 bg-slate-900/40 p-3 text-xs text-slate-300">
              <RotateCcw className="h-4 w-4 text-blue-400 shrink-0" />
              <span>30 días para cambios y devoluciones</span>
            </div>
          </div>
        </div>

        {/* Right Column: Coupon & Order Summary */}
        <div className="lg:col-span-4 space-y-6">
          {/* Free Shipping Progress Indicator */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <div className="flex items-center gap-2 text-slate-200">
                <Truck className="h-4 w-4 text-cyan-400" />
                <span>
                  {shippingRemaining <= 0
                    ? '¡Tienes envío gratis!'
                    : `¡Te faltan $${shippingRemaining.toFixed(2)} para envío gratis!`}
                </span>
              </div>
              <span className="font-mono text-cyan-400">{freeShippingProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-950">
              <div
                className={`h-full transition-all duration-500 ${
                  shippingRemaining <= 0
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-400'
                }`}
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
            {shippingRemaining > 0 && (
              <p className="mt-2 text-[11px] text-slate-400">
                Agrega más accesorios o periféricos para ahorrar el costo de transporte ($15.00).
              </p>
            )}
          </div>

          {/* Coupon Input Box */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
              <Tag className="h-3.5 w-3.5 text-cyan-400" />
              <span>Cupón de Descuento</span>
            </div>

            {appliedCoupon ? (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{appliedCoupon}</span>
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[10px] text-emerald-300">
                        Aplicado
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-300">
                      Ahorras ${discountAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  title="Remover cupón"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Ej: ESTUDIO10"
                    disabled={isValidating}
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs font-mono font-medium text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                  <button
                    type="submit"
                    disabled={isValidating || !couponInput.trim()}
                    className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-cyan-400 hover:bg-slate-700 hover:text-cyan-300 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                  >
                    {isValidating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <span>Aplicar</span>
                    )}
                  </button>
                </div>
                {couponError && (
                  <div className="flex items-start gap-1.5 text-[11px] text-rose-400 animate-in fade-in">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{couponError}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>¿Tienes un código promocional?</span>
                  <Link href="/promociones" className="text-cyan-400 hover:underline">
                    Ver promociones
                  </Link>
                </div>
              </form>
            )}
          </div>

          {/* Order Summary Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white mb-4">
              Resumen del Pedido
            </h2>

            <div className="space-y-3 border-b border-slate-800 pb-4 text-sm">
              <div className="flex justify-between text-slate-300">
                <span>Subtotal</span>
                <span className="font-mono font-semibold text-white">
                  ${subtotal.toFixed(2)}
                </span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" />
                    <span>Descuento ({appliedCoupon})</span>
                  </span>
                  <span className="font-mono font-semibold">
                    -${discountAmount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-slate-400" />
                  <span>Envío a domicilio</span>
                </span>
                <span className="font-mono font-semibold">
                  {shippingCost === 0 ? (
                    <span className="text-emerald-400 uppercase text-xs font-bold">
                      Gratis
                    </span>
                  ) : (
                    `$${shippingCost.toFixed(2)}`
                  )}
                </span>
              </div>
            </div>

            {/* Total Row */}
            <div className="pt-4 pb-6 flex items-baseline justify-between">
              <div>
                <span className="text-base font-bold text-white">Total a Pagar</span>
                <span className="block text-[11px] text-slate-400">Impuestos y tasas incluidos</span>
              </div>
              <div className="text-right">
                <span className="font-mono text-2xl font-extrabold text-cyan-400">
                  ${finalTotal.toFixed(2)}
                </span>
                <span className="block text-[10px] font-mono text-slate-500">USD</span>
              </div>
            </div>

            {/* Checkout CTA */}
            <Link
              href="/checkout"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3.5 px-4 text-center text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-cyan-400 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              <span>Continuar al Checkout</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            {/* Trust Badges */}
            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Compra 100% segura con garantía oficial</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
