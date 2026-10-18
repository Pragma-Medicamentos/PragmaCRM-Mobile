/**
 * Validacion del formulario de producto fuera de catalogo (PCRM-66, wireframe
 * 8). Pura y sin React Native para poder probarla con `node --test`.
 *
 * Replica las reglas de `POST /api/v1/product-requests` (PCRM-65) para avisar
 * en el campo antes del viaje de ida y vuelta; el servidor sigue siendo quien
 * decide.
 */

export type ProductRequestDraft = {
  productName: string;
  /** Texto tal cual lo escribio el vendedor; vacio = sin cantidad. */
  quantity: string;
};

export type ValidProductRequest = {
  productName: string;
  requestedQuantity?: number;
};

export type ProductRequestValidation =
  | { ok: true; value: ValidProductRequest }
  | { ok: false; field: 'productName' | 'quantity'; message: string };

/** Tope de la API: `requested_quantity` es numeric(12,3). */
const MAX_QUANTITY = 999_999_999;

/**
 * Recorta y colapsa espacios internos, igual que el servidor: asi lo que el
 * vendedor ve confirmado es exactamente lo que queda guardado.
 */
export function normalizeProductName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

/**
 * `undefined` para vacio, `null` para algo que no es una cantidad valida.
 * Acepta coma decimal: el teclado numerico en español la ofrece en vez del
 * punto.
 */
export function parseQuantity(raw: string): number | undefined | null {
  const text = raw.trim();
  if (text === '') return undefined;
  if (!/^\d+([.,]\d+)?$/.test(text)) return null;

  const value = Number(text.replace(',', '.'));
  return value > 0 && value <= MAX_QUANTITY ? value : null;
}

export function validateProductRequest(draft: ProductRequestDraft): ProductRequestValidation {
  const productName = normalizeProductName(draft.productName);
  if (productName.length < 2) {
    return { ok: false, field: 'productName', message: 'Escribe el nombre del producto.' };
  }

  const requestedQuantity = parseQuantity(draft.quantity);
  if (requestedQuantity === null) {
    return {
      ok: false,
      field: 'quantity',
      message: 'La cantidad debe ser un número mayor que cero.',
    };
  }

  return {
    ok: true,
    value: requestedQuantity === undefined ? { productName } : { productName, requestedQuantity },
  };
}

/**
 * Mensaje para el vendedor segun el status de la API. Los mensajes del
 * servidor vienen en ingles (los de `src/` del backend van en ingles), asi que
 * los esperados se traducen aca; el status 0 ya trae texto en español desde
 * `apiFetch` (sin conexion, timeout).
 */
export function productRequestErrorMessage(status: number, serverMessage: string): string {
  switch (status) {
    case 0:
      return serverMessage;
    case 403:
      return 'Esta parada no está asignada a ti.';
    case 404:
      return 'La parada ya no existe. Actualiza la ruta.';
    case 422:
      return 'Primero valida la visita para registrar productos.';
    default:
      return 'No se pudo registrar el producto. Intenta de nuevo.';
  }
}
