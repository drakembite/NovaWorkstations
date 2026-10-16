'use client';

import React, { useState } from 'react';
import { Tag, Copy, Check, Calendar, AlertCircle } from 'lucide-react';
import { Promotion } from '@/types/database';

interface CouponCardProps {
  promotion: Promotion;
}

export function CouponCard({ promotion }: CouponCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promotion.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const discountLabel =
    promotion.discount_type === 'percentage'
      ? `${promotion.discount_value}% OFF`
      : `US$ ${promotion.discount_value.toFixed(2)} OFF`;

  const endDate = new Date(promotion.ends_at).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const isUpcoming = new Date(promotion.starts_at) > new Date();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-md transition-all hover:border-cyan-500/40 hover:shadow-cyan-500/5">
      {/* Background Accent glow */}
      <div className="absolute -top-12 -right-12 h-28 w-28 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-bold text-cyan-400 border border-cyan-500/20">
            <Tag className="h-3 w-3" />
            {discountLabel}
          </span>
          {isUpcoming && (
            <span className="ml-2 inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-400 border border-amber-500/20">
              Próximamente
            </span>
          )}
        </div>
        <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Hasta {endDate}
        </span>
      </div>

      <h3 className="mt-3 text-lg font-bold text-white">{promotion.name}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
        {promotion.description}
      </p>

      {/* Rules Pill */}
      <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-300">
        {promotion.min_purchase_amount > 0 && (
          <span className="rounded-md bg-slate-800/80 px-2 py-1 border border-slate-700/60">
            Mínimo: US$ {promotion.min_purchase_amount.toFixed(2)}
          </span>
        )}
        {promotion.applies_to_category ? (
          <span className="rounded-md bg-slate-800/80 px-2 py-1 border border-slate-700/60">
            Categoría: {promotion.applies_to_category}
          </span>
        ) : (
          <span className="rounded-md bg-slate-800/80 px-2 py-1 border border-slate-700/60">
            Válido en todo el catálogo
          </span>
        )}
      </div>

      {/* Coupon Code & Copy Action */}
      <div className="mt-6 flex items-center justify-between rounded-xl border border-dashed border-cyan-500/40 bg-slate-950/80 p-3">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Código Promocional
          </span>
          <span className="font-mono text-base font-extrabold tracking-widest text-cyan-400">
            {promotion.code}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
            copied
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
              : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/20'
          }`}
          aria-label={`Copiar código ${promotion.code}`}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>¡Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
