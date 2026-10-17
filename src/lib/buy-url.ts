// Validation for the outbound purchase link of a product (`buy_url`) and its store label
// (`buy_store`). Pure functions: shared by the admin API, the admin editor and the tests.

export const BUY_URL_MAX_LENGTH = 2000;
export const BUY_STORE_MAX_LENGTH = 120;
export const BUY_NOTE_MAX_LENGTH = 300;

export type FieldResult = { ok: true; value: string | null } | { ok: false; error: string };

/**
 * Accepts only an absolute `https://` URL (max 2000 chars, no whitespace or control
 * characters, no embedded credentials). Empty, blank and null clear the link.
 * Anything else (javascript:, data:, http:, relative or scheme-less URLs) is rejected.
 */
export function validateBuyUrl(input: unknown): FieldResult {
  if (input === null || input === undefined) return { ok: true, value: null };
  if (typeof input !== 'string') return { ok: false, error: 'buy_url must be a string' };

  const value = input.trim();
  if (value === '') return { ok: true, value: null };

  if (value.length > BUY_URL_MAX_LENGTH) {
    return { ok: false, error: `buy_url must be at most ${BUY_URL_MAX_LENGTH} characters` };
  }
  // Require the literal "https://" prefix: `new URL('https:host')` would otherwise be accepted.
  if (!/^https:\/\/[^/]/i.test(value)) {
    return { ok: false, error: 'buy_url must be an absolute https:// URL' };
  }
  // eslint-disable-next-line no-control-regex
  if (/[\s\u0000-\u001f\u007f]/.test(value)) {
    return { ok: false, error: 'buy_url must not contain whitespace or control characters' };
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, error: 'buy_url is not a valid URL' };
  }
  if (parsed.protocol !== 'https:' || !parsed.hostname) {
    return { ok: false, error: 'buy_url must be an absolute https:// URL' };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: 'buy_url must not embed credentials' };
  }
  return { ok: true, value };
}

/** Store label shown as "Comprar en {buy_store}". Empty, blank and null clear it. */
export function validateBuyStore(input: unknown): FieldResult {
  if (input === null || input === undefined) return { ok: true, value: null };
  if (typeof input !== 'string') return { ok: false, error: 'buy_store must be a string' };

  const value = input.trim();
  if (value === '') return { ok: true, value: null };
  if (value.length > BUY_STORE_MAX_LENGTH) {
    return { ok: false, error: `buy_store must be at most ${BUY_STORE_MAX_LENGTH} characters` };
  }
  return { ok: true, value };
}

/**
 * Optional caveat shown next to the buy button. Plain text only: trimmed, at most 300 characters,
 * no angle brackets (so no HTML) and no control characters. Empty, blank and null clear it.
 * The renderer escapes it as well; this is the first of two defences.
 */
export function validateBuyNote(input: unknown): FieldResult {
  if (input === null || input === undefined) return { ok: true, value: null };
  if (typeof input !== 'string') return { ok: false, error: 'buy_note must be a string' };

  const value = input.trim();
  if (value === '') return { ok: true, value: null };
  if (value.length > BUY_NOTE_MAX_LENGTH) {
    return { ok: false, error: `buy_note must be at most ${BUY_NOTE_MAX_LENGTH} characters` };
  }
  if (/[<>]/.test(value)) {
    return { ok: false, error: 'buy_note must be plain text (no HTML)' };
  }
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) {
    return { ok: false, error: 'buy_note must not contain control characters' };
  }
  return { ok: true, value };
}
