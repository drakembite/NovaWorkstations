import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { absoluteUrl, STORE_NAME } from '@/lib/catalog';
import {
  DEMO_POLICY_LABEL,
  DESTINATION_STORE_NOTE,
  DISPATCH_CUTOFF_LABEL,
  FREE_SHIPPING_LABEL,
  LIMA_DELIVERY_SHORT,
  POLICY_SHIPPING_SUMMARY,
  PROVINCES_DELIVERY_SHORT,
  SHIPPING_ZONES,
  STORE_POLICY,
} from '@/lib/store-policy';
import {
  Truck,
  Clock,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  PackageCheck,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

const PAGE_PATH = '/envios-y-entregas';
const PAGE_DESCRIPTION = `${DEMO_POLICY_LABEL}: entrega en ${LIMA_DELIVERY_SHORT} en Lima Metropolitana, ${PROVINCES_DELIVERY_SHORT} a nivel nacional, corte a las ${DISPATCH_CUTOFF_LABEL} y envío gratis en compras mayores a ${FREE_SHIPPING_LABEL}. Esta tienda no vende ni despacha.`;

export const metadata: Metadata = {
  // The root layout title template appends the store name.
  title: 'Envíos y Tiempos de Entrega',
  description: PAGE_DESCRIPTION,
  alternates: { canonical: absoluteUrl(PAGE_PATH) },
  openGraph: {
    type: 'website',
    locale: 'es_PE',
    siteName: STORE_NAME,
    url: absoluteUrl(PAGE_PATH),
    title: 'Envíos y Tiempos de Entrega | ' + STORE_NAME,
    description: PAGE_DESCRIPTION,
  },
};

export default function EnviosPage() {
  return (
    <div className="py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header Breadcrumb & Title */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3 py-1 text-xs font-semibold text-cyan-400">
            <Truck className="h-3.5 w-3.5" />
            <span>{DEMO_POLICY_LABEL}</span>
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Envíos y Tiempos de Entrega
          </h1>
          <p className="mt-3 text-base text-slate-400 sm:mx-auto sm:max-w-2xl">
            Estos son los plazos y tarifas de envío que declara la tienda de demostración para el Perú. {POLICY_SHIPPING_SUMMARY}
          </p>
          <p className="mt-4 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-xs leading-relaxed text-slate-300 sm:mx-auto sm:max-w-2xl">
            {DESTINATION_STORE_NOTE}
          </p>
        </div>

        {/* 4 Key Highlight Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm hover:border-slate-700 transition-colors">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-cyan-400 border border-blue-500/20 mb-4">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-white">Hora de Corte</h3>
            <p className="mt-2 text-2xl font-bold text-cyan-400">{DISPATCH_CUTOFF_LABEL}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Las compras confirmadas antes de las {DISPATCH_CUTOFF_LABEL} salen el mismo día hábil.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm hover:border-slate-700 transition-colors">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-4">
              <Truck className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-white">Lima Metropolitana</h3>
            <p className="mt-2 text-2xl font-bold text-indigo-400">{STORE_POLICY.limaDeliveryHours} horas</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Entrega con manipuladores capacitados en transporte de equipo sensible.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm hover:border-slate-700 transition-colors">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-4">
              <MapPin className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-white">Provincias</h3>
            <p className="mt-2 text-2xl font-bold text-purple-400">{STORE_POLICY.provincesDeliveryHours.replace('-', ' - ')} hrs</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Cobertura a nivel nacional con couriers certificados de alto valor y seguimiento del envío.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm hover:border-slate-700 transition-colors">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
              <PackageCheck className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-white">Envío Gratuito</h3>
            <p className="mt-2 text-2xl font-bold text-emerald-400">&gt; {FREE_SHIPPING_LABEL}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Envío 100% bonificado en todas las compras superiores a {FREE_SHIPPING_LABEL} (dólares americanos).
            </p>
          </div>
        </div>

        {/* Detailed Shipping Table */}
        <div className="mt-12 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
          <div className="border-b border-slate-800 px-6 py-4">
            <h2 className="text-lg font-bold text-white">Tarifas y Tiempos por Destino</h2>
            <p className="text-xs text-slate-400 mt-1">
              Según la política declarada, todos los envíos incluyen seguro contra pérdida o daños durante el transporte.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/70 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">Zona de Destino</th>
                  <th className="px-6 py-3.5">Plazo Promedio</th>
                  <th className="px-6 py-3.5">Costo (&lt; {FREE_SHIPPING_LABEL})</th>
                  <th className="px-6 py-3.5">Costo (&ge; {FREE_SHIPPING_LABEL})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {SHIPPING_ZONES.map((zone) => (
                  <tr key={zone.zone} className="hover:bg-slate-800/30">
                    <td className="px-6 py-4 font-medium text-white">{zone.zone}</td>
                    <td className="px-6 py-4">{zone.leadTime}</td>
                    <td className="px-6 py-4">{`US$ ${zone.feeBelowThresholdUsd.toFixed(2)}`}</td>
                    <td className="px-6 py-4 font-semibold text-emerald-400">GRATIS</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Packaging & Safety Protocols */}
        <div className="mt-12 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Protocolo de Embalaje Profesional</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Las estaciones de trabajo y monitores de alta precisión requieren un manejo riguroso. Según la política declarada, cada paquete cuenta con:
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs text-slate-300">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Espuma anti-estática de alta densidad moldeada a medida.</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Caja exterior reforzada con precintos de seguridad holográficos.</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Protección interna para tarjetas gráficas y disipadores pesados.</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Póliza de seguro integral activa desde el almacén hasta la entrega.</span>
            </li>
          </ul>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/categoria/estaciones-de-trabajo"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-cyan-400 transition-all"
          >
            <span>Explorar Estaciones de Trabajo</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
