import { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * app.json sigue siendo la base estatica y revisable (plugins, experiments,
 * iconos). Este overlay solo agrega lo que tiene que venir de una variable
 * de entorno en build-time: la api key de Google Maps para Android.
 *
 * Es de build, no de runtime -- se hornea en AndroidManifest.xml durante el
 * prebuild. Por eso NO lleva prefijo EXPO_PUBLIC_: ese prefijo la inlinearia
 * en el bundle de JS sin ningun beneficio (la key ya queda embebida en el
 * APK de todas formas, restringida por paquete + SHA-1 en Google Cloud).
 *
 * Si falta, el mapa de Android sale gris y en blanco, sin error ni log en
 * ningun lado -- el peor tipo de falla silenciosa. Por eso se valida aca
 * explicitamente, igual que src/lib/api.ts revienta si falta
 * EXPO_PUBLIC_API_URL.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!googleMapsApiKey) {
    throw new Error(
      'Falta GOOGLE_MAPS_API_KEY en el entorno. Agregala a tu .env (sin prefijo ' +
        'EXPO_PUBLIC_: es de build, no de runtime). Sin ella el mapa de Android ' +
        'sale gris y en blanco, sin ningun error visible.',
    );
  }

  return {
    ...config,
    // `config` llega tipado como Partial<ExpoConfig> aunque en runtime siempre
    // viene de app.json, que ya define ambos. Sin este aserto TS se queja de
    // que `name`/`slug` podrian ser `undefined`.
    name: config.name!,
    slug: config.slug!,
    android: {
      ...config.android,
      config: { googleMaps: { apiKey: googleMapsApiKey } },
    },
  };
};
