import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildProspectBody,
  normalizeProspectText,
  prospectErrorMessage,
  validateProspect,
} from './prospect-form.ts';

const COMPLETO = {
  name: 'Farmacia San José',
  phone: '7777-7777',
  email: 'contacto@farmacia.com',
  nrc: '123456-7',
  nit: '0614-123456-001-2',
};

const MINIMO = { name: 'Farmacia San José', phone: '7777-7777', email: '', nrc: '', nit: '' };

test('el texto se recorta y colapsa espacios, como en el resto de los formularios', () => {
  assert.equal(normalizeProspectText('  Farmacia   San José '), 'Farmacia San José');
  assert.equal(normalizeProspectText('\tDroguería\n Central'), 'Droguería Central');
});

test('con nombre y telefono alcanza: los demas campos son opcionales', () => {
  assert.deepEqual(validateProspect(MINIMO), {
    ok: true,
    value: { name: 'Farmacia San José', phone: '7777-7777' },
  });
});

test('un formulario completo devuelve los cinco campos ya normalizados', () => {
  assert.deepEqual(validateProspect({ ...COMPLETO, name: '  Farmacia   San José ' }), {
    ok: true,
    value: {
      name: 'Farmacia San José',
      phone: '7777-7777',
      email: 'contacto@farmacia.com',
      nrc: '123456-7',
      nit: '0614-123456-001-2',
    },
  });
});

test('sin nombre el error apunta al campo del nombre', () => {
  const result = validateProspect({ ...MINIMO, name: '   ' });
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.field, 'name');
});

test('sin telefono el error apunta al campo del telefono', () => {
  const result = validateProspect({ ...MINIMO, phone: '  ' });
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.field, 'phone');
});

test('el nombre y el telefono se cortan en los topes de la API, no en el 400', () => {
  const nombreLargo = validateProspect({ ...MINIMO, name: 'a'.repeat(201) });
  assert.equal(nombreLargo.ok, false);
  assert.equal(!nombreLargo.ok && nombreLargo.field, 'name');

  const telefonoLargo = validateProspect({ ...MINIMO, phone: '7'.repeat(41) });
  assert.equal(telefonoLargo.ok, false);
  assert.equal(!telefonoLargo.ok && telefonoLargo.field, 'phone');

  assert.equal(validateProspect({ ...MINIMO, name: 'a'.repeat(200) }).ok, true);
  assert.equal(validateProspect({ ...MINIMO, phone: '7'.repeat(40) }).ok, true);
});

test('el correo escrito tiene que parecer un correo', () => {
  const result = validateProspect({ ...MINIMO, email: 'contacto arroba farmacia' });
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.field, 'email');
});

test('el correo se guarda en minusculas', () => {
  const result = validateProspect({ ...MINIMO, email: '  Contacto@Farmacia.COM ' });
  assert.equal(result.ok && result.value.email, 'contacto@farmacia.com');
});

test('NRC y NIT van como los escribio el vendedor: sin formato forzado', () => {
  const result = validateProspect({ ...MINIMO, nrc: 'nrc 123', nit: '0614 123456 001 2' });
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.value.nrc, 'nrc 123');
  assert.equal(result.ok && result.value.nit, '0614 123456 001 2');
});

test('el cuerpo lleva las coordenadas y la hora del dispositivo con offset', () => {
  const body = buildProspectBody(
    { name: 'Farmacia San José', phone: '7777-7777' },
    { lat: 13.6929, lng: -89.2182 },
    new Date('2026-10-16T20:05:00.000Z'),
  );

  assert.deepEqual(body, {
    name: 'Farmacia San José',
    phone: '7777-7777',
    latitude: 13.6929,
    longitude: -89.2182,
    captured_at: '2026-10-16T20:05:00.000Z',
  });
});

test('el cuerpo omite los opcionales vacios en vez de mandarlos en blanco', () => {
  const body = buildProspectBody(
    { name: 'Farmacia San José', phone: '7777-7777', email: 'contacto@farmacia.com' },
    { lat: 13.6929, lng: -89.2182 },
    new Date('2026-10-16T20:05:00.000Z'),
  );

  assert.equal(body.email, 'contacto@farmacia.com');
  assert.equal('nrc' in body, false);
  assert.equal('nit' in body, false);
});

test('los errores esperados de la API se traducen al español', () => {
  assert.equal(prospectErrorMessage(403, 'Acceso denegado para este rol'), 'Tu usuario no puede registrar prospectos.');
  assert.equal(
    prospectErrorMessage(400, 'Validation error in request body'),
    'Revisa los datos del prospecto e intenta de nuevo.',
  );
  assert.equal(
    prospectErrorMessage(500, 'Internal server error'),
    'No se pudo registrar el prospecto. Intenta de nuevo.',
  );
});

test('sin conexion se conserva el mensaje en español de apiFetch', () => {
  assert.equal(
    prospectErrorMessage(0, 'No se pudo conectar con el servidor.'),
    'No se pudo conectar con el servidor.',
  );
});
