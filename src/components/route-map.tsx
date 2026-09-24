import { useImage } from 'expo-image';
import { AppleMaps, GoogleMaps } from 'expo-maps';
import { Platform, StyleSheet } from 'react-native';

import type { DailyRouteStop, StopType } from '@/lib/daily-route';
import type { Coordinates } from '@/lib/distance';

type Props = {
  stops: DailyRouteStop[];
  /** Ubicacion del vendedor para el punto azul del mapa; null = sin permiso o sin fix todavia. */
  currentLocation: Coordinates | null;
};

/**
 * Centro de respaldo (San Salvador) para cuando todavia no hay ni ubicacion
 * del vendedor ni una parada con GPS -- sin esto el mapa arrancaria
 * centrado en (0,0), en medio del oceano Atlantico.
 */
const FALLBACK_CENTER: Coordinates = { lat: 13.6929, lng: -89.2182 };
const DEFAULT_ZOOM = 13;

/**
 * El anclaje horizontal/vertical de la punta de la gota dentro del PNG: el
 * pixel (0.5, 1) -- centro horizontal, borde inferior -- es la punta (ver
 * scripts/generate-map-pins.py), asi que ese es el punto del icono que debe
 * caer exactamente sobre la coordenada de la parada. Solo aplica a
 * GoogleMapsMarker: AppleMapsAnnotation no tiene prop de anchor (ver el
 * comentario mas abajo).
 */
const PIN_ANCHOR = { x: 0.5, y: 1 };

function toMapCoordinates(coordinates: Coordinates) {
  return { latitude: coordinates.lat, longitude: coordinates.lng };
}

/**
 * Esconde el split `AppleMaps.View` (iOS) / `GoogleMaps.View` (Android) de
 * expo-maps detras de una sola superficie de props: ninguna otra pantalla de
 * la app importa expo-maps directamente.
 *
 * Los pines de color son PNG horneados (ver scripts/generate-map-pins.py)
 * porque, confirmado en los docs v57, `GoogleMapsMarker` no tiene prop de
 * tinte -- solo `icon`, que espera un `SharedRefType<'image'>` ("such as the
 * value returned by the useImage hook from the expo-image package. It does
 * not accept an image source directly"). Se usan los mismos PNG en iOS
 * (donde `AppleMapsMarker.tintColor` si existe) para que ambas plataformas
 * se vean igual.
 *
 * iOS usa `annotations` (`AppleMapsAnnotation`), no `markers`
 * (`AppleMapsMarker`): `AppleMapsMarker` no tiene prop `icon` en absoluto
 * (solo `systemImage`/`monogram`/`tintColor`, confirmado en los docs v57) --
 * `icon` vive unicamente en `AppleMapsAnnotation`. La contrapartida es que
 * `AppleMapsAnnotation` no tiene prop `anchor` (a diferencia de
 * `GoogleMapsMarker`), asi que en iOS el punto exacto de anclaje del icono
 * dentro del pin queda a criterio del sistema -- una limitacion real del
 * SDK alpha, no un descuido de este componente.
 */
export function RouteMap({ stops, currentLocation }: Props) {
  const visitaIcon = useImage(require('@/assets/images/mapPins/pin-visita.png'));
  const despachoIcon = useImage(require('@/assets/images/mapPins/pin-despacho.png'));
  const cobroIcon = useImage(require('@/assets/images/mapPins/pin-cobro.png'));

  const iconByType: Record<StopType, typeof visitaIcon> = {
    visit: visitaIcon,
    dispatch: despachoIcon,
    collection: cobroIcon,
  };

  // Las paradas sin GPS (`location: null`, un caso real -- ver el
  // comentario de `DailyRouteStop.location`) no tienen pin, aunque si
  // aparecen en la lista de `stops.tsx`. Aca solo interesan las que si se
  // pueden ubicar en el mapa.
  const locatedStops = stops.filter(
    (stop): stop is DailyRouteStop & { location: Coordinates } => stop.location !== null,
  );

  // Si el icono de un tipo todavia no termino de cargar (son PNG locales de
  // pocos bytes: la espera real es de a lo sumo un par de frames), esa
  // parada se salta por ese frame en vez de mandarle a expo-maps un marker
  // con `icon: null`.
  const markers = locatedStops
    .filter((stop) => iconByType[stop.stop_type] !== null)
    .map((stop) => ({
      id: stop.id,
      coordinates: toMapCoordinates(stop.location),
      title: stop.name,
      icon: iconByType[stop.stop_type]!,
    }));

  const center = currentLocation ?? locatedStops[0]?.location ?? FALLBACK_CENTER;
  const cameraPosition = { coordinates: toMapCoordinates(center), zoom: DEFAULT_ZOOM };

  // El punto azul de "mi ubicacion" solo se activa cuando ya hay un fix real
  // -- no apenas se concede el permiso. Pedirselo al mapa antes de tiempo
  // dibujaria el punto en un lugar viejo/vacio hasta que llegue la primera
  // lectura.
  const isMyLocationEnabled = currentLocation !== null;

  if (Platform.OS === 'ios') {
    return (
      <AppleMaps.View
        style={styles.map}
        cameraPosition={cameraPosition}
        annotations={markers}
        properties={{ isMyLocationEnabled }}
      />
    );
  }

  return (
    <GoogleMaps.View
      style={styles.map}
      cameraPosition={cameraPosition}
      markers={markers.map((marker) => ({ ...marker, anchor: PIN_ANCHOR }))}
      properties={{ isMyLocationEnabled }}
    />
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
