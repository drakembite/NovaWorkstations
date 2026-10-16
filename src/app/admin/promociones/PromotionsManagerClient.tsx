'use client';

import React, { useState } from 'react';
import {
  Tag,
  Plus,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Clock,
  Sparkles,
  Percent,
  DollarSign,
} from 'lucide-react';
import { Promotion, DiscountType } from '@/types/database';

interface PromotionsManagerClientProps {
  initialPromotions: Promotion[];
}

export function PromotionsManagerClient({ initialPromotions }: PromotionsManagerClientProps) {
  const [promotions, setPromotions] = useState<Promotion[]>(initialPromotions);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // New coupon form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [minPurchaseAmount, setMinPurchaseAmount] = useState('0');
  const [appliesToCategory, setAppliesToCategory] = useState('');
  const [startsAt, setStartsAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [endsAt, setEndsAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleCreatePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!code.trim()) {
      setFormError('El código del cupón es obligatorio');
      return;
    }

    if (!name.trim()) {
      setFormError('El nombre de la promoción es obligatorio');
      return;
    }

    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) {
      setFormError('El valor de descuento debe ser mayor a 0');
      return;
    }

    if (discountType === 'percentage' && val > 100) {
      setFormError('El porcentaje no puede ser mayor a 100%');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          description: description.trim(),
          discount_type: discountType,
          discount_value: val,
          min_purchase_amount: parseFloat(minPurchaseAmount) || 0,
          applies_to_category: appliesToCategory ? appliesToCategory.trim() : null,
          starts_at: new Date(startsAt).toISOString(),
          ends_at: new Date(endsAt).toISOString(),
          is_active: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error HTTP ${res.status}`);
      }

      const created: Promotion = await res.json();
      setPromotions((prev) => [created, ...prev]);
      setFormSuccess(`Cupón '${created.code}' creado con éxito.`);

      // Reset form
      setCode('');
      setName('');
      setDescription('');
      setDiscountValue('');
      setMinPurchaseAmount('0');
      setAppliesToCategory('');
    } catch (err: any) {
      setFormError(err.message || 'Error al crear la promoción');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (promo: Promotion) => {
    setTogglingId(promo.id);
    const nextStatus = !promo.is_active;

    try {
      const res = await fetch(`/api/admin/promotions/${promo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error HTTP ${res.status}`);
      }

      const updated: Promotion = await res.json();
      setPromotions((prev) =>
        prev.map((p) => (p.id === promo.id ? { ...p, is_active: updated.is_active } : p))
      );
    } catch (err: any) {
      alert(`Error al actualizar estado: ${err.message}`);
    } finally {
      setTogglingId(null);
    }
  };

  const getValidityBadge = (startsAt: string, endsAt: string, isActive: boolean) => {
    if (!isActive) {
      return (
        <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400 border border-slate-700">
          Inactivo
        </span>
      );
    }

    const now = new Date();
    const start = new Date(startsAt);
    const end = new Date(endsAt);

    if (now < start) {
      return (
        <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/30">
          Programado
        </span>
      );
    }
    if (now > end) {
      return (
        <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/30">
          Expirado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
        Activo
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Gestión de Promociones y Cupones
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Crea cupones con reglas de compra mínima, categorías asignadas y períodos de vigencia.
        </p>
      </div>

      {/* Grid: Form and Current Promos */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Form: Create new coupon (1 col) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm h-fit">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-cyan-400 border border-blue-500/20">
              <Plus className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-white">Crear Nuevo Cupón</h2>
          </div>

          <form onSubmit={handleCreatePromotion} className="mt-5 space-y-4">
            {formError && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 p-3 text-xs text-rose-400 border border-rose-500/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            {/* Code */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Código del Cupón *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="EJ. ESTUDIO20"
                className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 font-mono text-sm uppercase text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Nombre de la Campaña *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Descuento Arquitectura y Render"
                className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            {/* Discount Type & Value */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Tipo Descuento
                </label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="percentage">Porcentaje (%)</option>
                  <option value="fixed">Monto Fijo ($)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Valor *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === 'percentage' ? '15' : '100'}
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 font-mono text-sm text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            {/* Min Purchase & Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Compra Mínima ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={minPurchaseAmount}
                  onChange={(e) => setMinPurchaseAmount(e.target.value)}
                  placeholder="0.00"
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 font-mono text-sm text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Categoría
                </label>
                <select
                  value={appliesToCategory}
                  onChange={(e) => setAppliesToCategory(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-2 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="">Todas</option>
                  <option value="estaciones-de-trabajo">Estaciones</option>
                  <option value="monitores">Monitores</option>
                  <option value="accesorios">Accesorios</option>
                  <option value="componentes">Componentes</option>
                  <option value="ofertas">Ofertas</option>
                </select>
              </div>
            </div>

            {/* Dates: starts_at & ends_at */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Fecha Fin
                </label>
                <input
                  type="date"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Descripción (opcional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Condiciones del cupón o notas internas..."
                className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:from-blue-500 hover:to-cyan-500 transition-all disabled:opacity-50"
            >
              <Tag className="h-4 w-4" />
              <span>{isSubmitting ? 'Creando cupón...' : 'Guardar y Publicar Cupón'}</span>
            </button>
          </form>
        </div>

        {/* Table: Promotions List (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white">Promociones Existentes</h2>
              <p className="text-xs text-slate-400">
                Activa o desactiva cupones instantáneamente con el conmutador.
              </p>
            </div>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300 border border-slate-700">
              {promotions.length} promociones
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="pb-3 font-semibold">Código</th>
                  <th className="pb-3 font-semibold">Campaña / Reglas</th>
                  <th className="pb-3 font-semibold">Descuento</th>
                  <th className="pb-3 font-semibold">Vigencia</th>
                  <th className="pb-3 font-semibold text-right">Activo / Switch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {promotions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No hay cupones registrados.
                    </td>
                  </tr>
                ) : (
                  promotions.map((p) => {
                    const isToggling = togglingId === p.id;
                    return (
                      <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                        {/* Code */}
                        <td className="py-3 font-mono">
                          <span className="rounded-lg bg-blue-500/10 px-2 py-1 font-bold text-cyan-400 border border-blue-500/20">
                            {p.code}
                          </span>
                        </td>

                        {/* Name & rules */}
                        <td className="py-3 max-w-xs">
                          <div className="font-semibold text-slate-200 line-clamp-1">{p.name}</div>
                          <div className="mt-0.5 text-[11px] text-slate-400 flex items-center gap-2">
                            <span>Mínimo: US$ {Number(p.min_purchase_amount).toFixed(2)}</span>
                            {p.applies_to_category && (
                              <>
                                <span>•</span>
                                <span className="text-cyan-400">{p.applies_to_category}</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Discount */}
                        <td className="py-3 font-mono font-bold text-white">
                          {p.discount_type === 'percentage' ? (
                            <span className="text-emerald-400">{p.discount_value}% OFF</span>
                          ) : (
                            <span className="text-cyan-400">US$ {p.discount_value} OFF</span>
                          )}
                        </td>

                        {/* Validity dates */}
                        <td className="py-3">
                          <div className="flex flex-col gap-1">
                            {getValidityBadge(p.starts_at, p.ends_at, p.is_active)}
                            <span className="text-[10px] text-slate-500">
                              Hasta {new Date(p.ends_at).toLocaleDateString()}
                            </span>
                          </div>
                        </td>

                        {/* Toggle switch */}
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(p)}
                            disabled={isToggling}
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all border ${
                              p.is_active
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                                : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700 hover:text-slate-300'
                            } disabled:opacity-50`}
                            title={p.is_active ? 'Desactivar cupón' : 'Activar cupón'}
                          >
                            {p.is_active ? (
                              <>
                                <ToggleRight className="h-4 w-4 text-emerald-400" />
                                <span>Activo</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="h-4 w-4 text-slate-500" />
                                <span>Inactivo</span>
                              </>
                            )}
                          </button>
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
    </div>
  );
}
