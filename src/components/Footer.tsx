'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Cpu,
  Truck,
  RotateCcw,
  ShieldCheck,
  Headphones,
  Mail,
  MapPin,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { DEMO_NOTICE_FOOTER } from '@/lib/store-copy';
import {
  DEMO_POLICY_LABEL,
  NO_MAILBOX_NOTE,
  POLICY_FOOTER_SHIPPING,
  STORE_POLICY,
} from '@/lib/store-policy';

export function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-400">
      {/* Value Proposition Highlights */}
      <div className="border-b border-slate-800/80 bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="mb-5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {DEMO_POLICY_LABEL}
          </p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-cyan-400 border border-blue-500/20">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-200">Envíos Rápidos</h4>
                <p className="mt-1 text-xs text-slate-400">
                  {POLICY_FOOTER_SHIPPING}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-200">{STORE_POLICY.returnDays} Días de Devolución</h4>
                <p className="mt-1 text-xs text-slate-400">
                  Retorno garantizado sin costos ocultos si el producto no cumple tus expectativas.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-200">{STORE_POLICY.warrantyMonths} Meses de Garantía</h4>
                <p className="mt-1 text-xs text-slate-400">
                  Cobertura directa de fábrica y soporte técnico especializado para workstations.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Headphones className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-200">Asesoría de Ingeniería</h4>
                <p className="mt-1 text-xs text-slate-400">
                  Configuración personalizada para CAD, 3D rendering, IA y arquitectura.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Info */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-slate-950 shadow-md">
                <Cpu className="h-5 w-5 font-bold" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white">
                Nova<span className="text-cyan-400">Workstations</span>
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-slate-400 max-w-sm">
              Especialistas en hardware de alto rendimiento para arquitectos, animadores, científicos de datos y estudios de ingeniería. Estaciones de trabajo certificadas y componentes de grado profesional.
            </p>
            <div className="mt-6 flex flex-col space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>San Isidro, Lima, Perú</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>Lunes a Sábado: 09:00 - 18:00 hrs</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>{NO_MAILBOX_NOTE}</span>
              </div>
            </div>
          </div>

          {/* Categorías */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Catálogo
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link
                  href="/categoria/estaciones-de-trabajo"
                  className="transition-colors hover:text-cyan-400"
                >
                  Estaciones de Trabajo
                </Link>
              </li>
              <li>
                <Link
                  href="/categoria/monitores"
                  className="transition-colors hover:text-cyan-400"
                >
                  Monitores Profesionales
                </Link>
              </li>
              <li>
                <Link
                  href="/categoria/accesorios"
                  className="transition-colors hover:text-cyan-400"
                >
                  Accesorios y Docks
                </Link>
              </li>
              <li>
                <Link
                  href="/categoria/ofertas"
                  className="text-amber-400 transition-colors hover:text-amber-300"
                >
                  Ofertas Especiales
                </Link>
              </li>
              <li>
                <Link
                  href="/categoria/liquidacion"
                  className="text-rose-400 transition-colors hover:text-rose-300"
                >
                  Liquidación de Inventario
                </Link>
              </li>
            </ul>
          </div>

          {/* Políticas & Servicios */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Políticas y Ayuda
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link
                  href="/envios-y-entregas"
                  className="transition-colors hover:text-cyan-400"
                >
                  Envíos y Entregas
                </Link>
              </li>
              <li>
                <Link
                  href="/devoluciones-y-garantia"
                  className="transition-colors hover:text-cyan-400"
                >
                  Devoluciones y Garantía
                </Link>
              </li>
              <li>
                <Link
                  href="/promociones"
                  className="transition-colors hover:text-cyan-400"
                >
                  Cupones y Promociones
                </Link>
              </li>
              <li>
                <Link
                  href="/sitemap.xml"
                  target="_blank"
                  className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-300"
                >
                  <span>Mapa de Sitio (XML)</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </li>
              <li>
                <Link
                  href="/robots.txt"
                  target="_blank"
                  className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-300"
                >
                  <span>Robots.txt</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Plataforma & Admin */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Plataforma
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link
                  href="/products.json"
                  target="_blank"
                  className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-300"
                >
                  <span>API Catálogo (Shopify)</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Demo status statement */}
        <p className="mt-12 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-xs leading-relaxed text-slate-400">
          {DEMO_NOTICE_FOOTER}
        </p>

        {/* Bottom bar */}
        <div className="mt-6 border-t border-slate-800/80 pt-8 sm:flex sm:items-center sm:justify-between text-xs text-slate-500">
          <p>© {currentYear} NovaWorkstations S.A.C. Todos los derechos reservados.</p>
          <p className="mt-4 sm:mt-0">
            Diseñado para flujos de trabajo de ingeniería, renderizado 3D e inteligencia artificial.
          </p>
        </div>
      </div>
    </footer>
  );
}
