// The store's declared policy, stated once.
//
// NovaWorkstations is an intermediary: it sells nothing and ships nothing. Delivery times, shipping
// costs and coverage belong to the destination store (Amazon, Falabella or another), so this
// module declares none of them. The returns and warranty figures below are the policy the store
// DECLARES for now. Every page, the navbar, the footer and the metadata read them from here so
// they can never disagree. No other source file may hardcode these numbers
// (scripts/test-demo-copy.ts enforces it).

/** Label shown wherever the declared policy is stated. */
export const DEMO_POLICY_LABEL = 'Política de la tienda';

export const STORE_POLICY = {
  returnDays: 30,
  warrantyMonths: 12,
  /** Refund after the return is verified. */
  refundHours: '48-72',
  /** Workshop answer time for a warranty claim. */
  warrantyDiagnosisHours: 48,
  /** Workshop inspection time for a return. */
  returnInspectionHours: '24-48',
} as const;

// ---------------------------------------------------------------------------
// Short labels derived from the figures above
// ---------------------------------------------------------------------------
export const RETURN_WINDOW_LABEL = `${STORE_POLICY.returnDays} días`;
export const WARRANTY_LABEL = `${STORE_POLICY.warrantyMonths} meses`;

/** Every hour figure the declared policy uses (a page may only show these). */
export const ALL_HOUR_FIGURES: readonly string[] = [
  STORE_POLICY.refundHours,
  String(STORE_POLICY.warrantyDiagnosisHours),
  STORE_POLICY.returnInspectionHours,
  ...STORE_POLICY.refundHours.split('-'),
  ...STORE_POLICY.returnInspectionHours.split('-'),
];

// ---------------------------------------------------------------------------
// Sentences reused by several surfaces
// ---------------------------------------------------------------------------
/** Navbar announcement. */
export const POLICY_BANNER =
  'NovaWorkstations es un intermediario: el envío, los plazos, las devoluciones y la garantía los define la tienda donde compres';

/** Footer value proposition line. */
export const POLICY_FOOTER_SHIPPING = 'Plazos y costos de envío según la tienda donde compres.';

/** One-line summary of the shipping policy (shipping page header). */
export const POLICY_SHIPPING_SUMMARY =
  'Los plazos, los costos y la cobertura de envío los define la tienda de destino.';

/** Meta descriptions. */
export const POLICY_META_SHIPPING = `Envío según la tienda de destino y garantía de ${WARRANTY_LABEL} (política de la tienda).`;

/** What happens after the buy button: the destination store takes over. */
export const DESTINATION_STORE_NOTE =
  'Esta tienda es un intermediario: al pulsar «Comprar» la compra, el envío, las devoluciones y la garantía los gestiona la tienda donde compres, con sus propias condiciones.';

/** The store has no mailbox: nothing here may be answered by email. */
export const NO_MAILBOX_NOTE =
  'Esta tienda no tiene buzón de atención al cliente: no hay correo al que escribir.';
