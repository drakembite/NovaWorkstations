import React from 'react';
import { Product } from '@/types/database';
import { validateBuyUrl } from '@/lib/buy-url';
import { NO_BUY_LINK_TEXT } from '@/lib/store-copy';
import { BuyLink } from './BuyLink';

export interface BuyActionProps {
  product: Pick<Product, 'sku' | 'buy_url' | 'buy_store'> & Partial<Pick<Product, 'buy_note'>>;
  compact?: boolean;
}

function storeLabel(product: BuyActionProps['product'], url: string): string {
  const store = product.buy_store?.trim();
  if (store) return store;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * The only purchase affordance of the store: an outbound link when the product has a valid
 * https `buy_url`, otherwise a neutral text (no button, no cart). The URL is re-validated here so
 * a bad stored value can never become an href. An optional `buy_note` is shown right below the
 * button as escaped plain text (React escapes it; it is never injected as HTML), and only when the
 * product has a valid link.
 */
export function BuyAction({ product, compact = false }: BuyActionProps) {
  const checked = validateBuyUrl(product.buy_url);
  if (!checked.ok || !checked.value) {
    return (
      <p className={compact ? 'text-xs text-slate-500' : 'text-sm text-slate-400'}>{NO_BUY_LINK_TEXT}</p>
    );
  }

  const note = product.buy_note?.trim();

  return (
    <div className={compact ? 'flex flex-col items-end' : 'flex flex-col items-start'}>
      <BuyLink
        sku={product.sku}
        href={checked.value}
        store={storeLabel(product, checked.value)}
        compact={compact}
      />
      {note ? (
        <p
          data-buy-note=""
          className={
            compact
              ? 'mt-1.5 max-w-[13rem] text-right text-[10px] leading-snug text-slate-400'
              : 'mt-2.5 text-xs leading-relaxed text-slate-400'
          }
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}
