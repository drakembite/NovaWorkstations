'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  createProgressController,
  shouldStartProgress,
  type ProgressController,
} from '@/lib/nav-progress';

/**
 * Thin top progress bar for internal navigation. Client-only by design: it renders nothing on the
 * server and on the first client render, so it adds no text and no node to the HTML that crawlers
 * fetch (pages stay fully server-rendered in one chunk; there is no Suspense or loading.tsx).
 * A delegated click listener on `document` shows the bar for same-origin link clicks; it hides when
 * the pathname changes or after a safety timeout. It never prevents or delays the navigation.
 * (useSearchParams is deliberately not used: it forces a client-rendering bailout that needs Suspense.)
 */
export function NavigationProgress() {
  const [visible, setVisible] = useState(false);
  const [grown, setGrown] = useState(false);
  const pathname = usePathname();
  const controller = useRef<ProgressController | null>(null);
  if (controller.current === null) controller.current = createProgressController(setVisible);

  useEffect(() => {
    const ctl = controller.current!;
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const anchor = target && typeof target.closest === 'function' ? target.closest('a') : null;
      const start = shouldStartProgress(
        event,
        anchor
          ? { href: anchor.href, target: anchor.getAttribute('target'), download: anchor.hasAttribute('download') }
          : null,
        window.location.href
      );
      if (start) ctl.start();
    };
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('click', onClick);
      ctl.dispose();
    };
  }, []);

  // The route changed: the new page is on screen.
  useEffect(() => {
    controller.current?.finish();
  }, [pathname]);

  // Grow from 0 to most of the width after the bar is mounted, so the transition has a start frame.
  useEffect(() => {
    if (!visible) {
      setGrown(false);
      return;
    }
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      role="progressbar"
      aria-label="Navegación en curso"
      className="pointer-events-none fixed left-0 top-0 z-[100] h-0.5 w-full"
    >
      <div
        className={`h-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)] transition-[width] duration-[6000ms] ease-out motion-reduce:w-full motion-reduce:animate-pulse motion-reduce:transition-none ${
          grown ? 'w-5/6' : 'w-0'
        }`}
      />
    </div>
  );
}
