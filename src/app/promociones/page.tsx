import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { absoluteUrl, STORE_NAME } from '@/lib/catalog';
import {
  Tag,
  Sparkles,
  Calendar,
  Percent,
  ArrowRight,
  ShieldAlert,
  Flame,
} from 'lucide-react';
import { Promotion } from '@/types/database';
import { getPromotions } from '@/lib/db';
import { CouponCard } from '@/components/CouponCard';

const PAGE_PATH = '/promociones';
const PAGE_DESCRIPTION =
  'Aprovecha nuestros cupones y promociones exclusivas en estaciones de trabajo, monitores y componentes de alto rendimiento.';

export const metadata: Metadata = {
  // The root layout title template appends the store name.
  title: 'Promociones y Cupones Vigentes',
  description: PAGE_DESCRIPTION,
  alternates: { canonical: absoluteUrl(PAGE_PATH) },
  openGraph: {
    type: 'website',
    locale: 'es_PE',
    siteName: STORE_NAME,
    url: absoluteUrl(PAGE_PATH),
    title: 'Promociones y Cupones Vigentes | ' + STORE_NAME,
    description: PAGE_DESCRIPTION,
  },
};

export default async function PromocionesPage() {
  let promotions: Promotion[] = [];
  try {
    const all = await getPromotions();
    // Filter active promotions
    promotions = all.filter((p) => p.is_active);
  } catch (err) {
    console.warn('[Promociones] Error fetching promotions:', err);
  }

  const COMMERCIAL_EVENTS = [
    {
      quarter: 'Q1 - Marzo',
      title: 'Cyber Pro Hardware Kickoff',
      description: 'Campañas de inicio de año con 10% de descuento en estaciones móviles y periféricos de precisión.',
      status: 'Finalizado',
    },
    {
      quarter: 'Q3 - Julio',
      title: 'Especial Fiestas Patrias',
      description: 'Descuentos conmemorativos en laptops y torres para arquitectos y creadores audiovisuales.',
      status: 'Finalizado',
    },
    {
      quarter: 'Q4 - Octubre',
      title: 'Tech Architecture & CAD Days',
      description: 'Promoción activa en hardware certificado para Revit, AutoCAD, Blender y Unreal Engine.',
      status: 'Vigente Ahora',
      highlight: true,
    },
    {
      quarter: 'Q4 - Noviembre',
      title: 'Black Friday & Cyber Monday Pro',
      description: 'Nuestra mayor campaña del año con 15% OFF en workstations de gama alta con código BLACKFRIDAY15.',
      status: 'Próximamente',
      highlight: true,
    },
    {
      quarter: 'Q4 - Diciembre',
      title: 'Renovación Tecnológica Corporativa',
      description: 'Precios especiales por volumen de estaciones de trabajo para estudios y productoras.',
      status: 'Planificado',
    },
  ];

  return (
    <div className="py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Hero Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-950/40 px-3 py-1 text-xs font-semibold text-amber-400">
            <Flame className="h-3.5 w-3.5" />
            <span>Beneficios Comerciales Exclusivos</span>
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Cupones y Promociones Vigentes
          </h1>
          <p className="mt-3 text-base text-slate-400 sm:mx-auto sm:max-w-2xl">
            Aplica estos códigos durante el proceso de compra para acceder a descuentos automáticos en hardware profesional.
          </p>
        </div>

        {/* Active Coupons Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-cyan-400" />
              <h2 className="text-xl font-bold text-white">Cupones Disponibles</h2>
            </div>
            <span className="text-xs text-slate-400">
              {promotions.length} cupón(es) activo(s)
            </span>
          </div>

          {promotions.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {promotions.map((promo) => (
                <CouponCard key={promo.id} promotion={promo} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">
              <p>No hay cupones activos en este momento. Revisa nuestro calendario de eventos.</p>
            </div>
          )}
        </section>

        {/* Commercial Events Calendar */}
        <section className="mt-16">
          <div className="flex items-center gap-2.5 mb-6">
            <Calendar className="h-5 w-5 text-indigo-400" />
            <div>
              <h2 className="text-xl font-bold text-white">Calendario de Eventos Comerciales 2026</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Fechas clave de rebajas anuales y campañas para estudios de diseño e ingeniería.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {COMMERCIAL_EVENTS.map((event, idx) => (
              <div
                key={idx}
                className={`flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border p-5 transition-all ${
                  event.highlight
                    ? 'border-indigo-500/40 bg-gradient-to-r from-slate-900/90 to-indigo-950/30'
                    : 'border-slate-800 bg-slate-900/40'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-slate-400 font-mono">
                      {event.quarter}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        event.status === 'Vigente Ahora'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : event.status === 'Próximamente'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {event.status}
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-base font-bold text-white">{event.title}</h3>
                  <p className="mt-1 text-xs text-slate-400">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Rules & Terms */}
        <section className="mt-14 rounded-2xl border border-slate-800 bg-slate-900/30 p-6 sm:p-8">
          <h3 className="text-base font-bold text-white mb-3">Términos y Condiciones de Cupones</h3>
          <ul className="list-disc list-inside space-y-2 text-xs text-slate-400">
            <li>Los cupones deben introducirse en el campo &quot;Cupón de Descuento&quot; en la página del carrito antes de finalizar la orden.</li>
            <li>No son transferibles a dinero en efectivo ni acumulables entre sí en una misma transacción.</li>
            <li>El descuento se aplica sobre el subtotal de los productos aplicables, no sobre el costo de flete.</li>
            <li>NovaWorkstations se reserva el derecho de dar por concluida una campaña anticipadamente en caso de agotamiento de inventario.</li>
          </ul>
        </section>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/categoria/estaciones-de-trabajo"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 transition-all font-bold"
          >
            <span>Ir al Catálogo y Aplicar Cupones</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
