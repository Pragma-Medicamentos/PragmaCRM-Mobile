const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Firma el build `release` de Android con el keystore propio del proyecto en
 * vez del `debug.keystore` que trae la plantilla de Expo.
 *
 * Vive como config plugin porque `android/` esta en .gitignore y se regenera
 * con `expo prebuild --clean`: un cambio a mano en build.gradle se pierde en el
 * siguiente prebuild y el APK sale firmado con debug sin que nadie lo note.
 *
 * Las credenciales NO viven en el repo. Se leen de propiedades de Gradle,
 * normalmente en ~/.gradle/gradle.properties:
 *
 *   PRAGMA_RELEASE_STORE_FILE=/ruta/absoluta/pragmacrm-release.jks
 *   PRAGMA_RELEASE_STORE_PASSWORD=...
 *   PRAGMA_RELEASE_KEY_ALIAS=pragmacrm
 *   PRAGMA_RELEASE_KEY_PASSWORD=...
 *
 * Si faltan y se pide una tarea de release, el build revienta con un mensaje
 * explicito. Los builds debug no las necesitan. Es el mismo criterio que el
 * throw de GOOGLE_MAPS_API_KEY en app.config.ts: un APK de release firmado con
 * la llave de otra maquina obliga a los vendedores a desinstalar para
 * actualizar, y eso solo se descubre cuando ya se repartio.
 *
 * Ojo: el SHA-1 de este keystore tiene que estar en la restriccion de la
 * Google Maps key, o el mapa sale gris en el APK de release.
 */
const MARKER = '// @pragma release-signing';

const RELEASE_SIGNING_CONFIG = `
        ${MARKER}
        release {
            if (project.hasProperty('PRAGMA_RELEASE_STORE_FILE')) {
                storeFile file(PRAGMA_RELEASE_STORE_FILE)
                storePassword PRAGMA_RELEASE_STORE_PASSWORD
                keyAlias PRAGMA_RELEASE_KEY_ALIAS
                keyPassword PRAGMA_RELEASE_KEY_PASSWORD
            }
        }`;

const RELEASE_GUARD = `
${MARKER}
gradle.taskGraph.whenReady { graph ->
    def wantsRelease = graph.allTasks.any { it.project == project && it.name.toLowerCase().contains('release') }
    if (wantsRelease && !project.hasProperty('PRAGMA_RELEASE_STORE_FILE')) {
        throw new GradleException(
            'Falta PRAGMA_RELEASE_STORE_FILE (y sus PASSWORD/KEY_ALIAS) en ~/.gradle/gradle.properties. ' +
            'Sin ellas el APK de release no se puede firmar con el keystore de PragmaCRM. ' +
            'Ver plugins/with-release-signing.js.'
        )
    }
}
`;

function applyReleaseSigning(gradle) {
  if (gradle.includes(MARKER)) return gradle;

  const withConfig = gradle.replace(
    /(signingConfigs\s*\{\s*\n\s*debug\s*\{[^}]*\})/,
    `$1${RELEASE_SIGNING_CONFIG}`,
  );
  const withRelease = withConfig.replace(
    /(release\s*\{[^{}]*?)signingConfig signingConfigs\.debug/,
    '$1signingConfig signingConfigs.release',
  );

  if (withConfig === gradle || withRelease === withConfig) {
    throw new Error(
      'with-release-signing: no se encontro el bloque signingConfigs/buildTypes esperado en ' +
        'android/app/build.gradle. La plantilla de Expo cambio; revisa el plugin.',
    );
  }

  return withRelease + RELEASE_GUARD;
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') {
      throw new Error('with-release-signing: solo soporta build.gradle en Groovy.');
    }
    mod.modResults.contents = applyReleaseSigning(mod.modResults.contents);
    return mod;
  });
};
