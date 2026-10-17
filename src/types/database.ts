export interface Product {
  id: string;
  sku: string;
  slug: string;
  title: string;
  brand: string;
  mpn: string | null;
  barcode_ean: string | null;
  category: string;
  price: number;
  compare_at_price: number | null;
  currency: string;
  stock_quantity: number;
  short_description: string;
  specs_json: Record<string, any>;
  shipping_text: string;
  image_url: string;
  custom_head_jsonld: Record<string, any> | null;
  /** Absolute https URL of the independent store page where the product can be bought. */
  buy_url: string | null;
  /** Display name of that store, shown as "Comprar en {buy_store}". */
  buy_store: string | null;
  /** Optional plain-text caveat shown next to the buy button (e.g. an equivalent model). Max 300 chars. */
  buy_note: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * First-party record of a click on a product's outbound buy link. Deliberately minimal:
 * no IP address, user agent or any other personal data.
 */
export interface OutboundClick {
  id: string;
  sku: string;
  /** Always the product's stored buy_url at click time, never a client supplied value. */
  target_url: string;
  /** Whitelisted fields of the inbound first-party attribution cookie. */
  attribution_data: Record<string, string>;
  created_at: string;
}

export type DiscountType = 'percentage' | 'fixed';

export interface Promotion {
  id: string;
  code: string;
  name: string;
  description: string;
  discount_type: DiscountType;
  discount_value: number;
  min_purchase_amount: number;
  applies_to_category: string | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  created_at: string;
}

// Legacy order shapes: the order flow was removed, stored rows are kept untouched.
export type OrderStatus = 'paid' | 'partially_refunded' | 'refunded';

export interface OrderItem {
  sku: string;
  quantity: number;
  unit_price: number;
  title?: string;
}

export interface Order {
  id: string;
  order_number: number;
  customer_name: string;
  customer_email: string;
  shipping_city: string;
  shipping_address: string;
  status: OrderStatus;
  subtotal_amount: number;
  discount_amount: number;
  shipping_amount: number;
  total_paid_amount: number;
  refunded_amount: number;
  coupon_code_used: string | null;
  items_json: OrderItem[];
  attribution_data: Record<string, any>;
  created_at: string;
  refunded_at: string | null;
}

/** The order webhook columns are legacy: no longer used or shown, but never dropped. */
export interface StoreSettings {
  id: number;
  store_name: string;
  custom_head_script: string | null;
  webhook_url_product_updated: string | null;
  webhook_url_order_paid: string | null;
  webhook_url_order_refunded: string | null;
  updated_at: string;
}

export type WebhookEvent = 'product.updated';

export interface WebhookProductPayload {
  event: 'product.updated';
  timestamp: string;
  product: {
    id: string;
    sku: string;
    slug: string;
    price: number;
    stock_quantity: number;
    short_description: string;
    updated_at: string;
  };
}

export type WebhookPayload = WebhookProductPayload;
