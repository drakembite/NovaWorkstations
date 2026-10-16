export interface AttributionData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  aic_src?: string;
  aic_sku?: string;
  aic_sig?: string;
  referrer?: string;
  landing_page?: string;
  captured_at?: string;
  [key: string]: any;
}

const ATTRIBUTION_COOKIE_NAMES = ['nw_attribution', 'vs_attribution'];
const COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

/**
 * Extracts and parses attribution payload from a cookie header or client document.cookie.
 */
export function getAttributionFromCookies(cookieHeader?: string): AttributionData {
  const cookiesStr =
    cookieHeader ??
    (typeof document !== 'undefined' ? document.cookie : '');

  if (!cookiesStr) {
    return {};
  }

  const cookies = cookiesStr.split(';').map((c) => c.trim());

  for (const name of ATTRIBUTION_COOKIE_NAMES) {
    const prefix = `${name}=`;
    const found = cookies.find((c) => c.startsWith(prefix));
    if (found) {
      const rawValue = found.substring(prefix.length);
      try {
        const decoded = decodeURIComponent(rawValue);
        return JSON.parse(decoded) as AttributionData;
      } catch {
        try {
          return JSON.parse(rawValue) as AttributionData;
        } catch {
          // ignore corrupted cookie
        }
      }
    }
  }

  return {};
}

/**
 * Persists attribution data into first-party cookies (both nw_attribution and vs_attribution).
 */
export function saveAttributionToCookies(data: AttributionData): void {
  if (typeof document === 'undefined') return;

  const serialized = encodeURIComponent(JSON.stringify(data));
  const expires = new Date(Date.now() + COOKIE_MAX_AGE_SECONDS * 1000).toUTCString();

  for (const name of ATTRIBUTION_COOKIE_NAMES) {
    document.cookie = `${name}=${serialized}; expires=${expires}; max-age=${COOKIE_MAX_AGE_SECONDS}; path=/; SameSite=Lax`;
  }
}

/**
 * Parses URL query parameters, referrer, and location to capture attribution on page load.
 */
export function captureAttributionPayload(): AttributionData | null {
  if (typeof window === 'undefined') return null;

  try {
    const url = new URL(window.location.href);
    const searchParams = url.searchParams;

    const utm_source = searchParams.get('utm_source') || undefined;
    const utm_medium = searchParams.get('utm_medium') || undefined;
    const utm_campaign = searchParams.get('utm_campaign') || undefined;
    const utm_term = searchParams.get('utm_term') || undefined;
    const utm_content = searchParams.get('utm_content') || undefined;

    const aic_src = searchParams.get('aic_src') || undefined;
    const aic_sku = searchParams.get('aic_sku') || undefined;
    const aic_sig = searchParams.get('aic_sig') || undefined;

    const hasTrackingParams = Boolean(
      utm_source ||
      utm_medium ||
      utm_campaign ||
      utm_term ||
      utm_content ||
      aic_src ||
      aic_sku ||
      aic_sig
    );

    const referrer = typeof document !== 'undefined' && document.referrer ? document.referrer : undefined;

    // Only set or update if we have new tracking parameters or a foreign referrer
    if (hasTrackingParams || (referrer && !referrer.includes(window.location.hostname))) {
      const existing = getAttributionFromCookies();

      const newAttribution: AttributionData = {
        ...existing,
        ...(utm_source && { utm_source }),
        ...(utm_medium && { utm_medium }),
        ...(utm_campaign && { utm_campaign }),
        ...(utm_term && { utm_term }),
        ...(utm_content && { utm_content }),
        ...(aic_src && { aic_src }),
        ...(aic_sku && { aic_sku }),
        ...(aic_sig && { aic_sig }),
        referrer: referrer || existing.referrer || undefined,
        landing_page: window.location.href,
        captured_at: new Date().toISOString(),
      };

      saveAttributionToCookies(newAttribution);
      return newAttribution;
    }
  } catch (err) {
    console.warn('[Attribution] Error parsing attribution:', err);
  }

  return null;
}
