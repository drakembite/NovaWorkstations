'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { trackOutboundClick } from '@/lib/outbound';
import { buyLabel, createPendingTimer, PendingTimer } from '@/lib/buy-pending';
import { Spinner } from './Spinner';

export interface BuyLinkProps {
  sku: string;
  /** The independent store page. Rendered as a plain, visible href (no redirect endpoint). */
  href: string;
  compact?: boolean;
}

/**
 * "Comprar" anchor (never names the destination store). The href is the real target so crawlers
 * and assistants see it; the click handler only sends a first-party beacon and shows a short
 * "Abriendo…" state. It never prevents or delays navigation. The pending text is client-only:
 * server-rendered HTML always reads "Comprar".
 */
export function BuyLink({ sku, href, compact = false }: BuyLinkProps) {
  const [pending, setPending] = useState(false);
  const timer = useRef<PendingTimer | null>(null);
  if (timer.current === null) timer.current = createPendingTimer(setPending);

  useEffect(() => () => timer.current?.dispose(), []);

  const sizing = compact
    ? 'px-3 py-1.5 text-xs'
    : 'w-full justify-center px-6 py-3.5 text-sm sm:w-auto';
  const iconSize = compact ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <a
      href={href}
      target="_blank"
      rel="nofollow noopener noreferrer"
      aria-busy={pending ? true : undefined}
      onClick={() => {
        trackOutboundClick(sku);
        timer.current?.start();
      }}
      className={`inline-flex items-center gap-2 rounded-xl bg-cyan-500 font-bold text-slate-950 shadow-md shadow-cyan-500/20 transition-colors hover:bg-cyan-400 ${sizing}`}
    >
      <span>{buyLabel(pending)}</span>
      {pending ? (
        <Spinner className={iconSize} />
      ) : (
        <ExternalLink className={iconSize} aria-hidden="true" />
      )}
    </a>
  );
}
