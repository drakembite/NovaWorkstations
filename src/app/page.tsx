import type { Metadata } from 'next';
import Link from 'next/link';
import { Cpu, ArrowRight, ShieldCheck, Zap, Monitor, Laptop, Tag } from 'lucide-react';

export const metadata: Metadata = {
  title: 'NovaWorkstations | Hardware Profesional para Creadores e Ingenieros',
  description:
    'Estaciones de trabajo de alto rendimiento, componentes y monitores de grado profesional con entrega en 24h en Lima y envíos a todo el Perú.',
};

export default function HomePage() {
  return (
    <div className="relative overflow-hidden py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3.5 py-1.5 text-xs font-semibold text-cyan-400">
            <Zap className="h-3.5 w-3.5" />
            <span>Hardware de Grado Profesional Certificado</span>
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
            Estaciones de Trabajo para{' '}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              Creadores e Ingenieros
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-slate-400">
            Despacho en 24h en Lima Metropolitana y 48-72h a nivel nacional. 30 días de devolución sin costo y 12 meses de garantía de fábrica.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/categoria/estaciones-de-trabajo"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-cyan-400 transition-all"
            >
              <span>Ver Estaciones de Trabajo</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/promociones"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-6 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all"
            >
              <Tag className="h-4 w-4 text-amber-400" />
              <span>Ver Cupones Vigentes</span>
            </Link>
          </div>
        </div>

        {/* Category Quick Links */}
        <div className="mt-20 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/categoria/estaciones-de-trabajo"
            className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition-all hover:border-cyan-500/40 hover:bg-slate-900/90"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-cyan-400 border border-blue-500/20 group-hover:scale-105 transition-transform">
              <Laptop className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
              Estaciones de Trabajo &rarr;
            </h2>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Laptops y PCs diseñadas para modelado CAD, renderizado 3D y simulaciones computacionales intensivas.
            </p>
          </Link>

          <Link
            href="/categoria/monitores"
            className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition-all hover:border-indigo-500/40 hover:bg-slate-900/90"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-105 transition-transform">
              <Monitor className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
              Monitores de Precisión &rarr;
            </h2>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Paneles IPS y OLED con calibración de color de fábrica 100% sRGB / DCI-P3 para postproducción.
            </p>
          </Link>

          <Link
            href="/categoria/ofertas"
            className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition-all hover:border-amber-500/40 hover:bg-slate-900/90"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-transform">
              <Tag className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
              Ofertas y Oportunidades &rarr;
            </h2>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Descuentos directos en hardware seleccionado con entrega inmediata y garantía oficial.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
