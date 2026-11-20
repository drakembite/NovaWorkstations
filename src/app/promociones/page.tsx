import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { absoluteUrl, STORE_NAME } from '@/lib/catalog';
import { Tag, ArrowRight, Info } from 'lucide-react';
import { Promotion } from '@/types/database';
import { getPromotions } from '@/lib/db';
import { CouponCard } from '@/components/CouponCard';
import { getReferenceRate } from '@/lib/exchange-rate';
import { DESTINATION_STORE_NOTE } from '@/lib/store-policy';

const PAGE_PATH = '/promociones';
const PAGE_TITLE = 'Promociones y ofertas';
const PAGE_DESCRIPTION =
  'Esta tienda no publica cupones propios. El precio final y las ofertas vigentes de cada producto los define la tienda de destino donde se completa la compra.';

export const metadata: Metadata = {
  // The root layout title template appends the store name.
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: absoluteUrl(PAGE_PATH) },
  openGraph: {
    type: 'website',
    locale: 'es_PE',
    siteName: STORE_NAME,
    url: absoluteUrl(PAGE_PATH),
    title: PAGE_TITLE + ' | ' + STORE_NAME,
    description: PAGE_DESCRIPTION,
  },
};

// Coupons an admin activates must show at once, so the page is never prerendered.
export const dynamic = 'force-dynamic';

export default async function PromocionesPage() {
  let promotions: Promotion[] = [];
  try {
    const all = await getPromotions();
    promotions = all.filter((p) => p.is_active);
  } catch (err) {
    console.warn('[Promociones] Error fetching promotions:', err);
  }

  // Server-side read, passed down as a plain number: null shows USD only.
  const referenceRate = promotions.length > 0 ? await getReferenceRate() : null;
  const rate = referenceRate ? referenceRate.rate : null;

  return (
    <div className="py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{PAGE_TITLE}</h1>
          <p className="mt-3 text-base text-slate-400 sm:mx-auto sm:max-w-2xl">{PAGE_DESCRIPTION}</p>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Info className="h-5 w-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Cómo ver el precio y las ofertas vigentes</h2>
          </div>
          <ul className="list-disc list-inside space-y-2 text-sm text-slate-300">
            <li>Cada ficha muestra un precio de referencia en dólares y su equivalente aproximado en soles.</li>
            <li>
              El botón «Comprar» lleva a la tienda de destino: allí se ven el precio final y cualquier descuento
              vigente en ese momento.
            </li>
            <li>{DESTINATION_STORE_NOTE}</li>
          </ul>
        </section>

        {promotions.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-cyan-400" />
                <h2 className="text-xl font-bold text-white">Cupones vigentes</h2>
              </div>
              <span className="text-xs text-slate-400">{promotions.length} cupón(es) activo(s)</span>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {promotions.map((promo) => (
                <CouponCard key={promo.id} promotion={promo} rate={rate} />
              ))}
            </div>
          </section>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/categoria/estaciones-de-trabajo"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 transition-all font-bold"
          >
            <span>Ir al Catálogo</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
