import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppMenu } from '@/components/app-menu';
import { RouteMap, type RouteMapHandle } from '@/components/route-map';
import { StopsSheet } from '@/components/stops-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useDeviceLocation } from '@/hooks/use-device-location';
import { useTheme } from '@/hooks/use-theme';
import type { DailyRouteStop } from '@/lib/daily-route';
import { buildGoogleMapsLink } from '@/lib/google-maps-link';
import { useAuthStore } from '@/stores/auth-store';
import { useRouteStore } from '@/stores/route-store';

// Referencia estable para cuando la ruta no esta lista: un `[]` literal seria
// un arreglo nuevo en cada render y romperia el useMemo del link de Maps.
const NO_STOPS: DailyRouteStop[] = [];

export default function HomeScreen() {
  const theme = useTheme();
  const profile = useAuthStore((state) => state.profile);
  const route = useRouteStore((state) => state.route);
  const loadRoute = useRouteStore((state) => state.loadRoute);
  // La hoja de paradas vive como componente (`stops-sheet.tsx`), no como ruta:
  // ver el comentario largo mas abajo, junto al boton que la abre.
  const stopsSheetRef = useRef<ComponentRef<typeof BottomSheetModal>>(null);
  const routeMapRef = useRef<RouteMapHandle>(null);
  // Un solo watcher de GPS (ver useDeviceLocation). La hoja de paradas
  // recibe la misma lectura; no abre otra suscripción.
  const { location } = useDeviceLocation();
  const [menuVisible, setMenuVisible] = useState(false);

  // El layout de `(protected)` no renderiza esta pantalla hasta tener el
  // perfil, asi que aqui siempre esta listo.
  const me = profile.status === 'ready' ? profile.me : null;

  // Nadie mas dispara la primera carga de la ruta diaria: esta pantalla es
  // el unico punto de entrada hoy.
  useEffect(() => {
    if (route.status === 'idle') void loadRoute();
  }, [route.status, loadRoute]);

  const stops = route.status === 'ready' ? route.route.stops : NO_STOPS;
  const stopCount = route.status === 'ready' ? stops.length : null;
  // null cuando no queda ninguna parada pendiente con GPS (ruta sin cargar,
  // sin GPS, o todas visitadas) -- sin nada que enlazar, el boton de Google
  // Maps no tiene sentido y se esconde. Depende de `location` porque el orden
  // del link es por cercania al vendedor.
  const googleMapsLink = useMemo(
    () => buildGoogleMapsLink(stops, location),
    [stops, location],
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <ThemedText type="heading" numberOfLines={1} style={styles.greeting}>
            Hola, {me?.name ?? 'vendedor'}
          </ThemedText>

          <Pressable
            onPress={() => setMenuVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Abrir menú"
            style={({ pressed }) => [
              styles.menuButton,
              { backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="heading">☰</ThemedText>
          </Pressable>
        </View>

        <View style={styles.mapContainer}>
          <RouteMap ref={routeMapRef} stops={stops} currentLocation={location} />

          {googleMapsLink && (
            <View style={styles.mapsButtonContainer}>
              {/*
                La URL API de Maps no acepta mas de 10 paradas: el resto entra
                solo a medida que se marcan visitas y se vuelve a abrir el link.
              */}
              {googleMapsLink.included < googleMapsLink.pending && (
                <View style={[styles.mapsCaption, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Próximas {googleMapsLink.included} de {googleMapsLink.pending} paradas
                  </ThemedText>
                </View>
              )}
              <Button
                title="Abrir en Google Maps ↗"
                variant="outline"
                onPress={() => void Linking.openURL(googleMapsLink.url)}
              />
            </View>
          )}
        </View>

        {/*
          `▲ Ver paradas` abre `StopsSheet` por ref (`.present()`) en vez de
          navegar a una ruta: `stops.tsx` era una ruta solo porque el formSheet
          nativo de expo-router es una `presentation`, no un componente. gorhom
          es lo opuesto -- un componente que se porta sobre el arbol, no una
          presentacion de router -- asi que forzarlo a una ruta hubiera dejado
          dos animaciones de entrada compitiendo (la del Stack y la de la hoja)
          y habria significado envolver la pantalla del mapa en un Stack solo
          para tapar la ruta con la hoja encima. Montarlo aca directamente
          tambien es lo unico que garantiza "el mapa se ve detras de la hoja"
          (pedido explicito del wireframe): con una ruta, la pantalla de mapa
          se desmonta o queda tapada segun el tipo de presentation elegido.
        */}
        <View style={styles.bottomBar}>
          {stopCount !== null && (
            <Button
              title={`▲ Ver paradas (${stopCount})`}
              onPress={() => stopsSheetRef.current?.present()}
            />
          )}
        </View>
      </SafeAreaView>

      {/*
        Tocar una tarjeta cierra la hoja, centra el mapa en esa parada y abre
        la etiqueta con su nombre: con la hoja al 68% el pin quedaria tapado
        si solo se moviera la camara.
      */}
      <StopsSheet
        ref={stopsSheetRef}
        currentLocation={location}
        onStopPress={(stop) => {
          stopsSheetRef.current?.dismiss();
          routeMapRef.current?.focusStop(stop.id);
        }}
      />

      <AppMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  greeting: {
    flexShrink: 1,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  mapContainer: {
    flex: 1,
  },
  mapsButtonContainer: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: Spacing.three,
    gap: Spacing.one,
  },
  mapsCaption: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
  },
  bottomBar: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    // `NativeTabs` pintaba su propia franja debajo de esta barra; al
    // quitarse los tabs (PCRM-47) el boton quedaba pegado a la barra de
    // gestos de Android sin este padding.
    paddingBottom: Spacing.three,
  },
});
