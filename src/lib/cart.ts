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

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY) || localStorage.getItem('vs_cart');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
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
  saveCart([]);
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
