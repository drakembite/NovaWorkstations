import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Laptop,
  Monitor,
  HardDrive,
  Tag,
  Zap,
  ArrowRight,
  ShieldCheck,
  Truck,
  Headphones,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { getProducts } from '@/lib/db';
import { ProductCard } from '@/components/ProductCard';
import { absoluteUrl } from '@/lib/catalog';
import {
  DEMO_POLICY_LABEL,
  LIMA_DELIVERY_SHORT,
  PROVINCES_DELIVERY_SHORT,
  POLICY_META_SHIPPING,
  STORE_POLICY,
  WARRANTY_LABEL,
  RETURN_WINDOW_LABEL,
} from '@/lib/store-policy';

export const metadata: Metadata = {
  // Absolute: the root layout template would append the store name a second time.
  title: { absolute: 'NovaWorkstations | Hardware Profesional para Creadores e Ingenieros' },
  alternates: { canonical: absoluteUrl('/') },
  description:
    `Estaciones de trabajo de alto rendimiento, monitores de color de precisión calibrados y accesorios profesionales de estudio. ${POLICY_META_SHIPPING}`,
  openGraph: {
    url: absoluteUrl('/'),
    title: 'NovaWorkstations | Hardware Profesional',
    description:
      `Estaciones de trabajo de alto rendimiento, monitores calibrados y accesorios profesionales. Despacho en ${LIMA_DELIVERY_SHORT} según la ${DEMO_POLICY_LABEL.toLowerCase()}.`,
  },
};

const CATEGORY_CARDS = [
  {
    slug: 'estaciones-de-trabajo',
    name: 'Estaciones de Trabajo',
    description: 'Laptops y PCs de grado profesional para CAD, render 3D y simulación.',
    icon: Laptop,
    color: 'from-blue-600/20 to-cyan-600/20 text-cyan-400 border-cyan-500/30',
  },
  {
    slug: 'monitores',
    name: 'Monitores de Precisión',
    description: 'Paneles 4K UHD y OLED con calibración de color 100% sRGB / DCI-P3.',
    icon: Monitor,
    color: 'from-indigo-600/20 to-blue-600/20 text-indigo-400 border-indigo-500/30',
  },
  {
    slug: 'accesorios',
    name: 'Accesorios y Docks',
    description: 'Docks Thunderbolt 4, tabletas gráficas con pantalla y periféricos.',
    icon: HardDrive,
    color: 'from-purple-600/20 to-indigo-600/20 text-purple-400 border-purple-500/30',
  },
  {
    slug: 'ofertas',
    name: 'Ofertas Especiales',
    description: 'Descuentos directos y promociones en hardware seleccionado.',
    icon: Tag,
    color: 'from-amber-600/20 to-orange-600/20 text-amber-400 border-amber-500/30',
  },
  {
    slug: 'liquidacion',
    name: 'Liquidación Outlet',
    description: 'Últimas unidades garantizadas con precios rebajados de liquidación.',
    icon: Zap,
    color: 'from-rose-600/20 to-pink-600/20 text-rose-400 border-rose-500/30',
  },
];

export default async function HomePage() {
  const allProducts = await getProducts();

  // Destacados: Workstations & high-performance gear
  const featuredProducts = allProducts.slice(0, 8);

  // Ofertas y Liquidación
  const dealsProducts = allProducts.filter(
    (p) =>
      p.category === 'Ofertas' ||
      p.category === 'Liquidación' ||
      (p.compare_at_price != null && p.compare_at_price > p.price)
  );

  return (
    <div className="flex flex-col gap-16 pb-20">
      {/* 1. Hero Banner */}
      <section className="relative overflow-hidden border-b border-slate-800/80 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-16 sm:py-24">
        {/* Glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[600px] rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/50 px-4 py-1.5 text-xs font-semibold text-cyan-300 shadow-sm backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>Hardware de Grado Profesional Certificado</span>
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-6xl sm:leading-tight">
            Estaciones de Trabajo para{' '}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              Creadores e Ingenieros
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-base sm:text-lg text-slate-300 leading-relaxed">
            Equipamiento de alto rendimiento para arquitectura, modelado 3D, animación y posproducción. Monitores con calibración de color de precisión, docking stations Thunderbolt 4 y soporte técnico de especialistas.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/categoria/estaciones-de-trabajo"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-cyan-400 transition-all hover:scale-105 active:scale-95"
            >
              <span>Ver Estaciones de Trabajo</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/categoria/ofertas"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 px-6 py-3.5 text-sm font-semibold text-slate-200 hover:border-cyan-500/40 hover:bg-slate-800 hover:text-white transition-all"
            >
              <Tag className="h-4 w-4 text-amber-400" />
              <span>Explorar Ofertas</span>
            </Link>
            <Link
              href="/promociones"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-5 py-3.5 text-sm font-medium text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all"
            >
              <span>Cupones Vigentes</span>
            </Link>
          </div>

          {/* Value Pills row */}
          <p className="mt-12 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{DEMO_POLICY_LABEL}</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>{`Despacho en ${LIMA_DELIVERY_SHORT} en Lima Metropolitana`}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-cyan-400" />
              <span>{`${STORE_POLICY.warrantyMonths} Meses de Garantía de Fábrica`}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-indigo-400" />
              <span>Tienda de demostración: no vende ni cobra</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Quick Category Navigation Pills / Cards */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white">
              Explorar por Categoría
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Encuentra la solución especializada para la exigencia de tu flujo de trabajo.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {CATEGORY_CARDS.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.slug}
                href={`/categoria/${cat.slug}`}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition-all duration-200 hover:border-cyan-500/40 hover:bg-slate-900/90 hover:shadow-lg hover:shadow-cyan-500/5"
              >
                <div>
                  <div
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br border transition-transform duration-200 group-hover:scale-110 ${cat.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3.5 text-base font-bold text-white group-hover:text-cyan-400 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center text-xs font-semibold text-cyan-400 opacity-90 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                  <span>Ver catálogo &rarr;</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. Equipos Destacados Grid */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Selección Profesional
              </span>
            </div>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Equipos Destacados
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Hardware de máxima fiabilidad disponible para entrega inmediata.
            </p>
          </div>

          <Link
            href="/categoria/estaciones-de-trabajo"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <span>Ver todas las estaciones</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 4. Ofertas Especiales y Liquidación Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-950/20 via-slate-900/60 to-slate-900/90 p-6 sm:p-10 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-400">
                <Tag className="h-3.5 w-3.5" />
                <span>Oportunidades de Ahorro</span>
              </div>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Ofertas Especiales y Liquidación
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                Hardware con descuentos directos y últimas unidades garantizadas de fábrica.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/categoria/ofertas"
                className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors shadow-md shadow-amber-500/20"
              >
                <span>Ver Ofertas</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/categoria/liquidacion"
                className="inline-flex items-center gap-1 rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-900/50 transition-colors"
              >
                <span>Ver Outlet</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {dealsProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* 5. Value Pillars */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-cyan-400 border border-blue-500/20">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{`Envío Express ${LIMA_DELIVERY_SHORT}`}</h3>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                {`Despacho prioritario en Lima Metropolitana en ${LIMA_DELIVERY_SHORT} y ${PROVINCES_DELIVERY_SHORT} a nivel nacional. Embalaje industrial seguro para equipos delicados.`}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{`${STORE_POLICY.warrantyMonths} Meses Garantía de Fábrica`}</h3>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                {`Garantía oficial completa con soporte técnico y piezas originales. ${RETURN_WINDOW_LABEL} de devolución asegurada sin costo adicional.`}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Headphones className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Asesoría Técnica Especializada</h3>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Especialistas listos para asesorarte en la configuración exacta para tu software: CAD, Blender, Premiere Pro y modelado 3D.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
