import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  NOTE_MAX_LENGTH,
  canSaveNote,
  noteErrorNeedsRefresh,
  stopNoteErrorMessage,
} from './note.ts';

test('una nota vacia o solo con espacios no se guarda', () => {
  assert.equal(canSaveNote('', null), false);
  assert.equal(canSaveNote('   \n ', 'Sin novedad'), false);
});

test('una nota igual a la actual no se guarda, aunque difiera en espacios', () => {
  assert.equal(canSaveNote('Sin novedad', 'Sin novedad'), false);
  assert.equal(canSaveNote('  Sin novedad  ', 'Sin novedad'), false);
});

test('una nota nueva o distinta de la actual se guarda', () => {
  assert.equal(canSaveNote('Cliente ausente', null), true);
  assert.equal(canSaveNote('Cliente ausente', 'Sin novedad'), true);
});

test('una nota por encima del maximo del servidor no se guarda', () => {
  assert.equal(canSaveNote('a'.repeat(NOTE_MAX_LENGTH), null), true);
  assert.equal(canSaveNote('a'.repeat(NOTE_MAX_LENGTH + 1), null), false);
});

test('status 0 muestra el mensaje que ya armo apiFetch', () => {
  assert.equal(stopNoteErrorMessage(0, 'Sin conexión'), 'Sin conexión');
});

test('cada status del endpoint tiene su texto en español', () => {
  assert.match(stopNoteErrorMessage(403, 'forbidden'), /ya no está en tu ruta/);
  assert.match(stopNoteErrorMessage(404, 'not found'), /ya no está en tu ruta/);
  assert.match(stopNoteErrorMessage(409, 'conflict'), /todavía no está completada/);
  assert.match(stopNoteErrorMessage(422, 'unprocessable'), /mismo día/);
  assert.equal(stopNoteErrorMessage(500, 'boom'), 'No se pudo guardar la nota.');
  assert.equal(stopNoteErrorMessage(null, 'boom'), 'No se pudo guardar la nota.');
});

test('solo los errores que desfasan la ruta piden refrescarla', () => {
  assert.equal(noteErrorNeedsRefresh(403), true);
  assert.equal(noteErrorNeedsRefresh(404), true);
  assert.equal(noteErrorNeedsRefresh(409), true);
  assert.equal(noteErrorNeedsRefresh(422), false);
  assert.equal(noteErrorNeedsRefresh(0), false);
  assert.equal(noteErrorNeedsRefresh(null), false);
});
