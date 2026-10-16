export interface CartItem {
  id: string;
  sku: string;
  slug: string;
  title: string;
  price: number;
  quantity: number;
  image_url?: string;
  category?: string;
}

const CART_STORAGE_KEY = 'nw_cart';
const CART_EVENT_NAME = 'nw_cart_updated';
const COUPON_STORAGE_KEY = 'nw_applied_coupon';

export function getCartFromCookies(cookieHeader?: string): CartItem[] {
  const cookiesStr =
    cookieHeader ?? (typeof document !== 'undefined' ? document.cookie : '');
  if (!cookiesStr) return [];
  const cookies = cookiesStr.split(';').map((c) => c.trim());
  for (const name of [CART_STORAGE_KEY, 'vs_cart']) {
    const prefix = `${name}=`;
    const found = cookies.find((c) => c.startsWith(prefix));
    if (found) {
      const rawValue = found.substring(prefix.length);
      try {
        const decoded = decodeURIComponent(rawValue);
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // ignore
      }
    }
  }
  return [];
}

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY) || localStorage.getItem('vs_cart');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    return getCartFromCookies();
  } catch {
    return getCartFromCookies();
  }
}

export function getCartCount(): number {
  const items = getCart();
  return items.reduce((total, item) => total + (item.quantity || 1), 0);
}

export function saveCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(items);
    localStorage.setItem(CART_STORAGE_KEY, serialized);
    localStorage.setItem('vs_cart', serialized);

    // Synchronize to cookies for SSR & persistence
    const encoded = encodeURIComponent(serialized);
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${CART_STORAGE_KEY}=${encoded}; expires=${expires}; path=/; SameSite=Lax`;
    document.cookie = `vs_cart=${encoded}; expires=${expires}; path=/; SameSite=Lax`;

    window.dispatchEvent(new CustomEvent(CART_EVENT_NAME, { detail: items }));
  } catch (err) {
    console.warn('[Cart] Failed to save cart:', err);
  }
}

export function addToCart(product: Omit<CartItem, 'quantity'>, quantity: number = 1): CartItem[] {
  const items = getCart();
  const existingIdx = items.findIndex((i) => i.sku === product.sku);

  if (existingIdx >= 0) {
    items[existingIdx].quantity += quantity;
  } else {
    items.push({
      ...product,
      quantity: Math.max(1, quantity),
    });
  }

  saveCart(items);
  return items;
}

export function updateCartQuantity(sku: string, quantity: number): CartItem[] {
  const items = getCart();
  if (quantity <= 0) {
    return removeFromCart(sku);
  }

  const existingIdx = items.findIndex((i) => i.sku === sku);
  if (existingIdx >= 0) {
    items[existingIdx].quantity = quantity;
    saveCart(items);
  }
  return items;
}

export function removeFromCart(sku: string): CartItem[] {
  const items = getCart().filter((i) => i.sku !== sku);
  saveCart(items);
  return items;
}

export function clearCart(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
      localStorage.removeItem('vs_cart');
      localStorage.removeItem(COUPON_STORAGE_KEY);
      localStorage.removeItem('vs_coupon');
      document.cookie = `${CART_STORAGE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
      document.cookie = `vs_cart=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
      document.cookie = `${COUPON_STORAGE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
      document.cookie = `vs_coupon=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
    } catch {}
    window.dispatchEvent(new CustomEvent(CART_EVENT_NAME, { detail: [] }));
  }
}

export function getAppliedCoupon(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const fromStorage = localStorage.getItem(COUPON_STORAGE_KEY) || localStorage.getItem('vs_coupon');
    if (fromStorage) return fromStorage;

    const cookies = document.cookie.split(';').map((c) => c.trim());
    for (const name of [COUPON_STORAGE_KEY, 'vs_coupon']) {
      const prefix = `${name}=`;
      const found = cookies.find((c) => c.startsWith(prefix));
      if (found) {
        return decodeURIComponent(found.substring(prefix.length));
      }
    }
  } catch {}
  return null;
}

export function saveAppliedCoupon(code: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!code) {
      localStorage.removeItem(COUPON_STORAGE_KEY);
      localStorage.removeItem('vs_coupon');
      document.cookie = `${COUPON_STORAGE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
      document.cookie = `vs_coupon=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
    } else {
      const normalized = code.trim().toUpperCase();
      localStorage.setItem(COUPON_STORAGE_KEY, normalized);
      localStorage.setItem('vs_coupon', normalized);
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `${COUPON_STORAGE_KEY}=${encodeURIComponent(normalized)}; expires=${expires}; path=/; SameSite=Lax`;
      document.cookie = `vs_coupon=${encodeURIComponent(normalized)}; expires=${expires}; path=/; SameSite=Lax`;
    }
  } catch (err) {
    console.warn('[Cart] Failed to save applied coupon:', err);
  }
}

export function subscribeToCartUpdates(callback: (items: CartItem[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<CartItem[]>;
    callback(custom.detail || getCart());
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === CART_STORAGE_KEY || e.key === 'vs_cart') {
      callback(getCart());
    }
  };

  window.addEventListener(CART_EVENT_NAME, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(CART_EVENT_NAME, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}
