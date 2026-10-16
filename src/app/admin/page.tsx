import React from 'react';
import Link from 'next/link';
import {
  DollarSign,
  ShoppingBag,
  Package,
  Tag,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { getProducts, getOrders, getPromotions } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const [products, orders, promotions] = await Promise.all([
    getProducts(),
    getOrders(),
    getPromotions(),
  ]);

  // Executive metrics calculation
  const totalNetSales = orders.reduce((sum, order) => {
    const net = Number(order.total_paid_amount) - Number(order.refunded_amount || 0);
    return sum + Math.max(0, net);
  }, 0);

  const totalOrders = orders.length;
  const totalProducts = products.length;
  const activePromotionsCount = promotions.filter((p) => p.is_active).length;

  // Stock alerts: stock_quantity <= 5
  const lowStockProducts = products
    .filter((p) => p.stock_quantity <= 5)
    .sort((a, b) => a.stock_quantity - b.stock_quantity);

  // Recent orders preview (top 5)
  const recentOrders = orders.slice(0, 6);

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
              Ventas Totales Netas
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              US$ {totalNetSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-xs text-emerald-400">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Ingresos deducidos de reembolsos</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Total Pedidos */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Total Pedidos
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-cyan-400 border border-blue-500/20">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {totalOrders}
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-400">
              <span>Registrados en base de datos</span>
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
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
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
                  <span>Edición Rápida de Precios</span>
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
                href="/admin/pedidos"
                className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-800/40 p-3 text-sm font-medium text-slate-200 hover:border-slate-700 hover:bg-slate-800 hover:text-white transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <RotateCcw className="h-4 w-4 text-amber-400" />
                  <span>Procesar Devoluciones</span>
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
              Catálogo sincronizado en tiempo real con disparadores de webhooks activos para integraciones ERP y sistemas de facturación externa.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Orders Preview Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white">Últimos Pedidos Registrados</h2>
            <p className="text-xs text-slate-400">Actividad reciente de compras y transacciones</p>
          </div>
          <Link
            href="/admin/pedidos"
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <span>Ver todos los pedidos</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="pb-3 font-semibold">Pedido #</th>
                <th className="pb-3 font-semibold">Cliente</th>
                <th className="pb-3 font-semibold">Ciudad</th>
                <th className="pb-3 font-semibold">Estado</th>
                <th className="pb-3 font-semibold text-right">Total Pagado</th>
                <th className="pb-3 font-semibold text-right">Reembolsado</th>
                <th className="pb-3 font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">
                    Aún no se han registrado pedidos.
                  </td>
                </tr>
              ) : (
                recentOrders.map((o) => {
                  return (
                    <tr key={o.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 font-mono font-bold text-white">
                        #{o.order_number}
                      </td>
                      <td className="py-3">
                        <div className="font-semibold text-slate-200">{o.customer_name}</div>
                        <div className="text-slate-400">{o.customer_email}</div>
                      </td>
                      <td className="py-3 text-slate-300">{o.shipping_city}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            o.status === 'paid'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : o.status === 'partially_refunded'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {o.status === 'paid'
                            ? 'Pagado'
                            : o.status === 'partially_refunded'
                            ? 'Reembolso Parcial'
                            : 'Reembolsado'}
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono font-semibold text-white">
                        US$ {Number(o.total_paid_amount).toFixed(2)}
                      </td>
                      <td className="py-3 text-right font-mono text-slate-400">
                        {Number(o.refunded_amount || 0) > 0 ? (
                          <span className="text-amber-400">
                            -US$ {Number(o.refunded_amount).toFixed(2)}
                          </span>
                        ) : (
                          'US$ 0.00'
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href="/admin/pedidos"
                          className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-200 hover:border-cyan-500/50 hover:text-cyan-400 transition-colors"
                        >
                          Gestionar
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
