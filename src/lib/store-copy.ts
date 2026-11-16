// Spanish storefront copy about the store being an intermediary and the outbound buy link.
// One source so the product page, cards and footer always say the same thing.

export const NO_BUY_LINK_TEXT = 'Enlace de compra no disponible por el momento';

/** Product page: full notice next to the buy button. */
export const DEMO_NOTICE_LONG =
  'NovaWorkstations es un intermediario: el botón te lleva a la página de la tienda donde se realiza la compra.';

/** Product cards: short notice under the buy button. */
export const DEMO_NOTICE_SHORT =
  'Intermediario: el botón te lleva a la tienda donde se realiza la compra.';

/** Footer statement, site wide. */
export const DEMO_NOTICE_FOOTER =
  'NovaWorkstations es un intermediario: la compra, el pago y el envío se realizan en la tienda a la que te lleva el botón «Comprar».';

/** Product page, next to the price: the USD price is a reference, not a seller's offer. */
export const REFERENCE_PRICE_NOTICE =
  'Precio de referencia de NovaWorkstations, no es una oferta: confirma el precio final y la disponibilidad en la tienda de destino.';

/** Product page: how the soles figures were converted. `ref.asOf` is an ISO date. */
export function exchangeRateNote(ref: { rate: number; asOf: string }): string {
  const [y, m, d] = ref.asOf.split('-');
  return `Tipo de cambio promedio S/ ${ref.rate.toFixed(3)} por US$ (BCRP, al ${d}/${m}/${y}). Referencial.`;
}
