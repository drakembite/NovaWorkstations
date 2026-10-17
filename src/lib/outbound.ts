// Outbound buy link helpers shared by the browser (click beacon) and the API route
// (input limits and attribution sanitising). No personal data is handled here.

export const OUTBOUND_CLICK_PATH = '/api/outbound-click';

/** Hard cap for the request body: the payload is just `{"sku":"..."}`. */
export const OUTBOUND_MAX_BODY_BYTES = 1024;
export const OUTBOUND_MAX_SKU_LENGTH = 64;

/** Attribution fields copied from the inbound first-party cookie; everything else is dropped. */
export const OUTBOUND_ATTRIBUTION_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'aic_src',
  'aic_sku',
  'aic_sig',
  'referrer',
  'landing_page',
  'captured_at',
] as const;
export const OUTBOUND_ATTRIBUTION_MAX_VALUE_LENGTH = 500;

/**
 * Reduces the (client controlled) attribution cookie to known string fields of bounded length.
 */
export function sanitizeAttribution(raw: unknown): Record<string, string> {
  const clean: Record<string, string> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
  const source = raw as Record<string, unknown>;
  for (const key of OUTBOUND_ATTRIBUTION_KEYS) {
    const value = source[key];
    if (typeof value === 'string' && value !== '') {
      clean[key] = value.slice(0, OUTBOUND_ATTRIBUTION_MAX_VALUE_LENGTH);
    }
  }
  return clean;
}

/**
 * Fire-and-forget click attribution. Prefers `navigator.sendBeacon` (survives the page
 * unload), falls back to `fetch` with `keepalive`, and never throws or delays navigation.
 */
export function trackOutboundClick(sku: string): void {
  try {
    const payload = JSON.stringify({ sku });

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        const blob = new Blob([payload], { type: 'application/json' });
        if (navigator.sendBeacon(OUTBOUND_CLICK_PATH, blob)) return;
      } catch {
        // fall through to fetch
      }
    }

    if (typeof fetch === 'function') {
      fetch(OUTBOUND_CLICK_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // Attribution is best effort.
      });
    }
  } catch {
    // Attribution is best effort and must never interfere with the click.
  }
}
