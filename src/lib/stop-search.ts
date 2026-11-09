/**
 * Lo unico que la busqueda mira de una parada. Estructural, igual que
 * `stop-progress.ts`, para que las pruebas no arrastren `daily-route.ts`.
 */
type SearchableStop = { name: string; trade_name: string | null };

/**
 * Minusculas y sin tildes: "José" y "JOSE" quedan iguales. `NFD` separa la
 * letra de su acento y el rango U+0300-U+036F (marcas diacriticas
 * combinables) los borra. Un rango explicito y no `\p{Diacritic}` para no
 * depender del soporte de Unicode property escapes en Hermes. La "ñ" tambien
 * cae a "n", asi que "pena" encuentra "Peña": en una busqueda eso ayuda.
 */
export function normalizeSearchText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * Las paradas cuyo nombre o nombre comercial contiene `query`, sin importar
 * mayusculas ni tildes. Respeta el orden que recibe (el de la hoja). Con la
 * busqueda vacia devuelve `stops` tal cual.
 */
export function filterStopsByName<T extends SearchableStop>(stops: readonly T[], query: string): T[] {
  const needle = normalizeSearchText(query);
  if (needle === '') return stops.slice();

  return stops.filter(
    (stop) =>
      normalizeSearchText(stop.name).includes(needle) ||
      (stop.trade_name !== null && normalizeSearchText(stop.trade_name).includes(needle)),
  );
}
