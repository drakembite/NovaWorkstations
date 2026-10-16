'use client';

import { useEffect } from 'react';
import { captureAttributionPayload } from '@/lib/attribution';

/**
 * Silent client-side component that monitors URL query parameters and referrer
 * to persist marketing attribution in first-party cookies (nw_attribution & vs_attribution).
 */
export function AttributionTracker() {
  useEffect(() => {
    captureAttributionPayload();
  }, []);

  return null;
}
