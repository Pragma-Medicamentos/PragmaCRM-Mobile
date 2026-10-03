import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Coordinates } from './distance.ts';
import type { LocationRead } from './visit-gate.ts';
import {
  GPS_RADIUS_METERS,
  isPreciseEnoughToPin,
  isVisitable,
  isWithinRadius,
  needsLocation,
  visitGate,
  visitGateMessage,
} from './visit-gate.ts';

const CLIENTE: Coordinates = { lat: 13.7012, lng: -89.2412 };

/**
 * Corre `metros` al norte de `from`. Al norte y no al este a proposito: un
 * grado de latitud mide practicamente lo mismo en todo el planeta, asi que el
 * desplazamiento no depende de en que latitud cae el caso de prueba.
 */
function metrosAlNorte(from: Coordinates, metros: number): Coordinates {
  return { lat: from.lat + metros / 111_320, lng: from.lng };
}

/** Una lectura buena en `location`, que es el caso normal. */
function lectura(location: Coordinates, accuracyMeters: number | null = 5): LocationRead {
  return { status: 'ok', location, accuracyMeters };
}

const CLIENTE_PENDIENTE = {
  target_kind: 'customer' as const,
  completed_at: null,
  location: CLIENTE,
};

test('un cliente pendiente con pin admite validacion', () => {
  assert.equal(isVisitable(CLIENTE_PENDIENTE), true);
});

test('un prospecto no admite validacion aunque tenga pin', () => {
  // La invariante de PCRM-52: el endpoint responde 422 sobre prospectos. Si
  // alguien cambia la compuerta a `location !== null` -- que es el error
  // natural, porque el prospecto del seed SI tiene GPS -- este falla.
  assert.equal(
    isVisitable({ target_kind: 'prospect', completed_at: null, location: CLIENTE }),
    false,
  );
});

test('una parada ya completada no admite validacion', () => {
  assert.equal(
    isVisitable({ ...CLIENTE_PENDIENTE, completed_at: '2026-09-28T09:10:00-06:00' }),
    false,
  );
});

test('un cliente sin pin no admite validacion', () => {
  // Caso real y frecuente: la lista de clientes tiene un filtro `without_gps`.
  // El servidor calcula la distancia contra el pin del cliente; sin pin no hay
  // contra que comparar.
  assert.equal(isVisitable({ ...CLIENTE_PENDIENTE, location: null }), false);
});

test('parado encima del cliente esta dentro del rango', () => {
  assert.equal(visitGate(CLIENTE, lectura(CLIENTE)).status, 'ready');
});

test('a 25m esta dentro y a 200m esta fuera', () => {
  assert.equal(visitGate(CLIENTE, lectura(metrosAlNorte(CLIENTE, 25))).status, 'ready');
  assert.equal(visitGate(CLIENTE, lectura(metrosAlNorte(CLIENTE, 200))).status, 'too-far');
});

test('el radio exacto cuenta como dentro', () => {
  // La API fija esto con un test propio ("treats exactly the radius as
  // inside"). Las dos puntas tienen que coincidir: con `<` en vez de `<=`, el
  // boton se deshabilitaria justo donde el servidor habria aceptado.
  //
  // Se prueba sobre metros y no construyendo coordenadas a 80m: con
  // coordenadas el valor cae en 79.91 y el test pasa con `<` igual que con
  // `<=`, o sea que no probaria nada. Verificado por mutacion.
  assert.equal(isWithinRadius(GPS_RADIUS_METERS), true);
  assert.equal(isWithinRadius(GPS_RADIUS_METERS + 0.01), false);
  assert.equal(isWithinRadius(GPS_RADIUS_METERS - 0.01), true);
});

test('sin lectura del dispositivo la compuerta no adivina', () => {
  // Nunca "ready" por defecto: sin GPS no se puede afirmar que el vendedor
  // esta en el lugar, que es lo unico que la visita pretende demostrar.
  assert.equal(visitGate(CLIENTE, null).status, 'unavailable');
});

test('distingue permiso negado de falta de señal', () => {
  // No son lo mismo y piden acciones distintas del vendedor: una se arregla
  // dando el permiso, la otra saliendo a cielo abierto. Cuando esto era un
  // solo estado, la app le decia que revisara los permisos aunque los
  // tuviera concedidos.
  assert.equal(visitGate(CLIENTE, { status: 'denied' }).status, 'denied');
  assert.equal(visitGate(CLIENTE, { status: 'unavailable' }).status, 'unavailable');

  assert.match(visitGateMessage({ status: 'denied' }), /permiso de ubicación/);
  assert.match(visitGateMessage({ status: 'unavailable' }), /No se pudo obtener/);
});

test('avisa cuando la precision no alcanza para decidir el radio', () => {
  // Una lectura con ±150m no puede sostener "estas dentro de 80m". El
  // veredicto sigue siendo "ready" -- bloquear es otra decision -- pero el
  // vendedor ve la incertidumbre en vez de un tilde que finge certeza.
  const flojo = visitGateMessage({ status: 'ready', distanceMeters: 25, accuracyMeters: 150 });
  assert.match(flojo, /precisión ±/);

  const bueno = visitGateMessage({ status: 'ready', distanceMeters: 25, accuracyMeters: 5 });
  assert.doesNotMatch(bueno, /precisión ±/);
});

test('cada estado explica el motivo al vendedor', () => {
  // CA2 de HU-06 no pide solo rechazar: pide notificar el motivo.
  assert.match(
    visitGateMessage({ status: 'ready', distanceMeters: 25, accuracyMeters: 5 }),
    /Dentro del rango/,
  );
  assert.match(
    visitGateMessage({ status: 'too-far', distanceMeters: 200 }),
    /Acércate al cliente/,
  );
  assert.match(visitGateMessage({ status: 'unavailable' }), /ubicación/);
});

test('el motivo incluye la distancia, que es lo accionable', () => {
  // "Acércate" sin decir cuanto no le sirve al vendedor para decidir si
  // caminar o si el pin del cliente esta mal cargado.
  assert.match(visitGateMessage({ status: 'too-far', distanceMeters: 200 }), /200m/);
  assert.match(
    visitGateMessage({ status: 'ready', distanceMeters: 25, accuracyMeters: 5 }),
    /25m/,
  );
});

test('un cliente pendiente sin pin necesita que se le fije ubicacion', () => {
  assert.equal(needsLocation({ ...CLIENTE_PENDIENTE, location: null }), true);
});

test('un cliente con pin, completado o un prospecto no piden ubicacion', () => {
  assert.equal(needsLocation(CLIENTE_PENDIENTE), false);
  assert.equal(
    needsLocation({ ...CLIENTE_PENDIENTE, location: null, completed_at: '2026-09-29T15:00:00Z' }),
    false,
  );
  assert.equal(
    needsLocation({ ...CLIENTE_PENDIENTE, location: null, target_kind: 'prospect' }),
    false,
  );
});

test('fijar el pin exige una precision no peor que el radio', () => {
  assert.equal(isPreciseEnoughToPin(GPS_RADIUS_METERS), true);
  assert.equal(isPreciseEnoughToPin(12), true);
  assert.equal(isPreciseEnoughToPin(GPS_RADIUS_METERS + 1), false);
  // Sin precision informada no se puede saber cuanto se equivoca la lectura.
  assert.equal(isPreciseEnoughToPin(null), false);
});
