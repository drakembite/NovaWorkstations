'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingCart,
  Menu,
  X,
  Cpu,
  ShieldAlert,
  Tag,
  Truck,
  Sparkles,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { getCartCount, subscribeToCartUpdates } from '@/lib/cart';

const NAV_LINKS = [
  { name: 'Estaciones de Trabajo', href: '/categoria/estaciones-de-trabajo' },
  { name: 'Monitores', href: '/categoria/monitores' },
  { name: 'Accesorios', href: '/categoria/accesorios' },
  { name: 'Ofertas', href: '/categoria/ofertas', highlight: true },
  { name: 'Liquidación', href: '/categoria/liquidacion', badge: 'Outlet' },
  { name: 'Promociones', href: '/promociones' },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    // Initial count
    setCartCount(getCartCount());

    // Subscribe to live cart changes
    const unsubscribe = subscribeToCartUpdates(() => {
      setCartCount(getCartCount());
    });

    return () => unsubscribe();
  }, []);

  // Hide public navbar on admin pages
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/95 backdrop-blur-md text-slate-100">
      {/* Top Announcement Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-600 px-4 py-1.5 text-center text-xs font-medium text-white shadow-inner">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
          <Truck className="h-3.5 w-3.5 shrink-0 animate-pulse text-cyan-200" />
          <span>
            Envío gratis en compras mayores a US$ 150 | Despacho en 24h en Lima y 48-72h a nivel nacional
          </span>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-slate-950 shadow-md shadow-blue-500/20">
            <Cpu className="h-5 w-5 font-bold" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight text-white">
              Nova<span className="text-cyan-400">Workstations</span>
            </span>
            <span className="text-[10px] uppercase tracking-widest text-slate-400">
              Hardware de Alto Rendimiento
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3 py-2 text-sm font-medium transition-colors rounded-lg flex items-center gap-1.5 ${
                  isActive
                    ? 'text-cyan-400 bg-slate-900/90 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/50'
                }`}
              >
                {link.name}
                {link.badge && (
                  <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/30">
                    {link.badge}
                  </span>
                )}
                {link.highlight && (
                  <Tag className="h-3 w-3 text-amber-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Icons: Admin Link & Cart Button */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          <Link
            href="/admin"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-600 hover:text-white hover:bg-slate-800 transition-all shadow-sm"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Admin</span>
          </Link>

          <Link
            href="/carrito"
            aria-label="Ver carrito de compras"
            className="relative flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-slate-200 transition-all hover:border-cyan-500/50 hover:text-cyan-400 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-[11px] font-bold text-slate-950 shadow-md shadow-cyan-500/50 animate-in zoom-in-50">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-slate-300 hover:text-white hover:bg-slate-800 lg:hidden focus:outline-none"
            aria-expanded={mobileMenuOpen}
            aria-label="Abrir menú de navegación"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-800 bg-slate-950/98 px-4 pt-3 pb-6 lg:hidden animate-in slide-in-from-top-2">
          <div className="flex flex-col space-y-1">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center justify-between rounded-lg px-3.5 py-2.5 text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600/10 text-cyan-400 font-semibold border-l-2 border-cyan-400'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {link.name}
                    {link.badge && (
                      <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/30">
                        {link.badge}
                      </span>
                    )}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                </Link>
              );
            })}

            <div className="pt-3 mt-2 border-t border-slate-800/80">
              <Link
                href="/admin"
                className="flex items-center justify-between rounded-lg px-3.5 py-2.5 text-base font-medium text-slate-300 hover:bg-slate-900 hover:text-white"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Panel de Administración
                </span>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
