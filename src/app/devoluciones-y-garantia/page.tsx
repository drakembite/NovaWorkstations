import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { absoluteUrl, STORE_NAME } from '@/lib/catalog';
import {
  DEMO_POLICY_LABEL,
  DESTINATION_STORE_NOTE,
  NO_MAILBOX_NOTE,
  RETURN_WINDOW_LABEL,
  STORE_POLICY,
  WARRANTY_LABEL,
} from '@/lib/store-policy';
import {
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  Clock,
  ArrowRight,
  Shield,
  FileCheck,
  Zap,
} from 'lucide-react';

const PAGE_PATH = '/devoluciones-y-garantia';
const PAGE_DESCRIPTION = `${DEMO_POLICY_LABEL}: ${RETURN_WINDOW_LABEL} de devolución sin costo y ${WARRANTY_LABEL} de garantía de fábrica. Esta tienda no vende: la compra se rige por la tienda donde compres.`;

export const metadata: Metadata = {
  // The root layout title template appends the store name.
  title: 'Devoluciones y Garantía de Fábrica',
  description: PAGE_DESCRIPTION,
  alternates: { canonical: absoluteUrl(PAGE_PATH) },
  openGraph: {
    type: 'website',
    locale: 'es_PE',
    siteName: STORE_NAME,
    url: absoluteUrl(PAGE_PATH),
    title: 'Devoluciones y Garantía de Fábrica | ' + STORE_NAME,
    description: PAGE_DESCRIPTION,
  },
};

export default function DevolucionesGarantiaPage() {
  return (
    <div className="py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header Breadcrumb & Title */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-950/40 px-3 py-1 text-xs font-semibold text-indigo-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{DEMO_POLICY_LABEL}</span>
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Devoluciones y Garantía de Fábrica
          </h1>
          <p className="mt-3 text-base text-slate-400 sm:mx-auto sm:max-w-2xl">
            Esta es la política de devoluciones y garantía que declara la tienda de demostración.
          </p>
          <p className="mt-4 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-xs leading-relaxed text-slate-300 sm:mx-auto sm:max-w-2xl">
            {DESTINATION_STORE_NOTE} {NO_MAILBOX_NOTE}
          </p>
        </div>

        {/* 2 Main Pillar Cards */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Card 1: return window */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-cyan-400 border border-blue-500/20">
                <RotateCcw className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  Satisfacción Garantizada
                </span>
                <h2 className="text-xl font-bold text-white">{STORE_POLICY.returnDays} Días de Devolución Gratuita</h2>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              Según la política declarada, si el equipo no se ajusta a tus requisitos de rendimiento o flujo de trabajo, dispones de <strong className="text-white">{RETURN_WINDOW_LABEL} calendario</strong> desde la entrega física para solicitar un cambio o el reembolso total de tu dinero.
            </p>

            <div className="mt-6 space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Sin penalidades:</strong> Cero costo por reposición o re-stocking.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Recojo gratuito:</strong> Coordinamos la recolección en tu domicilio o estudio en Lima sin costo adicional.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Reembolso rápido:</strong> Liquidación en el mismo medio de pago dentro de las {STORE_POLICY.refundHours}h tras la verificación.</span>
              </div>
            </div>
          </div>

          {/* Card 2: warranty */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Respaldo de Hardware
                </span>
                <h2 className="text-xl font-bold text-white">{STORE_POLICY.warrantyMonths} Meses de Garantía de Fábrica</h2>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              Según la política declarada, los equipos incluyen un mínimo de <strong className="text-white">{WARRANTY_LABEL} de garantía oficial</strong> contra defectos de fabricación en componentes principales.
            </p>

            <div className="mt-6 space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Componentes cubiertos:</strong> CPU, GPU, tarjeta madre, módulos RAM, discos SSD, fuente de poder y panel OLED/IPS.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Diagnóstico prioritario:</strong> Laboratorio técnico especializado con respuesta en menos de {STORE_POLICY.warrantyDiagnosisHours} horas.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Repuestos genuinos:</strong> Reemplazo exclusivo por componentes originales certificados por la marca.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step-by-Step Return & Warranty Process */}
        <div className="mt-14">
          <h2 className="text-center text-2xl font-bold text-white">
            ¿Cómo Solicitar una Devolución o Servicio de Garantía?
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            Pasos de la política declarada. Al comprar fuera de esta tienda de demostración, se tramitan con la tienda donde compres.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 font-bold text-sm mb-3">
                1
              </div>
              <h3 className="font-semibold text-white text-sm">Registro de Solicitud</h3>
              <p className="mt-1.5 text-xs text-slate-400">
                Contacta a la tienda donde compres (esta tienda de demostración no tiene buzón de atención al cliente) con tu número de compra y la descripción del motivo.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-sm mb-3">
                2
              </div>
              <h3 className="font-semibold text-white text-sm">Recojo Programado</h3>
              <p className="mt-1.5 text-xs text-slate-400">
                La tienda te envía la guía de retorno y coordina el recojo de la unidad en tu dirección.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 font-bold text-sm mb-3">
                3
              </div>
              <h3 className="font-semibold text-white text-sm">Inspección de Taller</h3>
              <p className="mt-1.5 text-xs text-slate-400">
                Los ingenieros de hardware validan el equipo y confirman la solución en {STORE_POLICY.returnInspectionHours} horas.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-sm mb-3">
                4
              </div>
              <h3 className="font-semibold text-white text-sm">Cierre Inmediato</h3>
              <p className="mt-1.5 text-xs text-slate-400">
                Se efectúa la sustitución del componente, envío de equipo nuevo o el reembolso íntegro.
              </p>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="mt-14 rounded-2xl border border-slate-800 bg-slate-900/30 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6">
            <HelpCircle className="h-5 w-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-white">Condiciones para Devoluciones</h3>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-300">
            <div>
              <h4 className="font-semibold text-white">¿En qué estado debe estar el producto para devolverlo?</h4>
              <p className="mt-1 text-slate-400">
                El producto debe incluir su caja original, sellos de serie intactos, cables, cargador, manuales y sin evidencia de manipulación física no autorizada o derrame de líquidos.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white">¿Qué ocurre si un componente falla dentro del periodo de garantía?</h4>
              <p className="mt-1 text-slate-400">
                Está cubierto al 100% por la garantía de {WARRANTY_LABEL}. Se repara o se sustituye la pieza fallida por una nueva original sin costo de mano de obra ni repuesto.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/categoria/estaciones-de-trabajo"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 transition-all"
          >
            <span>Ver Hardware con Garantía Oficial</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
