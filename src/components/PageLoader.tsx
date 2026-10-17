import React from 'react';
import { Spinner } from './Spinner';

export type PageLoaderVariant = 'home' | 'category' | 'product';

const LOADING_TEXT = 'Cargando…';

function Block({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-2xl bg-slate-800/60 motion-reduce:animate-none ${className}`}
    />
  );
}

function CardGrid({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <Block key={i} className="h-72" />
      ))}
    </div>
  );
}

/**
 * Light loading state shown inside the layout (navbar and footer stay) while a route streams in.
 * One status region announces "Cargando…" to assistive technology; the skeleton is decorative.
 */
export function PageLoader({ variant }: { variant: PageLoaderVariant }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8"
    >
      <span className="sr-only">{LOADING_TEXT}</span>
      <div className="mb-6 flex items-center gap-3 text-cyan-400" aria-hidden="true">
        <Spinner className="h-5 w-5" />
        <span className="text-xs font-semibold text-slate-400">{LOADING_TEXT}</span>
      </div>

      {variant === 'product' ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Block className="h-80 lg:h-[28rem]" />
          <div className="space-y-4">
            <Block className="h-6 w-1/3" />
            <Block className="h-10 w-4/5" />
            <Block className="h-8 w-1/4" />
            <Block className="h-32" />
            <Block className="h-12 w-48" />
          </div>
        </div>
      ) : variant === 'category' ? (
        <div className="space-y-8">
          <Block className="h-40 rounded-3xl" />
          <CardGrid count={6} />
        </div>
      ) : (
        <div className="space-y-10">
          <Block className="h-64 rounded-3xl sm:h-80" />
          <CardGrid count={3} />
        </div>
      )}
    </div>
  );
}
