import { useImage } from 'expo-image';
import { AppleMaps, GoogleMaps, type CameraMoveEvent } from 'expo-maps';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DailyRouteStop, StopType } from '@/lib/daily-route';
import type { Coordinates } from '@/lib/distance';
import { buildGoogleMapsStopLink } from '@/lib/google-maps-link';

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
/** Zoom al enfocar una parada desde su tarjeta: nivel calle, para ubicar el local. */
const FOCUS_ZOOM = 16;

/**
 * Alto del PNG del pin en puntos (ver CANVAS_HEIGHT en
 * scripts/generate-map-pins.py). Solo se usa en iOS, donde la anotacion se
 * centra sobre la coordenada en vez de anclarse por la punta.
 */
const PIN_HEIGHT = 38;

/**
 * Cuanto puede separarse el centro de la camara de la parada seleccionada,
 * como fraccion del alto visible, y seguir contando como "centrada": un 1%
 * son unos pocos pixeles, suficiente para absorber el redondeo de la
 * animacion sin dejar la pildora flotando lejos del pin.
 */
const CENTERED_TOLERANCE = 0.01;

/** Lo que el mapa expone por ref a la pantalla que lo monta. */
export type RouteMapHandle = {
  /**
   * Centra la camara en una parada y abre la etiqueta con su nombre, la misma
   * que aparece al tocar el pin. `id` es el de la parada (el mismo del marker).
   */
  focusStop: (id: string) => void;
};

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
export const RouteMap = forwardRef<RouteMapHandle, Props>(function RouteMap(
  { stops, currentLocation },
  ref,
) {
  const theme = useTheme();
  const googleMapRef = useRef<GoogleMaps.MapView>(null);
  const appleMapRef = useRef<AppleMaps.MapView>(null);

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

  // `cameraPosition` se congela en el primer render. En Android expo-maps
  // rearma la camara cada vez que recibe un objeto nuevo en esta prop
  // (`remember(cameraPosition)` en GoogleMapsView.kt), asi que armarlo en
  // cada render devolvia el mapa al vendedor con cualquier re-render -- por
  // ejemplo, cada lectura de GPS -- y pisaba lo que el usuario habia movido.
  const [initialCamera] = useState(() => ({
    coordinates: toMapCoordinates(
      currentLocation ?? locatedStops[0]?.location ?? FALLBACK_CENTER,
    ),
    zoom: DEFAULT_ZOOM,
  }));

  // Pero el primer fix de GPS casi nunca esta listo al montar: cuando llega,
  // se centra en el vendedor una sola vez. Si antes ya se enfoco una parada
  // (o el mapa arranco con ubicacion), no se toca.
  const hasCenteredRef = useRef(currentLocation !== null);

  useEffect(() => {
    if (currentLocation === null || hasCenteredRef.current) return;
    hasCenteredRef.current = true;
    const camera = { coordinates: toMapCoordinates(currentLocation), zoom: DEFAULT_ZOOM };
    if (Platform.OS === 'ios') {
      appleMapRef.current?.setCameraPosition(camera);
    } else {
      googleMapRef.current?.setCameraPosition(camera);
    }
  }, [currentLocation]);

  // Parada con el pin seleccionado, sea desde su tarjeta o tocando el pin.
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  // La pildora "Abrir en Maps" es una vista de RN encima del mapa, no parte
  // de la etiqueta: el info window es nativo y expo-maps no deja meterle
  // contenido propio. Como el mapa no expone la proyeccion coordenada->pixel,
  // la pildora se dibuja en el centro del mapa y solo se muestra mientras la
  // camara este centrada sobre la parada -- ahi el pin cae exactamente en el
  // centro. Si el vendedor mueve el mapa, desaparece.
  const [isCenteredOnSelected, setIsCenteredOnSelected] = useState(false);
  const selectedStop = locatedStops.find((stop) => stop.id === selectedStopId) ?? null;

  function selectStop(id: string | null) {
    // Reenfocar la misma parada ya centrada no mueve la camara (no llega
    // ningun `onCameraMove`), asi que el flag solo se baja al cambiar de parada.
    if (id !== selectedStopId) setIsCenteredOnSelected(false);
    setSelectedStopId(id);
  }

  function handleCameraMove(event: CameraMoveEvent) {
    if (!selectedStop) return;
    const { latitude, longitude } = event.coordinates;
    if (latitude === undefined || longitude === undefined) return;
    const tolerance = event.latitudeDelta * CENTERED_TOLERANCE;
    setIsCenteredOnSelected(
      Math.abs(latitude - selectedStop.location.lat) < tolerance &&
        Math.abs(longitude - selectedStop.location.lng) < tolerance,
    );
  }

  useImperativeHandle(ref, () => ({
    focusStop(id) {
      const stop = locatedStops.find((candidate) => candidate.id === id);
      if (!stop) return;
      hasCenteredRef.current = true;
      selectStop(id);

      if (Platform.OS === 'ios') {
        // En iOS 17 `selectAnnotation` es un no-op nativo (el `setSelection`
        // de AppleMapsViewiOS17 esta vacio), asi que la camara se mueve
        // aparte para que al menos el centrado funcione; la etiqueta solo
        // aparece desde iOS 18.
        appleMapRef.current?.setCameraPosition({
          coordinates: toMapCoordinates(stop.location),
          zoom: FOCUS_ZOOM,
        });
        appleMapRef.current?.selectAnnotation(id, { moveCamera: false });
        return;
      }

      // `selectMarker` abre el info window del marker (su `title`) y anima la
      // camara hasta el en una sola llamada. Rechaza si una seleccion nueva
      // interrumpe la animacion anterior (toques rapidos entre tarjetas): la
      // ultima gana y eso es justo lo esperado, asi que se ignora.
      googleMapRef.current?.selectMarker(id, { zoom: FOCUS_ZOOM }).catch(() => {});
    },
  }));

  // El punto azul de "mi ubicacion" solo se activa cuando ya hay un fix real
  // -- no apenas se concede el permiso. Pedirselo al mapa antes de tiempo
  // dibujaria el punto en un lugar viejo/vacio hasta que llegue la primera
  // lectura.
  const isMyLocationEnabled = currentLocation !== null;

  // Tocar el mapa fuera de un pin cierra la etiqueta nativa; la pildora se va
  // con ella. Tocar un pin directamente tambien lo selecciona: Google Maps
  // centra la camara sola en ese caso, asi que la pildora aparece igual que
  // desde la tarjeta.
  const map =
    Platform.OS === 'ios' ? (
      <AppleMaps.View
        ref={appleMapRef}
        style={styles.map}
        cameraPosition={initialCamera}
        annotations={markers}
        properties={{ isMyLocationEnabled }}
        onAnnotationClick={(annotation) => selectStop(annotation.id ?? null)}
        onMapClick={() => selectStop(null)}
        onCameraMove={handleCameraMove}
      />
    ) : (
      <GoogleMaps.View
        ref={googleMapRef}
        style={styles.map}
        cameraPosition={initialCamera}
        markers={markers.map((marker) => ({ ...marker, anchor: PIN_ANCHOR }))}
        properties={{ isMyLocationEnabled }}
        onMarkerClick={(marker) => selectStop(marker.id ?? null)}
        onMapClick={() => selectStop(null)}
        onCameraMove={handleCameraMove}
      />
    );

  return (
    <View style={styles.map}>
      {map}

      {selectedStop && isCenteredOnSelected && (
        // Solo abre esta parada, no la ruta del dia: para eso esta el boton
        // "Abrir en Google Maps" de la pantalla.
        <View pointerEvents="box-none" style={styles.pillAnchor}>
          <Pressable
            onPress={() => void Linking.openURL(buildGoogleMapsStopLink(selectedStop.location))}
            accessibilityRole="button"
            accessibilityLabel={`Abrir ${selectedStop.name} en Google Maps`}
            style={({ pressed }) => [
              styles.pill,
              { backgroundColor: theme.tint },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" style={{ color: theme.tintText }}>
              Abrir en Maps ↗
            </ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  // El centro del mapa es la punta del pin en Android (anclado en (0.5, 1));
  // en iOS la anotacion va centrada, asi que la punta queda medio pin mas abajo.
  pillAnchor: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: Spacing.two + (Platform.OS === 'ios' ? PIN_HEIGHT / 2 : 0),
    alignItems: 'center',
  },
  pill: {
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
