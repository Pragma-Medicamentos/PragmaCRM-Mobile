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
 *
 * El throw de abajo es mas ancho de lo ideal: `ConfigContext` no expone que
 * plataforma se esta construyendo (no hay campo `platform`, y `expo config`
 * no acepta `--platform`), asi que esta funcion corre una sola vez para
 * todas. En una maquina local eso significa que falta la key tambien rompe
 * `expo run:ios` aunque iOS use MapKit y no la necesite -- no hay forma mas
 * angosta de chequearlo con lo que da el SDK. Es una decision deliberada:
 * este proyecto es Android-first y sin la key no hay trabajo util que hacer
 * de todas formas, asi que una falla ruidosa le gana a un mapa gris sin
 * ningun error. Lo unico que se puede angostar es el caso de EAS: cuando
 * `EAS_BUILD_PLATFORM` esta seteado (solo pasa en los builders de EAS) y no
 * es "android", un build de EAS solo-iOS no tiene por que reventar por una
 * key de Android.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  const easBuildPlatform = process.env.EAS_BUILD_PLATFORM;
  const isEasNonAndroidBuild = easBuildPlatform !== undefined && easBuildPlatform !== 'android';

  if (!googleMapsApiKey && !isEasNonAndroidBuild) {
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
      config: { ...config.android?.config, googleMaps: { apiKey: googleMapsApiKey } },
    },
  };
};
