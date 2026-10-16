'use client';

import React, { useState } from 'react';
import {
  ShoppingBag,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Tag,
  MapPin,
  Mail,
  User,
  Package,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Filter,
  DollarSign,
  Compass,
} from 'lucide-react';
import { Order, OrderStatus } from '@/types/database';

interface OrdersManagerClientProps {
  initialOrders: Order[];
}

export function OrdersManagerClient({ initialOrders }: OrdersManagerClientProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Expanded order row state (set of IDs)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // Refund Modal State
  const [refundModalOrder, setRefundModalOrder] = useState<Order | null>(null);
  const [isFullRefund, setIsFullRefund] = useState(true);
  const [partialAmount, setPartialAmount] = useState('');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'todos' || o.status === statusFilter;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      o.order_number.toString().includes(query) ||
      o.customer_name.toLowerCase().includes(query) ||
      o.customer_email.toLowerCase().includes(query) ||
      o.shipping_city.toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  const openRefundModal = (order: Order) => {
    setRefundModalOrder(order);
    setIsFullRefund(true);
    const remaining = Math.max(
      0,
      Number(order.total_paid_amount) - Number(order.refunded_amount || 0)
    );
    setPartialAmount(remaining.toFixed(2));
    setRefundError(null);
  };

  const closeRefundModal = () => {
    setRefundModalOrder(null);
    setRefundError(null);
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundModalOrder) return;

    setRefundError(null);
    const totalPaid = Number(refundModalOrder.total_paid_amount);
    const prevRefunded = Number(refundModalOrder.refunded_amount || 0);
    const remaining = Math.max(0, totalPaid - prevRefunded);

    let amount = remaining;
    if (!isFullRefund) {
      const parsed = parseFloat(partialAmount);
      if (isNaN(parsed) || parsed <= 0) {
        setRefundError('Ingrese un monto válido mayor a 0');
        return;
      }
      if (parsed > remaining) {
        setRefundError(`El monto excede el saldo restante reembolsable ($${remaining.toFixed(2)})`);
        return;
      }
      amount = parsed;
    }

    setIsProcessingRefund(true);
    try {
      const res = await fetch(`/api/admin/orders/${refundModalOrder.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_full: isFullRefund,
          refund_amount: amount,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error HTTP ${res.status}`);
      }

      const updatedOrder: Order = await res.json();

      // Update state immediately
      setOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o))
      );

      closeRefundModal();
      setToastMessage({
        type: 'success',
        text: `Reembolso exitoso para Pedido #${updatedOrder.order_number}: Estado actualizado a '${
          updatedOrder.status === 'refunded' ? 'Reembolsado Total' : 'Reembolso Parcial'
        }'`,
      });

      // Clear toast after 5s
      setTimeout(() => {
        setToastMessage(null);
      }, 5000);
    } catch (err: any) {
      setRefundError(err.message || 'Error al procesar el reembolso');
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const renderStatusBadge = (status: OrderStatus) => {
    if (status === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="h-3 w-3" />
          <span>Pagado</span>
        </span>
      );
    }
    if (status === 'partially_refunded') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/30">
          <RotateCcw className="h-3 w-3" />
          <span>Reembolso Parcial</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-bold text-rose-400 border border-rose-500/30">
        <RotateCcw className="h-3 w-3" />
        <span>Reembolsado</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl p-4 shadow-xl border backdrop-blur-md animate-in slide-in-from-bottom-4 ${
            toastMessage.type === 'success'
              ? 'bg-slate-900/95 text-emerald-400 border-emerald-500/40 shadow-emerald-950/50'
              : 'bg-slate-900/95 text-rose-400 border-rose-500/40 shadow-rose-950/50'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span className="text-sm font-semibold text-slate-100">{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-3 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Gestión de Pedidos y Devoluciones
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Supervisa compras, inspecciona datos de atribución y procesa reembolsos parciales o totales.
          </p>
        </div>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300 border border-slate-700">
          {filteredOrders.length} de {orders.length} pedidos
        </span>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:justify-between backdrop-blur-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por número de pedido, cliente, correo o ciudad..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filtrar por estado"
            className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="todos">Todos los estados</option>
            <option value="paid">Pagados</option>
            <option value="partially_refunded">Reembolso Parcial</option>
            <option value="refunded">Reembolsados</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg backdrop-blur-sm">
        <table className="w-full min-w-[950px] text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="py-3.5 pl-4 pr-2 font-semibold w-24">Pedido #</th>
              <th className="py-3.5 px-3 font-semibold w-48">Cliente / Correo</th>
              <th className="py-3.5 px-3 font-semibold w-32">Ciudad</th>
              <th className="py-3.5 px-3 font-semibold w-36">Estado</th>
              <th className="py-3.5 px-2 font-semibold text-right">Subtotal</th>
              <th className="py-3.5 px-2 font-semibold text-right">Total Pagado</th>
              <th className="py-3.5 px-2 font-semibold text-right">Reembolsado</th>
              <th className="py-3.5 pr-4 pl-3 font-semibold text-right w-44">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500 text-sm">
                  No se encontraron pedidos con los criterios seleccionados.
                </td>
              </tr>
            ) : (
              filteredOrders.map((o) => {
                const isExpanded = expandedOrders.has(o.id);
                const remainingRefundable = Math.max(
                  0,
                  Number(o.total_paid_amount) - Number(o.refunded_amount || 0)
                );
                const canRefund = o.status !== 'refunded' && remainingRefundable > 0;

                return (
                  <React.Fragment key={o.id}>
                    <tr
                      className={`transition-colors ${
                        isExpanded ? 'bg-slate-800/40' : 'hover:bg-slate-800/30'
                      }`}
                    >
                      {/* Order # */}
                      <td className="py-3.5 pl-4 pr-2 font-mono font-bold text-white">
                        <button
                          type="button"
                          onClick={() => toggleExpand(o.id)}
                          className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-bold"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          <span>#{o.order_number}</span>
                        </button>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-100">{o.customer_name}</div>
                        <div className="text-[11px] text-slate-400">{o.customer_email}</div>
                      </td>

                      {/* City */}
                      <td className="py-3.5 px-3 text-slate-300">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                          <span>{o.shipping_city}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">{renderStatusBadge(o.status)}</td>

                      {/* Subtotal */}
                      <td className="py-3.5 px-2 text-right font-mono text-slate-300">
                        US$ {Number(o.subtotal_amount).toFixed(2)}
                      </td>

                      {/* Total Paid */}
                      <td className="py-3.5 px-2 text-right font-mono font-bold text-white">
                        US$ {Number(o.total_paid_amount).toFixed(2)}
                      </td>

                      {/* Refunded Amount */}
                      <td className="py-3.5 px-2 text-right font-mono">
                        {Number(o.refunded_amount || 0) > 0 ? (
                          <span className="font-semibold text-amber-400">
                            -US$ {Number(o.refunded_amount).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-500">US$ 0.00</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pr-4 pl-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canRefund ? (
                            <button
                              type="button"
                              onClick={() => openRefundModal(o)}
                              className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/25 transition-all shadow-sm"
                              title="Procesar Devolución / Reembolso Total o Parcial"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>Reembolsar</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">Completado</span>
                          )}

                          <button
                            type="button"
                            onClick={() => toggleExpand(o.id)}
                            className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:text-white transition-colors"
                          >
                            {isExpanded ? 'Ocultar' : 'Detalles'}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable row: Items & Attribution */}
                    {isExpanded && (
                      <tr className="bg-slate-950/80">
                        <td colSpan={8} className="p-4 sm:p-6 border-b border-slate-800/80">
                          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            {/* Left: Items Purchased */}
                            <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
                              <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 border-b border-slate-800 pb-2">
                                <Package className="h-4 w-4 text-cyan-400" />
                                <span>Ítems Comprados ({o.items_json.length})</span>
                              </h4>
                              <div className="space-y-2">
                                {o.items_json.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/40 last:border-0"
                                  >
                                    <div>
                                      <div className="font-semibold text-slate-200">
                                        {item.title || item.sku}
                                      </div>
                                      <div className="font-mono text-[11px] text-cyan-400">
                                        SKU: {item.sku}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-mono text-slate-200">
                                        {item.quantity} x US$ {Number(item.unit_price).toFixed(2)}
                                      </div>
                                      <div className="font-mono font-bold text-white">
                                        US$ {(item.quantity * Number(item.unit_price)).toFixed(2)}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col gap-1 text-xs">
                                <div className="flex justify-between text-slate-400">
                                  <span>Subtotal:</span>
                                  <span className="font-mono">US$ {Number(o.subtotal_amount).toFixed(2)}</span>
                                </div>
                                {Number(o.discount_amount || 0) > 0 && (
                                  <div className="flex justify-between text-emerald-400">
                                    <span>Descuento ({o.coupon_code_used || 'Cupón'}):</span>
                                    <span className="font-mono">-US$ {Number(o.discount_amount).toFixed(2)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-slate-400">
                                  <span>Envío:</span>
                                  <span className="font-mono">US$ {Number(o.shipping_amount).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-white border-t border-slate-800/60 pt-1">
                                  <span>Total Pagado:</span>
                                  <span className="font-mono text-cyan-400">US$ {Number(o.total_paid_amount).toFixed(2)}</span>
                                </div>
                                {o.refunded_at && (
                                  <div className="flex justify-between text-amber-400 pt-1">
                                    <span>Fecha de Reembolso:</span>
                                    <span>{new Date(o.refunded_at).toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Right: Attribution & Shipping Details */}
                            <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
                              <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 border-b border-slate-800 pb-2">
                                <Compass className="h-4 w-4 text-purple-400" />
                                <span>Datos de Atribución y Entrega</span>
                              </h4>

                              <div className="space-y-2 text-xs">
                                <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/60">
                                  <span className="font-semibold text-slate-400 block mb-1">
                                    Dirección de Entrega:
                                  </span>
                                  <span className="text-slate-200">
                                    {o.shipping_address}, {o.shipping_city}
                                  </span>
                                </div>

                                <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/60">
                                  <span className="font-semibold text-slate-400 block mb-1.5">
                                    Atribución de Marketing (attribution_data):
                                  </span>
                                  {o.attribution_data && Object.keys(o.attribution_data).length > 0 ? (
                                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                                      {Object.entries(o.attribution_data).map(([key, value]) => (
                                        <div key={key} className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                                          <span className="text-cyan-400">{key}: </span>
                                          <span className="text-slate-300">{String(value)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-500 italic text-[11px]">
                                      Tráfico orgánico directo / Sin parámetros UTM detectados
                                    </span>
                                  )}
                                </div>

                                <div className="text-[11px] text-slate-500 pt-1">
                                  ID Transacción: <span className="font-mono text-slate-400">{o.id}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Refund Processing Modal */}
      {refundModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Procesar Devolución / Reembolso
                  </h3>
                  <p className="text-xs text-slate-400">
                    Pedido #{refundModalOrder.order_number} • {refundModalOrder.customer_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeRefundModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error Message */}
            {refundError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-500/10 p-3 text-xs text-rose-400 border border-rose-500/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{refundError}</span>
              </div>
            )}

            {/* Order Balance Overview */}
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-950 p-3 text-xs border border-slate-800/80">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Total Pagado</span>
                <span className="font-mono font-bold text-white">
                  US$ {Number(refundModalOrder.total_paid_amount).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Ya Reembolsado</span>
                <span className="font-mono text-amber-400">
                  US$ {Number(refundModalOrder.refunded_amount || 0).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Disponible</span>
                <span className="font-mono font-bold text-emerald-400">
                  US${' '}
                  {Math.max(
                    0,
                    Number(refundModalOrder.total_paid_amount) -
                      Number(refundModalOrder.refunded_amount || 0)
                  ).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Refund Options Form */}
            <form onSubmit={handleProcessRefund} className="mt-5 space-y-4">
              <div className="space-y-2.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
                  Modalidad de Reembolso
                </label>

                {/* Option 1: Full Refund */}
                <label
                  className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-all ${
                    isFullRefund
                      ? 'border-cyan-500/60 bg-cyan-950/20'
                      : 'border-slate-800 bg-slate-950/40 hover:bg-slate-800/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="refund_mode"
                    checked={isFullRefund}
                    onChange={() => setIsFullRefund(true)}
                    className="mt-0.5 text-cyan-500 focus:ring-cyan-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Reembolso Total del Saldo Restante
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Reintegrar US${' '}
                      {Math.max(
                        0,
                        Number(refundModalOrder.total_paid_amount) -
                          Number(refundModalOrder.refunded_amount || 0)
                      ).toFixed(2)}{' '}
                      y marcar pedido como <strong className="text-rose-400">Reembolsado</strong>.
                    </span>
                  </div>
                </label>

                {/* Option 2: Partial Refund */}
                <label
                  className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-all ${
                    !isFullRefund
                      ? 'border-cyan-500/60 bg-cyan-950/20'
                      : 'border-slate-800 bg-slate-950/40 hover:bg-slate-800/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="refund_mode"
                    checked={!isFullRefund}
                    onChange={() => setIsFullRefund(false)}
                    className="mt-0.5 text-cyan-500 focus:ring-cyan-500"
                  />
                  <div className="w-full">
                    <span className="text-xs font-bold text-white block">
                      Reembolso Parcial Personalizado
                    </span>
                    <span className="text-[11px] text-slate-400 block mb-2">
                      Aplica un monto específico y marca como{' '}
                      <strong className="text-amber-400">Reembolso Parcial</strong>.
                    </span>

                    {!isFullRefund && (
                      <div className="relative mt-2">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                          US$
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={Math.max(
                            0,
                            Number(refundModalOrder.total_paid_amount) -
                              Number(refundModalOrder.refunded_amount || 0)
                          )}
                          value={partialAmount}
                          onChange={(e) => setPartialAmount(e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-2 font-mono text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                          placeholder="0.00"
                          required={!isFullRefund}
                        />
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeRefundModal}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessingRefund}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-600/20 hover:from-amber-500 hover:to-rose-500 transition-all disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>
                    {isProcessingRefund ? 'Procesando Reembolso...' : 'Confirmar Reembolso'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
