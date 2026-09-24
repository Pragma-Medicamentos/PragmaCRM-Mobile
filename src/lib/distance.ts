/**
 * Coordenada geografica en grados decimales (WGS84), la misma convencion que
 * usa `extensions.geography(Point, 4326)` en el esquema de Postgres.
 */
export type Coordinates = {
  lat: number;
  lng: number;
};

const EARTH_RADIUS_METERS = 6371000;

/**
 * Distancia en linea recta entre dos coordenadas (formula de Haversine).
 *
 * No es la distancia de manejo -- eso lo resuelve Google Maps una vez que el
 * vendedor abre el link de `google-maps-link.ts`. Esto es una estimacion
 * barata, calculable en el dispositivo sin pedirle nada a una API externa,
 * que alcanza para ordenar paradas y mostrar "que tan lejos" en la tarjeta.
 */
export function haversineMeters(a: Coordinates, b: Coordinates): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const haversine =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
}

/**
 * Formatea una distancia en metros para la tarjeta de parada: `120m` por
 * debajo de 1km, `2.1km` de ahi en adelante. Sin el prefijo "a " -- eso lo
 * compone quien arma el texto completo (`{zona}, a {formatDistance(m)}`),
 * porque este helper no sabe con que preposicion ni en que idioma se va a
 * insertar el resultado.
 *
 * Umbral y redondeo: por debajo de 1000m se redondea al metro entero (un
 * decimal de metro no le sirve a nadie caminando); de 1000m en adelante se
 * muestra en kilometros con un decimal, que es la resolucion que le importa a
 * un vendedor decidiendo si vale la pena manejar hasta la siguiente parada.
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }

  return `${(meters / 1000).toFixed(1)}km`;
}
