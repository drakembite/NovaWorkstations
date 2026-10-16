'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShieldCheck,
  CheckCircle2,
  Truck,
  CreditCard,
  Lock,
  ArrowRight,
  Package,
  MapPin,
  Mail,
  User,
  Tag,
  AlertCircle,
  Loader2,
  Clock,
  Zap,
  ShoppingBag,
  Home,
} from 'lucide-react';
import {
  CartItem,
  getCart,
  clearCart,
  getAppliedCoupon,
} from '@/lib/cart';
import { getAttributionFromCookies } from '@/lib/attribution';
import { Order } from '@/types/database';

const FREE_SHIPPING_THRESHOLD = 150;
const STANDARD_SHIPPING_COST = 15.0;

export function CheckoutView() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [shippingCity, setShippingCity] = useState('Lima');
  const [shippingAddress, setShippingAddress] = useState('');

  // Applied Coupon
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Order Confirmed State
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  useEffect(() => {
    setMounted(true);
    const cartItems = getCart();
    setItems(cartItems);

    const coupon = getAppliedCoupon();
    if (coupon) {
      setAppliedCoupon(coupon);
      // Validate coupon to get current discount
      const sub = cartItems.reduce(
        (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
        0
      );
      fetch('/api/promotions/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: coupon,
          subtotal: sub,
          items: cartItems.map((i) => ({
            category: i.category,
            price: i.price,
            quantity: i.quantity,
          })),
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.valid) {
            setDiscountAmount(Number(data.discount_amount) || 0);
          } else {
            setAppliedCoupon(null);
          }
        })
        .catch(() => {});
    }
  }, []);

  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
    0
  );
  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_COST;
  const totalAmount = Math.max(0, subtotal - discountAmount + shippingCost);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!customerName.trim()) {
      setErrorMessage('Por favor ingresa tu nombre completo.');
      return;
    }
    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      setErrorMessage('Por favor ingresa un correo electrónico válido.');
      return;
    }
    if (!shippingCity.trim()) {
      setErrorMessage('Por favor indica la ciudad de entrega.');
      return;
    }
    if (!shippingAddress.trim()) {
      setErrorMessage('Por favor ingresa tu dirección de entrega completa.');
      return;
    }
    if (items.length === 0) {
      setErrorMessage('El carrito no contiene productos.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Extract attribution from cookies
      const attributionData = getAttributionFromCookies();

      const orderPayload = {
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
        shipping_city: shippingCity.trim(),
        shipping_address: shippingAddress.trim(),
        items: items.map((i) => ({
          sku: i.sku,
          quantity: i.quantity,
          unit_price: i.price,
          title: i.title,
        })),
        coupon_code_used: appliedCoupon || undefined,
        attribution_data: attributionData,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();

      if (res.ok && data.success && data.order) {
        setConfirmedOrder(data.order);
        clearCart();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErrorMessage(data.error || 'No se pudo procesar el pedido. Intenta nuevamente.');
      }
    } catch (err: any) {
      setErrorMessage('Error de conexión al procesar el pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  // Confirmation screen when order is successfully placed
  if (confirmedOrder) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-emerald-500/30 bg-slate-900/90 shadow-2xl shadow-emerald-500/10 backdrop-blur-md">
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-8 text-center text-white">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md shadow-inner border border-white/20 animate-in zoom-in-50 duration-300">
              <CheckCircle2 className="h-12 w-12 text-white stroke-[2.5]" />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/70 border border-emerald-400/40 px-3.5 py-1 text-xs font-bold text-emerald-200 uppercase tracking-widest mb-3">
              <Zap className="h-3.5 w-3.5 text-emerald-400" />
              Pago 1-Clic Confirmado
            </span>
            <h1 className="text-3xl font-extrabold sm:text-4xl tracking-tight">
              ¡Gracias por tu compra, {confirmedOrder.customer_name}!
            </h1>
            <p className="mt-2 text-sm text-emerald-100 max-w-lg mx-auto">
              Tu pedido ha sido procesado exitosamente. Hemos enviado la confirmación y detalles de seguimiento a{' '}
              <strong className="text-white underline">{confirmedOrder.customer_email}</strong>.
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            {/* Order Identity & Status Badge */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                  Número de Pedido
                </span>
                <div className="font-mono text-2xl font-extrabold text-cyan-400">
                  #{confirmedOrder.order_number}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 px-3 py-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  <CheckCircle2 className="h-4 w-4" />
                  Estado: {confirmedOrder.status}
                </span>
                {confirmedOrder.coupon_code_used && (
                  <span className="inline-flex items-center gap-1 rounded-xl bg-cyan-500/15 border border-cyan-500/40 px-3 py-1.5 text-xs font-mono font-bold text-cyan-300">
                    <Tag className="h-3.5 w-3.5" />
                    {confirmedOrder.coupon_code_used}
                  </span>
                )}
              </div>
            </div>

            {/* Delivery Timeframe Notice */}
            <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/30 to-blue-950/30 p-5">
              <div className="flex items-center gap-2.5 text-cyan-400 font-bold text-sm mb-2">
                <Clock className="h-5 w-5" />
                <span>Tiempo Estimado de Entrega</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300 mt-2">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <span className="font-bold text-white block mb-0.5">Lima Metropolitana:</span>
                  <span className="text-emerald-400 font-semibold">Entrega rápida en 24 horas hábiles</span>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <span className="font-bold text-white block mb-0.5">Provincias y Regiones:</span>
                  <span className="text-cyan-300 font-semibold">48 a 72 horas hábiles a nivel nacional</span>
                </div>
              </div>
            </div>

            {/* Shipping & Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  <MapPin className="h-4 w-4 text-cyan-400" />
                  <span>Dirección de Despacho</span>
                </div>
                <p className="text-sm font-semibold text-white">
                  {confirmedOrder.shipping_address}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ciudad: <span className="text-slate-200">{confirmedOrder.shipping_city}</span>
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  <User className="h-4 w-4 text-cyan-400" />
                  <span>Contacto y Facturación</span>
                </div>
                <p className="text-sm font-semibold text-white">
                  {confirmedOrder.customer_name}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Email: <span className="text-slate-200">{confirmedOrder.customer_email}</span>
                </p>
              </div>
            </div>

            {/* Items Purchased Summary */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                <Package className="h-4 w-4 text-cyan-400" />
                <span>Productos Comprados ({confirmedOrder.items_json.length})</span>
              </div>
              <div className="divide-y divide-slate-800/80">
                {confirmedOrder.items_json.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3 text-xs">
                    <div>
                      <span className="font-semibold text-white block text-sm">
                        {item.title || item.sku}
                      </span>
                      <span className="font-mono text-slate-500">
                        SKU: {item.sku} • Cantidad: {item.quantity} x ${item.unit_price.toFixed(2)}
                      </span>
                    </div>
                    <div className="font-mono font-bold text-white text-sm">
                      ${(item.quantity * item.unit_price).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Financial Breakdown */}
              <div className="mt-4 border-t border-slate-800 pt-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-mono text-white">
                    ${confirmedOrder.subtotal_amount.toFixed(2)}
                  </span>
                </div>
                {confirmedOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Descuento aplicado</span>
                    <span className="font-mono">
                      -${confirmedOrder.discount_amount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Envío a domicilio</span>
                  <span className="font-mono text-white">
                    {confirmedOrder.shipping_amount === 0 ? 'Gratis' : `$${confirmedOrder.shipping_amount.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                  <span>Total Pagado</span>
                  <span className="font-mono text-base text-cyan-400">
                    ${confirmedOrder.total_paid_amount.toFixed(2)} USD
                  </span>
                </div>
              </div>
            </div>

            {/* Attribution Footprint (If Captured) */}
            {confirmedOrder.attribution_data && Object.keys(confirmedOrder.attribution_data).length > 0 && (
              <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-3.5 text-[11px] text-slate-500 flex items-center justify-between">
                <span>
                  Atribución registrada:{' '}
                  <strong className="text-slate-400 font-mono">
                    {confirmedOrder.attribution_data.utm_source ||
                     confirmedOrder.attribution_data.aic_src ||
                     'Tráfico Orgánico'}
                  </strong>
                </span>
                <span className="font-mono text-[10px] text-slate-600">
                  {confirmedOrder.attribution_data.captured_at
                    ? new Date(confirmedOrder.attribution_data.captured_at).toLocaleTimeString()
                    : 'silent-track'}
                </span>
              </div>
            )}

            {/* Post-order CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-slate-800">
              <Link
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-cyan-400 transition-all"
              >
                <Home className="h-4 w-4" />
                <span>Volver a la Tienda</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If cart is empty and no order confirmed
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl py-16 px-4 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-500">
          <ShoppingBag className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-bold text-white">Tu carrito está vacío</h1>
        <p className="mt-2 text-sm text-slate-400">
          Necesitas agregar al menos un producto al carrito antes de proceder al checkout.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-cyan-400 transition-all"
          >
            <span>Ir al Catálogo</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Checkout Title */}
      <div className="mb-8 border-b border-slate-800 pb-5">
        <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
          Finalizar Compra
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Ingresa tus datos de envío para procesar tu orden con nuestro simulador de pago instantáneo.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Shipping Form & Payment Simulator */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSubmitOrder} className="space-y-6">
            {/* Step 1: Shipping Details */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-sm">
              <div className="flex items-center gap-2.5 text-base font-bold text-white mb-5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
                  1
                </div>
                <span>Datos de Envío y Contacto</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="customer_name" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nombre Completo *
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      id="customer_name"
                      type="text"
                      required
                      placeholder="Ej: Rodrigo Valenzuela"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="customer_email" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Correo Electrónico *
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      id="customer_email"
                      type="email"
                      required
                      placeholder="Ej: r.valenzuela@empresa.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Enviaremos la factura digital y número de seguimiento a esta dirección.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="shipping_city" className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Ciudad o Provincia *
                    </label>
                    <input
                      id="shipping_city"
                      type="text"
                      required
                      placeholder="Ej: Lima, Arequipa, Trujillo"
                      value={shippingCity}
                      onChange={(e) => setShippingCity(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 px-3.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>
                  <div>
                    <label htmlFor="shipping_address" className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Dirección Completa *
                    </label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                      <input
                        id="shipping_address"
                        type="text"
                        required
                        placeholder="Av. Javier Prado Este 4200, Dpto 502"
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: 1-Click Payment Simulator */}
            <div className="rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5 text-base font-bold text-white">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500 text-xs font-bold text-slate-950">
                    2
                  </div>
                  <span>Simulador de Pago en 1 Clic</span>
                </div>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wide">
                  Activo
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 mb-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div className="text-xs text-slate-300 space-y-1">
                    <p className="font-semibold text-white">
                      Confirmación Instantánea sin Tarjetas Reales
                    </p>
                    <p className="text-slate-400 leading-relaxed">
                      Este simulador valida la orden, genera el registro de venta con estado{' '}
                      <code className="text-emerald-400 font-mono">paid</code>, asigna el número correlativo y dispara el webhook de pago automático.
                    </p>
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-300 animate-in fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 1-Click Payment Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 py-4 px-6 text-center text-sm font-extrabold text-slate-950 shadow-xl shadow-emerald-500/20 hover:from-emerald-400 hover:to-cyan-400 active:scale-[0.99] disabled:opacity-50 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Procesando y Confirmando Pedido...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5 fill-slate-950" />
                    <span>Pagar y Confirmar Pedido en 1 Clic (${totalAmount.toFixed(2)} USD)</span>
                  </>
                )}
              </button>

              <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Lock className="h-3 w-3 text-cyan-400" />
                  Conexión SSL Segura 256-bit
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  Garantía Oficial NovaWorkstations
                </span>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Order Breakdown & Review */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl sticky top-24">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white mb-4 flex items-center justify-between">
              <span>Resumen de tu Pedido</span>
              <span className="font-mono text-xs text-slate-400 font-normal">
                {items.length} {items.length === 1 ? 'producto' : 'productos'}
              </span>
            </h2>

            {/* Items list */}
            <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.sku} className="py-3 flex items-center gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-600">
                        <Package className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white line-clamp-1">
                      {item.title}
                    </p>
                    <p className="font-mono text-[11px] text-slate-400">
                      Cant: {item.quantity} x ${item.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right font-mono text-xs font-bold text-white">
                    ${(item.quantity * item.price).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="mt-4 border-t border-slate-800 pt-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Subtotal</span>
                <span className="font-mono font-semibold text-white">
                  ${subtotal.toFixed(2)}
                </span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span className="flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" />
                    <span>Descuento ({appliedCoupon})</span>
                  </span>
                  <span className="font-mono font-semibold">
                    -${discountAmount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-slate-300">
                <span className="flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5 text-slate-400" />
                  <span>Envío a domicilio</span>
                </span>
                <span className="font-mono font-semibold">
                  {shippingCost === 0 ? (
                    <span className="text-emerald-400 uppercase text-[11px] font-bold">
                      Gratis
                    </span>
                  ) : (
                    `$${shippingCost.toFixed(2)}`
                  )}
                </span>
              </div>
            </div>

            {/* Total Row */}
            <div className="mt-5 border-t border-slate-800 pt-4 flex items-baseline justify-between">
              <div>
                <span className="text-base font-bold text-white">Total a Pagar</span>
                <span className="block text-[11px] text-slate-400">Impuestos y entrega incluidos</span>
              </div>
              <div className="text-right">
                <span className="font-mono text-2xl font-extrabold text-cyan-400">
                  ${totalAmount.toFixed(2)}
                </span>
                <span className="block text-[10px] font-mono text-slate-500">USD</span>
              </div>
            </div>

            {/* Edit Cart Link */}
            <div className="mt-5 pt-3 border-t border-slate-800/60 text-center">
              <Link
                href="/carrito"
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                ← Volver al carrito para modificar productos
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
