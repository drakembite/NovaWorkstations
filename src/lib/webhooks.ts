import { WebhookEvent } from '@/types/database';
import { getStoreSettings } from './db';

export async function triggerWebhook(
  event: WebhookEvent,
  payload: any
): Promise<{ success: boolean; url?: string | null; error?: string }> {
  try {
    const settings = await getStoreSettings();
    let url: string | null = null;

    if (event === 'product.updated') {
      url = settings.webhook_url_product_updated;
    }

    if (!url || typeof url !== 'string' || !url.trim()) {
      return { success: true, url: null };
    }

    // Format body conforming to spec if not already formatted
    let body: any = payload;
    if (!payload.event) {
      body = {
        event: 'product.updated',
        timestamp: new Date().toISOString(),
        product: {
          id: payload.id,
          sku: payload.sku,
          slug: payload.slug,
          price: payload.price,
          stock_quantity: payload.stock_quantity,
          short_description: payload.short_description,
          updated_at: payload.updated_at,
        },
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.warn(`[Webhook] ${event} to ${url} responded with status ${response.status}`);
      return { success: false, url, error: `HTTP ${response.status}` };
    }

    return { success: true, url };
  } catch (error: any) {
    console.warn(`[Webhook] Error dispatching ${event}:`, error?.message || error);
    return { success: false, error: error?.message || String(error) };
  }
}
