/**
 * Metricas comerciales del cliente de una parada (PCRM-164), tal como las
 * muestra el detalle.
 *
 * Los formateadores viven sin imports de React Native para que `node --test`
 * los cubra: deciden que ve el vendedor cuando un dato falta, y eso no debe
 * depender del JSX.
 */

import { formatUsd } from './customer-profile.ts';

/**
 * Categoria A/B/C derivada en el backend. `uncategorized` cuando no hay con
 * que calificarlo: sin ventas en la ventana o sin facturas de credito pagadas.
 */
export type CustomerCategory = 'A' | 'B' | 'C' | 'uncategorized';

/**
 * Dinero como string, igual que en la API: `numeric(14,2)` en Postgres y sin
 * pasar por punto flotante hasta el momento de formatearlo.
 */
export type Money = string;

/** El mismo `summary` que el perfil del panel web (GET /customers/:id). */
export interface CustomerSummary {
  /** Compras netas de los ultimos 12 meses. */
  net_purchases: Money;
  /** Facturas de los ultimos 12 meses. */
  orders_count: number;
  /** Visitas comerciales (no despachos ni cobros) de los ultimos 12 meses. */
  visits_count: number;
  /** Porcentaje entero de visitas que terminaron en venta. */
  conversion_rate: number;
  /** Null sin facturas de credito pagadas: no es lo mismo que "paga al dia". */
  avg_payment_days: number | null;
  /** Saldo pendiente total, sin limite de antiguedad. */
  pending_balance: Money;
  /** Dias promedio entre compras. Null con menos de dos compras. */
  purchase_frequency_days: number | null;
  /** ISO 8601 en el cable. */
  last_purchase_at: string | null;
  last_visit_at: string | null;
}

export interface CustomerVisitNote {
  /** ISO 8601. */
  date: string;
  notes: string;
}

/** Lo que devuelve `GET /api/v1/me/route/stops/:id/customer`. */
export interface StopCustomerMetrics {
  customer_id: string;
  category: CustomerCategory;
  summary: CustomerSummary;
  /** Las ultimas notas de campo, la mas reciente primero. */
  recent_notes: CustomerVisitNote[];
}

/** Se muestra en vez de un dato que no existe, para que la tarjeta no salte. */
export const NO_DATA = '—';

export const CATEGORY_LABELS: Record<CustomerCategory, string> = {
  A: 'Categoría A',
  B: 'Categoría B',
  C: 'Categoría C',
  uncategorized: 'Sin categoría',
};

/** `$1,520.40` desde el string de la API. Un valor ilegible no se inventa. */
export function formatMoney(value: Money): string {
  const amount = Number(value);
  return Number.isFinite(amount) ? formatUsd(amount) : NO_DATA;
}

/** `1 día` / `38 días`, o el guion si no hay dato. */
export function formatDays(value: number | null): string {
  if (value === null) return NO_DATA;
  return value === 1 ? '1 día' : `${value} días`;
}

// Zona fija por la misma razon que `format-time.ts`: la fecha de una compra es
// un dato de negocio, no algo que cambie con el huso del telefono.
const dateFormatter = new Intl.DateTimeFormat('es-SV', {
  timeZone: 'America/El_Salvador',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** `30 sept 2026`, o el guion si no hay fecha. */
export function formatMetricDate(iso: string | null): string {
  if (!iso) return NO_DATA;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? NO_DATA : dateFormatter.format(date).replace(/\./g, '');
}
