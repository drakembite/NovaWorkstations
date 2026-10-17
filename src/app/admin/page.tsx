import React from 'react';
import Link from 'next/link';
import {
  MousePointerClick,
  Link2,
  Package,
  Tag,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { getProducts, getOutboundClicks, getPromotions } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const [products, clicks, promotions] = await Promise.all([
    getProducts(),
    getOutboundClicks(),
    getPromotions(),
  ]);

  // Executive metrics calculation
  const totalClicks = clicks.length;
  const totalProducts = products.length;
  const linkedProducts = products.filter((p) => p.buy_url).length;
  const activePromotionsCount = promotions.filter((p) => p.is_active).length;

  // Stock alerts: stock_quantity <= 5
  const lowStockProducts = products
    .filter((p) => p.stock_quantity <= 5)
    .sort((a, b) => a.stock_quantity - b.stock_quantity);

  // Recent outbound clicks preview (newest first)
  const recentClicks = [...clicks].reverse().slice(0, 6);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Resumen Operativo
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Vista ejecutiva del rendimiento comercial, inventario crítico y actividad en tiempo real.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/productos"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-500 hover:to-cyan-500 transition-all"
          >
            <Package className="h-4 w-4" />
            <span>Editar Productos</span>
          </Link>
        </div>
      </div>

      {/* Executive Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Ventas Totales */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Clics de Compra Salientes
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <MousePointerClick className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {totalClicks}
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-xs text-emerald-400">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Visitas enviadas a tiendas independientes</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Productos con enlace de compra */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Productos con Enlace de Compra
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-cyan-400 border border-blue-500/20">
              <Link2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {linkedProducts} / {totalProducts}
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-400">
              <span>Se editan en Productos</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Total Productos */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Catálogo Activo
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {totalProducts}
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-400">
              <span>Modelos y SKUs publicados</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Cupones Activos */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Cupones Activos
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Tag className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {activePromotionsCount}
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-xs text-purple-400">
              <span>Campañas promocionales vigentes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Alerts & Quick Actions */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left 2 Cols: Stock Alerts */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  Alertas de Stock Crítico (≤ 5 unidades)
                </h2>
                <p className="text-xs text-slate-400">
                  {lowStockProducts.length === 0
                    ? 'No hay productos con inventario bajo actualmente.'
                    : `${lowStockProducts.length} productos requieren reposición inmediata.`}
                </p>
              </div>
            </div>
            <Link
              href="/admin/productos"
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>Ver todos</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 divide-y divide-slate-800/60 overflow-hidden">
            {lowStockProducts.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                ✅ Todo el catálogo cuenta con niveles óptimos de inventario.
              </div>
            ) : (
              lowStockProducts.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-2 hover:bg-slate-800/30 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-800 border border-slate-700/60">
                      <img
                        src={p.image_url}
                        alt={p.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white line-clamp-1">
                        {p.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-mono text-cyan-400">{p.sku}</span>
                        <span>•</span>
                        <span className="capitalize">{p.category.replace(/-/g, ' ')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold border ${
                        p.stock_quantity === 0
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : p.stock_quantity <= 2
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                      }`}
                    >
                      {p.stock_quantity === 0 ? 'Sin Stock (0)' : `${p.stock_quantity} disponibles`}
                    </span>
                    <Link
                      href="/admin/productos"
                      className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 hover:border-cyan-500/50 hover:text-cyan-400 transition-colors"
                    >
                      Editar
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Quick Links */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 pb-3 border-b border-slate-800">
              Accesos Rápidos
            </h2>
            <div className="mt-3 space-y-2">
              <Link
                href="/admin/productos"
                className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-800/40 p-3 text-sm font-medium text-slate-200 hover:border-slate-700 hover:bg-slate-800 hover:text-white transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Package className="h-4 w-4 text-cyan-400" />
                  <span>Precios y Enlaces de Compra</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </Link>

              <Link
                href="/admin/promociones"
                className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-800/40 p-3 text-sm font-medium text-slate-200 hover:border-slate-700 hover:bg-slate-800 hover:text-white transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Tag className="h-4 w-4 text-purple-400" />
                  <span>Crear Cupón de Descuento</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </Link>

              <Link
                href="/admin/ajustes"
                className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-800/40 p-3 text-sm font-medium text-slate-200 hover:border-slate-700 hover:bg-slate-800 hover:text-white transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span>Configurar y Probar Webhooks</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-blue-950/40 p-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-cyan-400" />
              <span>Plataforma NovaWorkstations</span>
            </h3>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
              Tienda de demostración: cada producto envía al comprador a una tienda independiente. El catálogo notifica cambios mediante el webhook product.updated.
            </p>
          </div>
        </div>
      </div>

      {/* Recent outbound clicks */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-base font-bold text-white">Últimos Clics de Compra</h2>
          <p className="text-xs text-slate-400">
            Registro propio de clics en «Comprar» con la atribución de origen (sin IP ni datos personales).
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="pb-3 font-semibold">Fecha</th>
                <th className="pb-3 font-semibold">SKU</th>
                <th className="pb-3 font-semibold">Destino</th>
                <th className="pb-3 font-semibold">Origen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentClicks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-500">
                    Aún no se han registrado clics.
                  </td>
                </tr>
              ) : (
                recentClicks.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 font-mono text-slate-300">
                      {new Date(c.created_at).toISOString().replace('T', ' ').slice(0, 16)} UTC
                    </td>
                    <td className="py-3 font-mono font-bold text-cyan-400">{c.sku}</td>
                    <td className="py-3 max-w-[320px] truncate text-slate-300" title={c.target_url}>
                      {c.target_url}
                    </td>
                    <td className="py-3 text-slate-400">
                      {c.attribution_data.utm_source || c.attribution_data.aic_src || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
