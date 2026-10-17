// The demo store's declared policy, stated once.
//
// NovaWorkstations sells nothing: these figures are the policy the demo store DECLARES, and they
// are the ground truth for questions about delivery, returns and warranty. Every page, the
// navbar, the footer and the metadata read them from here so they can never disagree. No other
// source file may hardcode these numbers (scripts/test-demo-copy.ts enforces it).

/** Label shown wherever the declared policy is stated. */
export const DEMO_POLICY_LABEL = 'Política de la tienda de demostración';

export const STORE_POLICY = {
  /** Orders confirmed before this hour (24h clock) leave the same business day. */
  dispatchCutoff: '16:00',
  limaDeliveryHours: 24,
  provincesDeliveryHours: '48-72',
  /** Shipping is free from this amount, in USD. */
  freeShippingFromUsd: 150,
  returnDays: 30,
  warrantyMonths: 12,
  /** Refund after the return is verified. */
  refundHours: '48-72',
  /** Workshop answer time for a warranty claim. */
  warrantyDiagnosisHours: 48,
  /** Workshop inspection time for a return. */
  returnInspectionHours: '24-48',
} as const;

export interface ShippingZone {
  zone: string;
  leadTime: string;
  feeBelowThresholdUsd: number;
}

/** Fee and lead time per destination. At or above the free-shipping amount every zone is free. */
export const SHIPPING_ZONES: readonly ShippingZone[] = [
  { zone: 'Lima Metropolitana y Callao', leadTime: 'Hasta 24 horas hábiles', feeBelowThresholdUsd: 10 },
  { zone: 'Ciudades Principales de Costa (Trujillo, Chiclayo, Piura, Ica)', leadTime: '48 horas hábiles', feeBelowThresholdUsd: 18 },
  { zone: 'Sierra y Sur (Arequipa, Cusco, Huancayo, Puno)', leadTime: '48 a 72 horas hábiles', feeBelowThresholdUsd: 18 },
  { zone: 'Selva y Destinos Especiales (Iquitos, Pucallpa, Tarapoto)', leadTime: '72 a 96 horas hábiles', feeBelowThresholdUsd: 25 },
];

// ---------------------------------------------------------------------------
// Short labels derived from the figures above
// ---------------------------------------------------------------------------
export const DISPATCH_CUTOFF_LABEL = `${STORE_POLICY.dispatchCutoff} hrs`;
export const LIMA_DELIVERY_SHORT = `${STORE_POLICY.limaDeliveryHours}h`;
export const PROVINCES_DELIVERY_SHORT = `${STORE_POLICY.provincesDeliveryHours}h`;
export const FREE_SHIPPING_LABEL = `US$ ${STORE_POLICY.freeShippingFromUsd}`;
export const RETURN_WINDOW_LABEL = `${STORE_POLICY.returnDays} días`;
export const WARRANTY_LABEL = `${STORE_POLICY.warrantyMonths} meses`;

/** Every hour figure the declared policy uses (a page may only show these). */
export const ALL_HOUR_FIGURES: readonly string[] = [
  String(STORE_POLICY.limaDeliveryHours),
  STORE_POLICY.provincesDeliveryHours,
  STORE_POLICY.refundHours,
  String(STORE_POLICY.warrantyDiagnosisHours),
  STORE_POLICY.returnInspectionHours,
  ...STORE_POLICY.provincesDeliveryHours.split('-'),
  ...STORE_POLICY.returnInspectionHours.split('-'),
  ...SHIPPING_ZONES.flatMap((z) => z.leadTime.match(/\d+/g) ?? []),
];

// ---------------------------------------------------------------------------
// Sentences reused by several surfaces
// ---------------------------------------------------------------------------
/** Navbar announcement. */
export const POLICY_BANNER = `${DEMO_POLICY_LABEL}: envío gratis en compras mayores a ${FREE_SHIPPING_LABEL} | despacho en ${LIMA_DELIVERY_SHORT} en Lima y ${PROVINCES_DELIVERY_SHORT} a nivel nacional`;

/** Footer value proposition lines. */
export const POLICY_FOOTER_SHIPPING = `Entrega en ${LIMA_DELIVERY_SHORT} en Lima y ${PROVINCES_DELIVERY_SHORT} en provincias. Gratis en compras > ${FREE_SHIPPING_LABEL}.`;

/** One-line summary of the shipping policy (shipping page header). */
export const POLICY_SHIPPING_SUMMARY = `Entrega en ${LIMA_DELIVERY_SHORT} en Lima y ${PROVINCES_DELIVERY_SHORT} a nivel nacional, corte a las ${DISPATCH_CUTOFF_LABEL} y envío gratis desde ${FREE_SHIPPING_LABEL}.`;

/** Meta descriptions. */
export const POLICY_META_SHIPPING = `Envíos en ${LIMA_DELIVERY_SHORT} en Lima y garantía de ${WARRANTY_LABEL} (política de la tienda de demostración).`;

/** What happens after the buy button: the destination store takes over. */
export const DESTINATION_STORE_NOTE =
  'Esta tienda no vende ni despacha: al pulsar «Comprar» la compra, el envío, las devoluciones y la garantía los gestiona la tienda donde compres, con sus propias condiciones.';

/** The demo store has no mailbox: nothing here may be answered by email. */
export const NO_MAILBOX_NOTE =
  'La tienda de demostración no tiene buzón de atención al cliente: no hay correo al que escribir.';
