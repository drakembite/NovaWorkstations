export const ADMIN_USERNAME = 'AdminPrueba1234';
export const ADMIN_PASSWORD = 'AdminPassword1234';
export const ADMIN_COOKIE_NAME = 'nw_admin_session';

const AUTH_SECRET =
  process.env.ADMIN_SESSION_SECRET || 'nova_workstations_secret_key_2026_secure_admin';

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
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey(
    'raw',
    encoder.encode(AUTH_SECRET),
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
