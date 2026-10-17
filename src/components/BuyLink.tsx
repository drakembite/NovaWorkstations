'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { trackOutboundClick } from '@/lib/outbound';

export interface BuyLinkProps {
  sku: string;
  /** The independent store page. Rendered as a plain, visible href (no redirect endpoint). */
  href: string;
  compact?: boolean;
}

/**
 * "Comprar" anchor (never names the destination store). The href is the real target so crawlers and assistants see it;
 * the click handler only sends a first-party beacon and never prevents or delays navigation.
 */
export function BuyLink({ sku, href, compact = false }: BuyLinkProps) {
  const sizing = compact
    ? 'px-3 py-1.5 text-xs'
    : 'w-full justify-center px-6 py-3.5 text-sm sm:w-auto';

  return (
    <a
      href={href}
      target="_blank"
      rel="nofollow noopener noreferrer"
      onClick={() => trackOutboundClick(sku)}
      className={`inline-flex items-center gap-2 rounded-xl bg-cyan-500 font-bold text-slate-950 shadow-md shadow-cyan-500/20 transition-colors hover:bg-cyan-400 ${sizing}`}
    >
      <span>Comprar</span>
      <ExternalLink className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden="true" />
    </a>
  );
}
