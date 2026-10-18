/**
 * Validacion del formulario de alta de prospecto (PCRM-175). Pura y sin React
 * Native para poder probarla con `node --test`.
 *
 * Replica las reglas de `POST /api/v1/prospects` (PCRM-62) para avisar en el
 * campo antes del viaje de ida y vuelta; el servidor sigue siendo quien
 * decide.
 */

import type { Coordinates } from './distance.ts';

export type ProspectDraft = {
  name: string;
  phone: string;
  /** Los tres de abajo son texto del formulario; vacio = no se manda. */
  email: string;
  nrc: string;
  nit: string;
};

export type ValidProspect = {
  name: string;
  phone: string;
  email?: string;
  nrc?: string;
  nit?: string;
};

export type ProspectValidation =
  | { ok: true; value: ValidProspect }
  | { ok: false; field: 'name' | 'phone' | 'email'; message: string };

/** Topes de `createProspectSchema` en la API: `name` max 200, `phone` max 40. */
const MAX_NAME_LENGTH = 200;
const MAX_PHONE_LENGTH = 40;

/**
 * Lo mas flojo que todavia distingue un correo de algo que no lo es: texto,
 * una arroba, y un dominio con punto. No se busca el formato exacto -- la
 * columna no es unica ni se usa para autenticar a nadie, asi que rechazar un
 * correo raro pero valido le costaria mas al vendedor que aceptarlo.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Recorta y colapsa espacios internos: lo escrito es lo que queda guardado. */
export function normalizeProspectText(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function validateProspect(draft: ProspectDraft): ProspectValidation {
  const name = normalizeProspectText(draft.name);
  if (name.length < 2) {
    return { ok: false, field: 'name', message: 'Escribe el nombre del negocio.' };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return {
      ok: false,
      field: 'name',
      message: `El nombre no puede pasar de ${MAX_NAME_LENGTH} caracteres.`,
    };
  }

  const phone = normalizeProspectText(draft.phone);
  if (phone.length === 0) {
    return { ok: false, field: 'phone', message: 'Escribe un teléfono de contacto.' };
  }
  if (phone.length > MAX_PHONE_LENGTH) {
    return {
      ok: false,
      field: 'phone',
      message: `El teléfono no puede pasar de ${MAX_PHONE_LENGTH} caracteres.`,
    };
  }

  // En minusculas porque el mismo correo escrito de dos formas es el mismo
  // contacto, y la web lo muestra tal cual se guardo.
  const email = normalizeProspectText(draft.email).toLowerCase();
  if (email !== '' && !EMAIL_PATTERN.test(email)) {
    return { ok: false, field: 'email', message: 'Revisa el correo: falta algo.' };
  }

  // NRC y NIT van tal cual: no se les valida formato ni se les pone mascara.
  // Lo que el vendedor escriba mal se corrige desde el panel web, igual que
  // el pin de ubicacion -- y una mascara equivocada seria peor, porque le
  // impediria registrar un negocio cuyo documento no calce con el patron.
  const nrc = normalizeProspectText(draft.nrc);
  const nit = normalizeProspectText(draft.nit);

  return {
    ok: true,
    value: {
      name,
      phone,
      ...(email === '' ? {} : { email }),
      ...(nrc === '' ? {} : { nrc }),
      ...(nit === '' ? {} : { nit }),
    },
  };
}

/** El cuerpo exacto de `POST /api/v1/prospects`. */
export type ProspectBody = {
  name: string;
  phone: string;
  latitude: number;
  longitude: number;
  captured_at: string;
  email?: string;
  nrc?: string;
  nit?: string;
};

/**
 * Arma el cuerpo del POST. Vive aca, separado de `registerProspect`, por dos
 * razones: es el unico lugar donde los nombres de los campos de la API estan
 * escritos -- si PCRM-185 termina llamandolos distinto (`correo` en vez de
 * `email`, por ejemplo), se cambian aca y en ningun otro lado -- y asi se
 * puede probar sin levantar la app.
 *
 * `captured_at` es el momento en el dispositivo, no el de llegada al
 * servidor, y viaja con offset explicito: `toISOString()` termina en `Z`, que
 * es justo lo que `createProspectSchema` exige. Sin offset el servidor
 * rechaza el registro, porque el vendedor puede estar en cualquier zona.
 */
export function buildProspectBody(
  prospect: ValidProspect,
  location: Coordinates,
  capturedAt: Date,
): ProspectBody {
  return {
    name: prospect.name,
    phone: prospect.phone,
    latitude: location.lat,
    longitude: location.lng,
    captured_at: capturedAt.toISOString(),
    ...(prospect.email === undefined ? {} : { email: prospect.email }),
    ...(prospect.nrc === undefined ? {} : { nrc: prospect.nrc }),
    ...(prospect.nit === undefined ? {} : { nit: prospect.nit }),
  };
}

/**
 * Mensaje para el vendedor segun el status de la API. Los mensajes del
 * servidor vienen en ingles salvo los de permisos, asi que los esperados se
 * traducen aca; el status 0 ya trae texto en español desde `apiFetch` (sin
 * conexion, timeout) y se muestra tal cual.
 */
export function prospectErrorMessage(status: number, serverMessage: string): string {
  switch (status) {
    case 0:
      return serverMessage;
    case 400:
      return 'Revisa los datos del prospecto e intenta de nuevo.';
    case 403:
      return 'Tu usuario no puede registrar prospectos.';
    default:
      return 'No se pudo registrar el prospecto. Intenta de nuevo.';
  }
}
