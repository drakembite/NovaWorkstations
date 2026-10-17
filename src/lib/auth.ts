export const ADMIN_USERNAME = 'AdminPrueba1234';
export const ADMIN_PASSWORD = 'AdminPassword1234';
export const ADMIN_COOKIE_NAME = 'nw_admin_session';

const DEV_FALLBACK_KEY = '__nw_dev_only_session_secret__';

/**
 * Dev-only session secret, generated randomly once per process (never committed).
 * It lives on globalThis so module re-evaluation (HMR) keeps sessions valid.
 * Set ADMIN_SESSION_SECRET (e.g. in .env.local) for sessions that survive restarts
 * and are shared across the Edge middleware and the Node route handlers.
 */
function getDevOnlyFallbackSecret(): string {
  const store = globalThis as unknown as Record<string, string | undefined>;
  let secret = store[DEV_FALLBACK_KEY];
  if (!secret) {
    secret = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
    store[DEV_FALLBACK_KEY] = secret;
  }
  return secret;
}

/**
 * Resolves the HMAC secret. Production (NODE_ENV=production or VERCEL set) requires
 * ADMIN_SESSION_SECRET: when it is missing this logs a secret-free error and returns
 * null so that authentication fails closed.
 */
function resolveAuthSecret(): string | null {
  const configured = process.env.ADMIN_SESSION_SECRET;
  if (configured) return configured;

  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    console.error(
      '[auth] ADMIN_SESSION_SECRET is not set: admin sessions cannot be created or validated (failing closed). Set ADMIN_SESSION_SECRET in the environment.'
    );
    return null;
  }

  return getDevOnlyFallbackSecret();
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function toBase64Url(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str).toString('base64url');
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64url: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(b64url, 'base64url').toString('utf8');
  }
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return atob(b64);
}

async function getSigningKey(): Promise<CryptoKey> {
  const secret = resolveAuthSecret();
  if (!secret) {
    throw new Error('Admin authentication is unavailable: ADMIN_SESSION_SECRET is not configured');
  }
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export function validateCredentials(username?: string | null, password?: string | null): boolean {
  if (!username || !password) return false;
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

export async function createSessionToken(username: string): Promise<string> {
  const payload = {
    u: username,
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  const payloadStr = JSON.stringify(payload);
  const payloadB64 = toBase64Url(payloadStr);

  const encoder = new TextEncoder();
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64));
  const signatureHex = bytesToHex(new Uint8Array(signature));

  return `${payloadB64}.${signatureHex}`;
}

export async function verifySessionToken(token?: string | null): Promise<boolean> {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payloadB64, signatureHex] = parts;
  if (!payloadB64 || !signatureHex) return false;

  try {
    const encoder = new TextEncoder();
    const key = await getSigningKey();
    const sigBytes = hexToBytes(signatureHex);

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes as unknown as BufferSource,
      encoder.encode(payloadB64)
    );

    if (!isValid) return false;

    const payloadJson = fromBase64Url(payloadB64);
    const payload = JSON.parse(payloadJson);

    if (payload.u !== ADMIN_USERNAME) return false;
    if (typeof payload.exp !== 'number' || payload.exp <= Date.now()) return false;

    return true;
  } catch {
    return false;
  }
}

/** Extracts the admin session cookie value from a Cookie header, if present. */
function readAdminCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === ADMIN_COOKIE_NAME) {
      return part.slice(eq + 1).trim() || null;
    }
  }
  return null;
}

/**
 * Route-level admin guard for handlers that sit outside the /admin and /api/admin
 * middleware matcher. Returns true only for a request carrying a valid admin session.
 */
export async function isAdminRequest(request: Request): Promise<boolean> {
  const token = readAdminCookie(request.headers.get('cookie'));
  return token ? verifySessionToken(token) : false;
}
