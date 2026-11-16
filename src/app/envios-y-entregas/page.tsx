import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { absoluteUrl, STORE_NAME } from '@/lib/catalog';
import { DEMO_POLICY_LABEL, DESTINATION_STORE_NOTE, POLICY_SHIPPING_SUMMARY } from '@/lib/store-policy';
import { Truck, Clock, MapPin, Wallet, ArrowRight } from 'lucide-react';

const PAGE_PATH = '/envios-y-entregas';
const PAGE_TITLE = 'Envíos y Entregas';
const PAGE_DESCRIPTION = `${POLICY_SHIPPING_SUMMARY} Esta tienda es un intermediario: la compra y el envío se realizan en la tienda de destino.`;

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
    title: `${PAGE_TITLE} | ${STORE_NAME}`,
    description: PAGE_DESCRIPTION,
  },
};

const DESTINATION_STORE_DEFINES = [
  {
    title: 'Plazos de entrega',
    body: 'La tienda donde compres indica cuándo despacha y cuánto tarda la entrega, según el producto y tu ubicación.',
    Icon: Clock,
    tone: 'bg-blue-500/10 text-cyan-400 border-blue-500/20',
  },
  {
    title: 'Costos de envío',
    body: 'El costo del envío, si lo hay, lo muestra la tienda de destino antes de que pagues.',
    Icon: Wallet,
    tone: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  {
    title: 'Cobertura',
    body: 'Las zonas y direcciones a las que se puede enviar las define esa tienda, no NovaWorkstations.',
    Icon: MapPin,
    tone: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
];

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
            Envíos y Entregas
          </h1>
          <p className="mt-3 text-base text-slate-400 sm:mx-auto sm:max-w-2xl">
            NovaWorkstations no despacha productos. {POLICY_SHIPPING_SUMMARY}
          </p>
          <p className="mt-4 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-xs leading-relaxed text-slate-300 sm:mx-auto sm:max-w-2xl">
            {DESTINATION_STORE_NOTE}
          </p>
        </div>

        {/* What the destination store defines */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {DESTINATION_STORE_DEFINES.map(({ title, body, Icon, tone }) => (
            <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm hover:border-slate-700 transition-colors">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl border mb-4 ${tone}`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-white">{title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{body}</p>
            </div>
          ))}
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
