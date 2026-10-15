import { apiFetch } from '@/lib/api';
import type { ValidProductRequest } from '@/lib/product-request-form';

/** Lo que `POST /api/v1/product-requests` devuelve (PCRM-65). */
export interface RegisteredProductRequest {
  id: string;
  visit_id: string;
  customer_id: string;
  scheduled_visit_id: string;
  quoted_product: { id: string; name: string };
  requested_quantity: number | null;
  requested_at: string;
}

export type RegisterProductRequestInput = ValidProductRequest & {
  /** Es `DailyRouteStop.id`: el servidor resuelve la visita de esa parada. */
  scheduledVisitId: string;
};

/**
 * Registra un producto fuera de catalogo pedido en una visita (RF-11, HU-11
 * CA1). Solo manda la parada: cliente, visita y vendedor los pone el servidor,
 * asi la app no puede asociar el pedido a una visita ajena.
 */
export async function registerProductRequest(
  input: RegisterProductRequestInput,
): Promise<RegisteredProductRequest> {
  return apiFetch<RegisteredProductRequest>('/api/v1/product-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scheduled_visit_id: input.scheduledVisitId,
      product_name: input.productName,
      ...(input.requestedQuantity !== undefined
        ? { requested_quantity: input.requestedQuantity }
        : {}),
    }),
  });
}
