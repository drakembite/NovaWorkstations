import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Pool } from 'pg';
import {
  Product,
  Promotion,
  Order,
  StoreSettings,
} from '@/types/database';
import {
  initialProducts,
  initialPromotions,
  initialStoreSettings,
} from './seed-data';
import { triggerWebhook } from './webhooks';

interface DatabaseData {
  products: Product[];
  promotions: Promotion[];
  orders: Order[];
  store_settings: StoreSettings;
}

// In serverless environments like Vercel, the project root is read-only.
// Use /tmp which is writable, or fallback seamlessly to in-memory store.
const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'nova-data')
  : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

let memoryDb: DatabaseData = {
  products: [...initialProducts],
  promotions: [...initialPromotions],
  orders: [],
  store_settings: { ...initialStoreSettings },
};

let writeLock: Promise<void> = Promise.resolve();

async function readJsonDb(): Promise<DatabaseData> {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch {
        return memoryDb;
      }
    }

    if (!fs.existsSync(DB_FILE)) {
      const initialData: DatabaseData = {
        products: [...initialProducts],
        promotions: [...initialPromotions],
        orders: [],
        store_settings: { ...initialStoreSettings },
      };
      try {
        await fs.promises.writeFile(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
      } catch {
        // Read-only filesystem, use in-memory store
      }
      memoryDb = initialData;
      return initialData;
    }

    const content = await fs.promises.readFile(DB_FILE, 'utf8');
    if (!content.trim()) {
      return memoryDb;
    }
    const data = JSON.parse(content) as DatabaseData;
    let modified = false;

    if (!Array.isArray(data.products) || data.products.length === 0) {
      data.products = [...initialProducts];
      modified = true;
    }
    if (!Array.isArray(data.promotions) || data.promotions.length === 0) {
      data.promotions = [...initialPromotions];
      modified = true;
    }
    if (!Array.isArray(data.orders)) {
      data.orders = [];
      modified = true;
    }
    if (!data.store_settings) {
      data.store_settings = { ...initialStoreSettings };
      modified = true;
    }

    if (modified) {
      try {
        await fs.promises.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
      } catch {
        // Read-only fallback
      }
    }

    memoryDb = data;
    return data;
  } catch {
    return memoryDb;
  }
}

async function writeJsonDb(data: DatabaseData): Promise<void> {
  memoryDb = data;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
    await fs.promises.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf8');
    await fs.promises.rename(tempFile, DB_FILE);
  } catch {
    // In serverless environments where fs is restricted, memoryDb was already updated
  }
}

async function mutateJsonDb<T>(mutator: (data: DatabaseData) => Promise<T> | T): Promise<T> {
  const op = async () => {
    const data = await readJsonDb();
    const result = await mutator(data);
    await writeJsonDb(data);
    return result;
  };
  const currentLock = writeLock.then(op, op);
  writeLock = currentLock.then(() => {}, () => {});
  return currentLock;
}

// PostgreSQL Adapter with automatic fallback
const postgresUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
let pgPool: Pool | null = null;
let isPostgresHealthy: boolean | null = null;
let pgInitPromise: Promise<boolean> | null = null;

function getPgPool(): Pool | null {
  if (!postgresUrl) return null;
  if (!pgPool) {
    pgPool = new Pool({
      connectionString: postgresUrl,
      connectionTimeoutMillis: 2000,
      idleTimeoutMillis: 5000,
    });
    pgPool.on('error', (err) => {
      console.warn('[DB] PostgreSQL pool client error:', err.message);
      isPostgresHealthy = false;
    });
  }
  return pgPool;
}

async function checkAndInitPostgres(): Promise<boolean> {
  if (!postgresUrl) return false;
  if (isPostgresHealthy !== null) return isPostgresHealthy;

  if (!pgInitPromise) {
    pgInitPromise = (async () => {
      const pool = getPgPool();
      if (!pool) {
        isPostgresHealthy = false;
        return false;
      }

      try {
        const client = await pool.connect();
        try {
          await client.query(`
            CREATE TABLE IF NOT EXISTS products (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              sku VARCHAR(64) NOT NULL UNIQUE,
              slug VARCHAR(180) NOT NULL UNIQUE,
              title VARCHAR(255) NOT NULL,
              brand VARCHAR(100) NOT NULL,
              mpn VARCHAR(100) NULL,
              barcode_ean VARCHAR(32) NULL,
              category VARCHAR(120) NOT NULL,
              price NUMERIC(12,2) NOT NULL,
              compare_at_price NUMERIC(12,2) NULL,
              currency CHAR(3) NOT NULL DEFAULT 'USD',
              stock_quantity INT NOT NULL DEFAULT 0,
              short_description TEXT NOT NULL,
              specs_json JSONB NOT NULL DEFAULT '{}'::jsonb,
              shipping_text VARCHAR(255) NOT NULL DEFAULT 'Envío rápido a domicilio',
              image_url TEXT NOT NULL,
              custom_head_jsonld JSONB NULL,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS promotions (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              code VARCHAR(50) NOT NULL UNIQUE,
              name VARCHAR(150) NOT NULL,
              description TEXT NOT NULL,
              discount_type VARCHAR(20) NOT NULL,
              discount_value NUMERIC(12,2) NOT NULL,
              min_purchase_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
              applies_to_category VARCHAR(120) NULL,
              starts_at TIMESTAMPTZ NOT NULL,
              ends_at TIMESTAMPTZ NOT NULL,
              is_active BOOLEAN NOT NULL DEFAULT TRUE,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS orders (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              order_number SERIAL UNIQUE,
              customer_name VARCHAR(150) NOT NULL,
              customer_email VARCHAR(150) NOT NULL,
              shipping_city VARCHAR(100) NOT NULL,
              shipping_address TEXT NOT NULL,
              status VARCHAR(32) NOT NULL DEFAULT 'paid',
              subtotal_amount NUMERIC(12,2) NOT NULL,
              discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
              shipping_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
              total_paid_amount NUMERIC(12,2) NOT NULL,
              refunded_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
              coupon_code_used VARCHAR(50) NULL,
              items_json JSONB NOT NULL,
              attribution_data JSONB NOT NULL DEFAULT '{}'::jsonb,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              refunded_at TIMESTAMPTZ NULL
            );

            CREATE TABLE IF NOT EXISTS store_settings (
              id INT PRIMARY KEY DEFAULT 1,
              store_name VARCHAR(120) NOT NULL DEFAULT 'NovaWorkstations',
              custom_head_script TEXT NULL,
              webhook_url_product_updated TEXT NULL,
              webhook_url_order_paid TEXT NULL,
              webhook_url_order_refunded TEXT NULL,
              updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
          `);

          // Seed if empty
          const prodCountRes = await client.query('SELECT COUNT(*) FROM products');
          if (parseInt(prodCountRes.rows[0].count, 10) === 0) {
            for (const prod of initialProducts) {
              await client.query(
                `INSERT INTO products (
                  id, sku, slug, title, brand, mpn, barcode_ean, category,
                  price, compare_at_price, currency, stock_quantity,
                  short_description, specs_json, shipping_text, image_url,
                  custom_head_jsonld, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
                [
                  prod.id,
                  prod.sku,
                  prod.slug,
                  prod.title,
                  prod.brand,
                  prod.mpn,
                  prod.barcode_ean,
                  prod.category,
                  prod.price,
                  prod.compare_at_price,
                  prod.currency,
                  prod.stock_quantity,
                  prod.short_description,
                  JSON.stringify(prod.specs_json),
                  prod.shipping_text,
                  prod.image_url,
                  prod.custom_head_jsonld ? JSON.stringify(prod.custom_head_jsonld) : null,
                  prod.created_at,
                  prod.updated_at,
                ]
              );
            }
          }

          const promoCountRes = await client.query('SELECT COUNT(*) FROM promotions');
          if (parseInt(promoCountRes.rows[0].count, 10) === 0) {
            for (const promo of initialPromotions) {
              await client.query(
                `INSERT INTO promotions (
                  id, code, name, description, discount_type, discount_value,
                  min_purchase_amount, applies_to_category, starts_at, ends_at,
                  is_active, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [
                  promo.id,
                  promo.code,
                  promo.name,
                  promo.description,
                  promo.discount_type,
                  promo.discount_value,
                  promo.min_purchase_amount,
                  promo.applies_to_category,
                  promo.starts_at,
                  promo.ends_at,
                  promo.is_active,
                  promo.created_at,
                ]
              );
            }
          }

          const settingsCountRes = await client.query('SELECT COUNT(*) FROM store_settings');
          if (parseInt(settingsCountRes.rows[0].count, 10) === 0) {
            await client.query(
              `INSERT INTO store_settings (
                id, store_name, custom_head_script, webhook_url_product_updated,
                webhook_url_order_paid, webhook_url_order_refunded, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                initialStoreSettings.id,
                initialStoreSettings.store_name,
                initialStoreSettings.custom_head_script,
                initialStoreSettings.webhook_url_product_updated,
                initialStoreSettings.webhook_url_order_paid,
                initialStoreSettings.webhook_url_order_refunded,
                initialStoreSettings.updated_at,
              ]
            );
          }

          isPostgresHealthy = true;
          return true;
        } finally {
          client.release();
        }
      } catch (err: any) {
        console.warn('[DB] PostgreSQL init failed, falling back to local JSON file storage:', err.message);
        isPostgresHealthy = false;
        return false;
      }
    })();
  }

  return pgInitPromise;
}

function mapProductRow(row: any): Product {
  return {
    id: row.id,
    sku: row.sku,
    slug: row.slug,
    title: row.title,
    brand: row.brand,
    mpn: row.mpn ?? null,
    barcode_ean: row.barcode_ean ?? null,
    category: row.category,
    price: Number(row.price),
    compare_at_price: row.compare_at_price != null ? Number(row.compare_at_price) : null,
    currency: row.currency,
    stock_quantity: Number(row.stock_quantity),
    short_description: row.short_description,
    specs_json: typeof row.specs_json === 'string' ? JSON.parse(row.specs_json) : (row.specs_json || {}),
    shipping_text: row.shipping_text,
    image_url: row.image_url,
    custom_head_jsonld: row.custom_head_jsonld
      ? (typeof row.custom_head_jsonld === 'string' ? JSON.parse(row.custom_head_jsonld) : row.custom_head_jsonld)
      : null,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
  };
}

function mapPromotionRow(row: any): Promotion {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    discount_type: row.discount_type,
    discount_value: Number(row.discount_value),
    min_purchase_amount: Number(row.min_purchase_amount),
    applies_to_category: row.applies_to_category ?? null,
    starts_at: new Date(row.starts_at).toISOString(),
    ends_at: new Date(row.ends_at).toISOString(),
    is_active: Boolean(row.is_active),
    created_at: new Date(row.created_at).toISOString(),
  };
}

function mapOrderRow(row: any): Order {
  return {
    id: row.id,
    order_number: Number(row.order_number),
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    shipping_city: row.shipping_city,
    shipping_address: row.shipping_address,
    status: row.status,
    subtotal_amount: Number(row.subtotal_amount),
    discount_amount: Number(row.discount_amount),
    shipping_amount: Number(row.shipping_amount),
    total_paid_amount: Number(row.total_paid_amount),
    refunded_amount: Number(row.refunded_amount),
    coupon_code_used: row.coupon_code_used ?? null,
    items_json: typeof row.items_json === 'string' ? JSON.parse(row.items_json) : (row.items_json || []),
    attribution_data: typeof row.attribution_data === 'string' ? JSON.parse(row.attribution_data) : (row.attribution_data || {}),
    created_at: new Date(row.created_at).toISOString(),
    refunded_at: row.refunded_at ? new Date(row.refunded_at).toISOString() : null,
  };
}

function mapStoreSettingsRow(row: any): StoreSettings {
  return {
    id: Number(row.id),
    store_name: row.store_name,
    custom_head_script: row.custom_head_script ?? null,
    webhook_url_product_updated: row.webhook_url_product_updated ?? null,
    webhook_url_order_paid: row.webhook_url_order_paid ?? null,
    webhook_url_order_refunded: row.webhook_url_order_refunded ?? null,
    updated_at: new Date(row.updated_at).toISOString(),
  };
}

// -------------------------------------------------------------
// Public Database Interface
// -------------------------------------------------------------

export async function getProducts(): Promise<Product[]> {
  const usePg = await checkAndInitPostgres();
  if (usePg && pgPool) {
    try {
      const res = await pgPool.query('SELECT * FROM products ORDER BY created_at ASC');
      return res.rows.map(mapProductRow);
    } catch (err: any) {
      console.warn('[DB] PostgreSQL error in getProducts, falling back to JSON:', err.message);
    }
  }

  const data = await readJsonDb();
  return [...data.products];
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const usePg = await checkAndInitPostgres();
  if (usePg && pgPool) {
    try {
      const res = await pgPool.query('SELECT * FROM products WHERE slug = $1', [slug]);
      if (res.rows.length === 0) return null;
      return mapProductRow(res.rows[0]);
    } catch (err: any) {
      console.warn('[DB] PostgreSQL error in getProductBySlug, falling back to JSON:', err.message);
    }
  }

  const data = await readJsonDb();
  const product = data.products.find((p) => p.slug === slug);
  return product ? { ...product } : null;
}

export async function getProductById(id: string): Promise<Product | null> {
  const usePg = await checkAndInitPostgres();
  if (usePg && pgPool) {
    try {
      const res = await pgPool.query('SELECT * FROM products WHERE id = $1', [id]);
      if (res.rows.length === 0) return null;
      return mapProductRow(res.rows[0]);
    } catch (err: any) {
      console.warn('[DB] PostgreSQL error in getProductById, falling back to JSON:', err.message);
    }
  }

  const data = await readJsonDb();
  const product = data.products.find((p) => p.id === id);
  return product ? { ...product } : null;
}

export async function updateProduct(
  id: string,
  updates: Partial<Product>
): Promise<Product | null> {
  const now = new Date().toISOString();
  let updatedProduct: Product | null = null;

  const usePg = await checkAndInitPostgres();
  if (usePg && pgPool) {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (key === 'id') continue;
        fields.push(`${key} = $${idx++}`);
        if (key === 'specs_json' || key === 'custom_head_jsonld') {
          values.push(value ? JSON.stringify(value) : null);
        } else {
          values.push(value);
        }
      }
      fields.push(`updated_at = $${idx++}`);
      values.push(now);
      values.push(id);

      const query = `UPDATE products SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
      const res = await pgPool.query(query, values);
      if (res.rows.length > 0) {
        updatedProduct = mapProductRow(res.rows[0]);
      }
    } catch (err: any) {
      console.warn('[DB] PostgreSQL error in updateProduct, falling back to JSON:', err.message);
    }
  }

  if (!updatedProduct) {
    updatedProduct = await mutateJsonDb((data) => {
      const product = data.products.find((p) => p.id === id);
      if (!product) return null;
      Object.assign(product, updates, { updated_at: now });
      return { ...product };
    });
  }

  if (updatedProduct) {
    // Dispatch webhook asynchronously
    triggerWebhook('product.updated', updatedProduct).catch((err) =>
      console.warn('[Webhook] Trigger error in updateProduct:', err)
    );
  }

  return updatedProduct;
}

export async function getPromotions(): Promise<Promotion[]> {
  const usePg = await checkAndInitPostgres();
  if (usePg && pgPool) {
    try {
      const res = await pgPool.query('SELECT * FROM promotions ORDER BY created_at ASC');
      return res.rows.map(mapPromotionRow);
    } catch (err: any) {
      console.warn('[DB] PostgreSQL error in getPromotions, falling back to JSON:', err.message);
    }
  }

  const data = await readJsonDb();
  return [...data.promotions];
}

export async function getPromotionByCode(code: string): Promise<Promotion | null> {
  const normalizedCode = code.trim().toUpperCase();
  const usePg = await checkAndInitPostgres();
  if (usePg && pgPool) {
    try {
      const res = await pgPool.query('SELECT * FROM promotions WHERE UPPER(code) = $1', [normalizedCode]);
      if (res.rows.length === 0) return null;
      return mapPromotionRow(res.rows[0]);
    } catch (err: any) {
      console.warn('[DB] PostgreSQL error in getPromotionByCode, falling back to JSON:', err.message);
    }
  }

  const data = await readJsonDb();
  const promo = data.promotions.find(
    (p) => p.code.trim().toUpperCase() === normalizedCode
  );
  return promo ? { ...promo } : null;
}

export async function createPromotion(
  promo: Omit<Promotion, 'id' | 'created_at'>
): Promise<Promotion> {
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();

  const usePg = await checkAndInitPostgres();
  if (usePg && pgPool) {
    try {
      const res = await pgPool.query(
        `INSERT INTO promotions (
          id, code, name, description, discount_type, discount_value,
          min_purchase_amount, applies_to_category, starts_at, ends_at,
          is_active, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [
          id,
          promo.code.trim().toUpperCase(),
          promo.name,
          promo.description,
          promo.discount_type,
          promo.discount_value,
          promo.min_purchase_amount ?? 0,
          promo.applies_to_category ?? null,
          promo.starts_at,
          promo.ends_at,
          promo.is_active ?? true,
          created_at,
        ]
      );
      return mapPromotionRow(res.rows[0]);
    } catch (err: any) {
      console.warn('[DB] PostgreSQL error in createPromotion, falling back to JSON:', err.message);
    }
  }

  return mutateJsonDb((data) => {
    const newPromotion: Promotion = {
      ...promo,
      code: promo.code.trim().toUpperCase(),
      id,
      is_active: promo.is_active ?? true,
      min_purchase_amount: promo.min_purchase_amount ?? 0,
      applies_to_category: promo.applies_to_category ?? null,
      created_at,
    };
    data.promotions.push(newPromotion);
    return { ...newPromotion };
  });
}

export async function togglePromotion(
  id: string,
  isActive: boolean
): Promise<Promotion | null> {
  const usePg = await checkAndInitPostgres();
  if (usePg && pgPool) {
    try {
      const res = await pgPool.query(
        'UPDATE promotions SET is_active = $1 WHERE id = $2 RETURNING *',
        [isActive, id]
      );
      if (res.rows.length === 0) return null;
      return mapPromotionRow(res.rows[0]);
    } catch (err: any) {
      console.warn('[DB] PostgreSQL error in togglePromotion, falling back to JSON:', err.message);
    }
  }

  return mutateJsonDb((data) => {
    const promo = data.promotions.find((p) => p.id === id);
    if (!promo) return null;
    promo.is_active = isActive;
    return { ...promo };
  });
}

export async function getOrders(): Promise<Order[]> {
  const usePg = await checkAndInitPostgres();
  if (usePg && pgPool) {
    try {
      const res = await pgPool.query('SELECT * FROM orders ORDER BY order_number DESC');
      return res.rows.map(mapOrderRow);
    } catch (err: any) {
      console.warn('[DB] PostgreSQL error in getOrders, falling back to JSON:', err.message);
    }
  }

  const data = await readJsonDb();
  return [...data.orders].sort((a, b) => b.order_number - a.order_number);
}

export async function getOrderById(id: string): Promise<Order | null> {
  const usePg = await checkAndInitPostgres();
  if (usePg && pgPool) {
    try {
      const res = await pgPool.query('SELECT * FROM orders WHERE id = $1', [id]);
      if (res.rows.length === 0) return null;
      return mapOrderRow(res.rows[0]);
    } catch (err: any) {
      console.warn('[DB] PostgreSQL error in getOrderById, falling back to JSON:', err.message);
    }
  }

  const data = await readJsonDb();
  const order = data.orders.find((o) => o.id === id);
  return order ? { ...order } : null;
}

export async function createOrder(
  orderData: Omit<Order, 'id' | 'order_number' | 'created_at' | 'refunded_at'>
): Promise<Order> {
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  let createdOrder: Order | null = null;

  const usePg = await checkAndInitPostgres();
  if (usePg && pgPool) {
    try {
      const res = await pgPool.query(
        `INSERT INTO orders (
          id, customer_name, customer_email, shipping_city, shipping_address,
          status, subtotal_amount, discount_amount, shipping_amount,
          total_paid_amount, refunded_amount, coupon_code_used,
          items_json, attribution_data, created_at, refunded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
        [
          id,
          orderData.customer_name,
          orderData.customer_email,
          orderData.shipping_city,
          orderData.shipping_address,
          orderData.status || 'paid',
          orderData.subtotal_amount,
          orderData.discount_amount || 0,
          orderData.shipping_amount || 0,
          orderData.total_paid_amount,
          orderData.refunded_amount || 0,
          orderData.coupon_code_used ?? null,
          JSON.stringify(orderData.items_json),
          JSON.stringify(orderData.attribution_data || {}),
          created_at,
          null,
        ]
      );
      createdOrder = mapOrderRow(res.rows[0]);
    } catch (err: any) {
      console.warn('[DB] PostgreSQL error in createOrder, falling back to JSON:', err.message);
    }
  }

  if (!createdOrder) {
    createdOrder = await mutateJsonDb((data) => {
      const maxOrderNum = data.orders.reduce((max, o) => Math.max(max, o.order_number), 1000);
      const newOrder: Order = {
        ...orderData,
        id,
        order_number: maxOrderNum + 1,
        status: orderData.status || 'paid',
        discount_amount: orderData.discount_amount || 0,
        shipping_amount: orderData.shipping_amount || 0,
        refunded_amount: orderData.refunded_amount || 0,
        coupon_code_used: orderData.coupon_code_used ?? null,
        attribution_data: orderData.attribution_data || {},
        created_at,
        refunded_at: null,
      };
      data.orders.push(newOrder);
      return { ...newOrder };
    });
  }

  // Trigger order.paid webhook
  triggerWebhook('order.paid', createdOrder).catch((err) =>
    console.warn('[Webhook] Trigger error in createOrder:', err)
  );

  return createdOrder;
}

export async function refundOrder(
  id: string,
  refundAmount: number
): Promise<Order | null> {
  const now = new Date().toISOString();
  let refundedOrder: Order | null = null;

  const usePg = await checkAndInitPostgres();
  if (usePg && pgPool) {
    try {
      const existingRes = await pgPool.query('SELECT * FROM orders WHERE id = $1', [id]);
      if (existingRes.rows.length > 0) {
        const currentOrder = mapOrderRow(existingRes.rows[0]);
        const prevRefunded = currentOrder.refunded_amount || 0;
        const totalPaid = currentOrder.total_paid_amount;
        const newRefunded = Number(Math.min(totalPaid, prevRefunded + refundAmount).toFixed(2));
        const newStatus = newRefunded >= totalPaid ? 'refunded' : 'partially_refunded';

        const updateRes = await pgPool.query(
          `UPDATE orders
           SET refunded_amount = $1, status = $2, refunded_at = $3
           WHERE id = $4
           RETURNING *`,
          [newRefunded, newStatus, now, id]
        );
        if (updateRes.rows.length > 0) {
          refundedOrder = mapOrderRow(updateRes.rows[0]);
        }
      }
    } catch (err: any) {
      console.warn('[DB] PostgreSQL error in refundOrder, falling back to JSON:', err.message);
    }
  }

  if (!refundedOrder) {
    refundedOrder = await mutateJsonDb((data) => {
      const order = data.orders.find((o) => o.id === id);
      if (!order) return null;
      const prevRefunded = order.refunded_amount || 0;
      const totalPaid = order.total_paid_amount;
      const newRefunded = Number(Math.min(totalPaid, prevRefunded + refundAmount).toFixed(2));
      const newStatus = newRefunded >= totalPaid ? 'refunded' : 'partially_refunded';

      order.refunded_amount = newRefunded;
      order.status = newStatus;
      order.refunded_at = now;
      return { ...order };
    });
  }

  if (refundedOrder) {
    triggerWebhook('order.refunded', refundedOrder).catch((err) =>
      console.warn('[Webhook] Trigger error in refundOrder:', err)
    );
  }

  return refundedOrder;
}

export async function getStoreSettings(): Promise<StoreSettings> {
  const usePg = await checkAndInitPostgres();
  if (usePg && pgPool) {
    try {
      const res = await pgPool.query('SELECT * FROM store_settings WHERE id = 1');
      if (res.rows.length > 0) {
        return mapStoreSettingsRow(res.rows[0]);
      }
    } catch (err: any) {
      console.warn('[DB] PostgreSQL error in getStoreSettings, falling back to JSON:', err.message);
    }
  }

  const data = await readJsonDb();
  return { ...data.store_settings };
}

export async function updateStoreSettings(
  settings: Partial<StoreSettings>
): Promise<StoreSettings> {
  const now = new Date().toISOString();
  let updatedSettings: StoreSettings | null = null;

  const usePg = await checkAndInitPostgres();
  if (usePg && pgPool) {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      for (const [key, value] of Object.entries(settings)) {
        if (key === 'id') continue;
        fields.push(`${key} = $${idx++}`);
        values.push(value);
      }
      fields.push(`updated_at = $${idx++}`);
      values.push(now);

      const query = `UPDATE store_settings SET ${fields.join(', ')} WHERE id = 1 RETURNING *`;
      const res = await pgPool.query(query, values);
      if (res.rows.length > 0) {
        updatedSettings = mapStoreSettingsRow(res.rows[0]);
      }
    } catch (err: any) {
      console.warn('[DB] PostgreSQL error in updateStoreSettings, falling back to JSON:', err.message);
    }
  }

  if (!updatedSettings) {
    updatedSettings = await mutateJsonDb((data) => {
      Object.assign(data.store_settings, settings, { updated_at: now });
      return { ...data.store_settings };
    });
  }

  return updatedSettings;
}
