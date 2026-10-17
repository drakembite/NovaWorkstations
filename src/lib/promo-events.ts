// Calendar of commercial events shown on /promociones. Each event carries its dates; its status
// (finished, current, upcoming) is computed against the clock, never typed.

export interface CommercialEvent {
  quarter: string;
  title: string;
  description: string;
  /** Inclusive window, ISO 8601 with the Lima offset (UTC-5, no DST). */
  starts_at: string;
  ends_at: string;
  highlight?: boolean;
}

export type EventStatus = 'ended' | 'current' | 'upcoming';

export const COMMERCIAL_EVENTS: readonly CommercialEvent[] = [
  {
    quarter: 'Q1 - Marzo',
    title: 'Cyber Pro Hardware Kickoff',
    description: 'Campañas de inicio de año con 10% de descuento en estaciones móviles y periféricos de precisión.',
    starts_at: '2026-03-01T00:00:00-05:00',
    ends_at: '2026-03-31T23:59:59-05:00',
  },
  {
    quarter: 'Q3 - Julio',
    title: 'Especial Fiestas Patrias',
    description: 'Descuentos conmemorativos en laptops y torres para arquitectos y creadores audiovisuales.',
    starts_at: '2026-07-01T00:00:00-05:00',
    ends_at: '2026-07-31T23:59:59-05:00',
  },
  {
    quarter: 'Q4 - Octubre',
    title: 'Tech Architecture & CAD Days',
    description: 'Campaña de hardware certificado para Revit, AutoCAD, Blender y Unreal Engine.',
    starts_at: '2026-10-01T00:00:00-05:00',
    ends_at: '2026-10-31T23:59:59-05:00',
    highlight: true,
  },
  {
    quarter: 'Q4 - Noviembre',
    title: 'Black Friday & Cyber Monday Pro',
    description: 'Nuestra mayor campaña del año con 15% OFF en workstations de gama alta con código BLACKFRIDAY15.',
    starts_at: '2026-11-01T00:00:00-05:00',
    ends_at: '2026-11-30T23:59:59-05:00',
    highlight: true,
  },
  {
    quarter: 'Q4 - Diciembre',
    title: 'Renovación Tecnológica Corporativa',
    description: 'Precios especiales por volumen de estaciones de trabajo para estudios y productoras.',
    starts_at: '2026-12-01T00:00:00-05:00',
    ends_at: '2026-12-31T23:59:59-05:00',
  },
];

/** Both ends are inclusive: the start instant and the end instant are still "current". */
export function eventStatus(event: Pick<CommercialEvent, 'starts_at' | 'ends_at'>, at: Date): EventStatus {
  const t = at.getTime();
  if (t < Date.parse(event.starts_at)) return 'upcoming';
  if (t > Date.parse(event.ends_at)) return 'ended';
  return 'current';
}

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  ended: 'Finalizado',
  current: 'Vigente Ahora',
  upcoming: 'Próximamente',
};
