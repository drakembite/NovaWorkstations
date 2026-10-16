import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
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

export const metadata: Metadata = {
  title: 'Envíos y Tiempos de Entrega | NovaWorkstations',
  description:
    'Conoce nuestras políticas de despacho: entrega en 24h en Lima Metropolitana, 48-72h a nivel nacional, corte a las 16:00 hrs y envío gratis en compras mayores a US$ 150.',
};

export default function EnviosPage() {
  return (
    <div className="py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header Breadcrumb & Title */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3 py-1 text-xs font-semibold text-cyan-400">
            <Truck className="h-3.5 w-3.5" />
            <span>Logística y Despacho Especializado</span>
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Envíos y Tiempos de Entrega
          </h1>
          <p className="mt-3 text-base text-slate-400 sm:mx-auto sm:max-w-2xl">
            Entregamos hardware de grado profesional con embalaje reforzado y trazabilidad en tiempo real en todo el Perú.
          </p>
        </div>

        {/* 4 Key Highlight Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm hover:border-slate-700 transition-colors">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-cyan-400 border border-blue-500/20 mb-4">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-white">Hora de Corte</h3>
            <p className="mt-2 text-2xl font-bold text-cyan-400">16:00 hrs</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Pedidos recibidos antes de las 4:00 PM ingresan a la ruta de preparación y salida del mismo día hábil.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm hover:border-slate-700 transition-colors">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-4">
              <Truck className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-white">Lima Metropolitana</h3>
            <p className="mt-2 text-2xl font-bold text-indigo-400">24 horas</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Despacho con flota propia especializada y manipuladores capacitados en transporte de equipo sensible.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm hover:border-slate-700 transition-colors">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-4">
              <MapPin className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-white">Provincias</h3>
            <p className="mt-2 text-2xl font-bold text-purple-400">48 - 72 hrs</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Cobertura a nivel nacional con couriers certificados de alto valor y guía de remisión electrónica rastreable.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm hover:border-slate-700 transition-colors">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
              <PackageCheck className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-white">Envío Gratuito</h3>
            <p className="mt-2 text-2xl font-bold text-emerald-400">&gt; US$ 150</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Envío 100% bonificado en todas las compras superiores a ciento cincuenta dólares americanos.
            </p>
          </div>
        </div>

        {/* Detailed Shipping Table */}
        <div className="mt-12 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
          <div className="border-b border-slate-800 px-6 py-4">
            <h2 className="text-lg font-bold text-white">Tarifas y Tiempos por Destino</h2>
            <p className="text-xs text-slate-400 mt-1">
              Todos los envíos incluyen seguro contra pérdida o daños durante el transporte.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/70 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">Zona de Destino</th>
                  <th className="px-6 py-3.5">Plazo Promedio</th>
                  <th className="px-6 py-3.5">Costo (&lt; US$ 150)</th>
                  <th className="px-6 py-3.5">Costo (&ge; US$ 150)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                <tr className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 font-medium text-white">Lima Metropolitana y Callao</td>
                  <td className="px-6 py-4">Hasta 24 horas hábiles</td>
                  <td className="px-6 py-4">US$ 10.00</td>
                  <td className="px-6 py-4 font-semibold text-emerald-400">GRATIS</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 font-medium text-white">Ciudades Principales de Costa (Trujillo, Chiclayo, Piura, Ica)</td>
                  <td className="px-6 py-4">48 horas hábiles</td>
                  <td className="px-6 py-4">US$ 18.00</td>
                  <td className="px-6 py-4 font-semibold text-emerald-400">GRATIS</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 font-medium text-white">Sierra y Sur (Arequipa, Cusco, Huancayo, Puno)</td>
                  <td className="px-6 py-4">48 a 72 horas hábiles</td>
                  <td className="px-6 py-4">US$ 18.00</td>
                  <td className="px-6 py-4 font-semibold text-emerald-400">GRATIS</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 font-medium text-white">Selva y Destinos Especiales (Iquitos, Pucallpa, Tarapoto)</td>
                  <td className="px-6 py-4">72 a 96 horas hábiles</td>
                  <td className="px-6 py-4">US$ 25.00</td>
                  <td className="px-6 py-4 font-semibold text-emerald-400">GRATIS</td>
                </tr>
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
            Las estaciones de trabajo y monitores de alta precisión requieren un manejo riguroso. Cada paquete despachado por NovaWorkstations cuenta con:
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
