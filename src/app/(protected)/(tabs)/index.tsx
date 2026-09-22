import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Linking, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RouteMap } from '@/components/route-map';
import { StopsSheet } from '@/components/stops-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Spacing, withAlpha } from '@/constants/theme';
import { useDeviceLocation } from '@/hooks/use-device-location';
import { useTheme } from '@/hooks/use-theme';
import { buildGoogleMapsLink } from '@/lib/google-maps-link';
import { useAuthStore } from '@/stores/auth-store';
import { useRouteStore } from '@/stores/route-store';

export default function HomeScreen() {
  const theme = useTheme();
  const profile = useAuthStore((state) => state.profile);
  const signOut = useAuthStore((state) => state.signOut);
  const route = useRouteStore((state) => state.route);
  const loadRoute = useRouteStore((state) => state.loadRoute);
  // La hoja de paradas vive como componente (`stops-sheet.tsx`), no como ruta:
  // ver el comentario largo mas abajo, junto al boton que la abre.
  const stopsSheetRef = useRef<ComponentRef<typeof BottomSheetModal>>(null);
  // R12: el circuito de distancia se cierra aca -- esta pantalla obtiene la
  // ubicacion del dispositivo y la pasa al mapa (para el punto azul) y a
  // stops.tsx la obtiene de nuevo por su cuenta para pasarsela a StopCard
  // (ver el comentario de useDeviceLocation sobre por que cada pantalla
  // abre su propia suscripcion en vez de compartir una global).
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

  const stops = route.status === 'ready' ? route.route.stops : [];
  const stopCount = route.status === 'ready' ? stops.length : null;
  // null cuando ninguna parada tiene GPS todavia (o la ruta no cargo) -- sin
  // nada que enlazar, el boton de Google Maps no tiene sentido y se esconde.
  const googleMapsLink = buildGoogleMapsLink(stops);

  function closeMenu() {
    setMenuVisible(false);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <ThemedText type="subtitle" numberOfLines={1} style={styles.greeting}>
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
            <ThemedText type="subtitle">☰</ThemedText>
          </Pressable>
        </View>

        <View style={styles.mapContainer}>
          <RouteMap stops={stops} currentLocation={location} />

          {googleMapsLink && (
            <View style={styles.mapsButtonContainer}>
              <Button
                title="Abrir en Google Maps ↗"
                variant="outline"
                onPress={() => void Linking.openURL(googleMapsLink)}
              />
            </View>
          )}
        </View>

        {/*
          Sin padding inferior extra a proposito: `BottomTabInset` (theme.ts)
          es para pantallas con scroll que necesitan no esconder contenido
          detras del `NativeTabs` nativo. Esta barra es fija, ya vive dentro
          del `SafeAreaView` de arriba, y `NativeTabs` pinta su propia franja
          debajo -- sumar `BottomTabInset` aca contaba el inset dos veces (se
          comprobo en el emulador: quitandolo el boton queda pegado a la
          franja nativa sin que el sistema tape nada).
        */}
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

      <StopsSheet ref={stopsSheetRef} />

      {/*
        Action sheet minimo: el placeholder anterior de esta pantalla era el
        unico lugar de la app con `signOut()`. El wireframe lo reemplaza por
        este menu -- si se perdiera sin cablear "Cerrar sesión" detras, nadie
        podria salir de la app. El menu de mas opciones (pantalla 10) es otro
        ticket; esto es solo lo minimo para no perder la funcion.
      */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={closeMenu}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: withAlpha('#000000', 0.4) }]}
          onPress={closeMenu}
          accessibilityRole="button"
          accessibilityLabel="Cerrar menú">
          <Pressable
            onPress={() => {}}
            accessibilityRole="none"
            style={[styles.menuSheet, { backgroundColor: theme.background }]}>
            <Button
              title="Cerrar sesión"
              variant="secondary"
              onPress={() => {
                closeMenu();
                void signOut();
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
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
  },
  bottomBar: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  menuSheet: {
    padding: Spacing.four,
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
  },
});
