import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useMemo, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { StopCard } from './stop-card';
import { ThemedText } from './themed-text';
import { Button } from './ui/button';

import { Spacing } from '@/constants/theme';
import type { DailyRouteStop } from '@/lib/daily-route';
import type { Coordinates } from '@/lib/distance';
import { countPendingStops } from '@/lib/stop-progress';
import { filterStopsByName } from '@/lib/stop-search';
import { sortStopsForSheet } from '@/lib/stop-sort';
import { useTheme } from '@/hooks/use-theme';

/**
 * Lo que la hoja necesita saber de la carga, sin atarse a un store: la ruta
 * de hoy (`route-store`) y la vista previa de un dia de la semana
 * (`weekly-route-store`) la alimentan cada una desde el suyo.
 */
export type StopsSheetState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; stops: DailyRouteStop[] };

/**
 * Hoja de paradas, migrada de una ruta (`/stops` con `presentation: 'formSheet'`)
 * a este componente sobre `@gorhom/bottom-sheet`. Ver el comentario en
 * `(protected)/index.tsx` (donde se monta) para el porque del cambio de arquitectura.
 *
 * Hay carteras de treinta paradas o mas por dia, pero `BottomSheetScrollView`
 * con `.map()` sigue alcanzando: un `BottomSheetFlatList` sumaria una segunda
 * dimension de scroll (virtualizacion) sin beneficio a este tamaño. Para
 * encontrar un cliente en esas listas largas estan el orden por cercania y
 * el buscador.
 */
type Props = {
  state: StopsSheetState;
  /** Encabezado sin el conteo, p. ej. "Paradas de hoy". */
  title: string;
  /** Texto cuando la lista llega vacia. */
  emptyMessage: string;
  /** Pull-to-refresh en curso (aparte de `state`, ver `route-store.ts`). */
  refreshing: boolean;
  /** Pull-to-refresh y el boton "Reintentar" del error. */
  onReload: () => void;
  /**
   * Misma lectura que el mapa. Esta hoja no abre otro watcher. Null en la
   * vista previa de un dia futuro: sin GPS, la tarjeta muestra solo la zona.
   */
  currentLocation: Coordinates | null;
  /** Se llama al tocar cualquier tarjeta: abre el detalle del cliente. */
  onStopPress?: (stop: DailyRouteStop) => void;
  /** Se llama desde el boton "Validar visita (GPS)" de la tarjeta. */
  onValidateStop?: (stop: DailyRouteStop) => void;
  /** Se llama desde el boton "Establecer ubicación" (cliente sin pin). */
  onSetLocation?: (stop: DailyRouteStop) => void;
  /** Se llama desde "+ Prospecto": abre el alta de prospecto (PCRM-175). */
  onRegisterProspect?: () => void;
  /** La parada cuyo pin se esta fijando, para el spinner de su boton. */
  settingLocationId?: string | null;
};

export const StopsSheet = forwardRef<ComponentRef<typeof BottomSheetModal>, Props>(function StopsSheet(
  {
    state,
    title,
    emptyMessage,
    refreshing,
    onReload,
    currentLocation,
    onStopPress,
    onValidateStop,
    onSetLocation,
    onRegisterProspect,
    settingLocationId,
  },
  ref,
) {
  const theme = useTheme();

  const snapPoints = useMemo(() => ['68%'], []);

  // El conteo del encabezado no se puede calcular fuera de `ready`: mostrar
  // "(0)" mientras todavia esta cargando o mientras fallo es la misma mentira
  // de fondo vacio que R11 corrige mas abajo, solo que en miniatura.
  // Cuenta las que faltan, no el total (PCRM-208): baja con cada visita.
  const stops = state.status === 'ready' ? state.stops : null;
  const pendingCount = stops ? countPendingStops(stops) : null;
  const headerLabel = pendingCount !== null ? `${title} (${pendingCount})` : title;
  // Solo en voz: "(28)" a secas no dice si son las que faltan o el total.
  const headerA11yLabel =
    stops && pendingCount !== null
      ? `${title}, ${pendingCount} ${pendingCount === 1 ? 'pendiente' : 'pendientes'} de ${stops.length}`
      : title;
  // Desde donde se mide el orden por cercania. Se toma al abrir la hoja y no
  // se mueve mientras sigue abierta: el watcher manda una lectura cada 25 m
  // y reordenar con cada una haria saltar la tarjeta que el vendedor iba a
  // tocar. Sobrevive a que otra hoja la minimice (detalle, validacion): al
  // volver, la lista sigue como estaba. Solo `onDismiss` la suelta.
  const [isOpen, setIsOpen] = useState(false);
  const [sortOrigin, setSortOrigin] = useState<Coordinates | null>(null);
  // Si al abrir todavia no habia fix, se toma el primero que llegue con la
  // hoja abierta, una sola vez. Ajuste de estado durante el render y no en
  // un efecto: asi el primer orden ya sale con el, sin un frame intermedio.
  if (isOpen && sortOrigin === null && currentLocation !== null) {
    setSortOrigin(currentLocation);
  }

  const [query, setQuery] = useState('');

  const handleChange = useCallback(
    (index: number) => {
      setIsOpen(index >= 0);
      if (index >= 0 && sortOrigin === null) setSortOrigin(currentLocation);
    },
    [sortOrigin, currentLocation],
  );

  const handleDismiss = useCallback(() => {
    setIsOpen(false);
    setSortOrigin(null);
    setQuery('');
  }, []);

  // Pendientes de la mas cercana a la mas lejana y completadas al final
  // (PCRM-209). Solo la lista: el mapa recibe el arreglo del backend sin
  // tocar. El buscador filtra despues de ordenar, asi que los resultados
  // tambien salen por cercania.
  const orderedStops = useMemo(
    () => (stops ? sortStopsForSheet(stops, sortOrigin) : []),
    [stops, sortOrigin],
  );
  const visibleStops = useMemo(() => filterStopsByName(orderedStops, query), [orderedStops, query]);

  // Mismo grabber armado a mano que tenia `stops.tsx`: `handleIndicatorStyle`
  // de gorhom es un solo elemento y no alcanza para reproducir el borde
  // superior de 3px del wireframe, asi que se arma el handle completo aca.
  const renderHandle = useCallback(
    () => (
      <View>
        <View style={[styles.topBorder, { backgroundColor: theme.text }]} />
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: theme.backgroundSelected }]} />
        </View>
      </View>
    ),
    [theme],
  );

  // Sin velo oscuro (`opacity={0}`): el mapa tiene que seguir visible detras
  // de la hoja, igual que con `sheetLargestUndimmedDetentIndex: 0` en la
  // version de ruta. `pressBehavior="close"` conserva el toque-afuera-cierra
  // que traia el formSheet nativo.
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onChange={handleChange}
      onDismiss={handleDismiss}
      keyboardBehavior="interactive"
      android_keyboardInputMode="adjustResize"
      handleComponent={renderHandle}
      backdropComponent={renderBackdrop}
      backgroundStyle={[styles.background, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.backgroundSelected }]}>
        <ThemedText
          type="default"
          numberOfLines={1}
          accessibilityLabel={headerA11yLabel}
          style={styles.headerLabel}>
          {headerLabel}
        </ThemedText>

        {/* El alta de prospecto vive aca y no en el menu (PCRM-175): el
            vendedor abre esta hoja estando parado en la farmacia, que es el
            unico momento en que el GPS del registro vale. Dice "Prospecto" y
            no "Registrar prospecto" porque con el conteo largo ("(12)") la
            frase completa empuja al titulo contra el borde en un telefono de
            360 px. */}
        {onRegisterProspect && (
          <Pressable
            onPress={onRegisterProspect}
            accessibilityRole="button"
            accessibilityLabel="Registrar un prospecto"
            style={({ pressed }) => [
              styles.prospectButton,
              {
                borderColor: theme.backgroundSelected,
                backgroundColor: theme.backgroundElement,
              },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" style={{ color: theme.tint }}>
              + Prospecto
            </ThemedText>
          </Pressable>
        )}
      </View>

      {/* Solo con paradas: buscar en una lista vacia, cargando o con error
          no tiene sentido. `BottomSheetTextInput` y no `TextField`: dentro de
          una hoja, un TextInput comun deja el teclado tapando el campo. */}
      {stops !== null && stops.length > 0 && (
        <View style={styles.searchRow}>
          <BottomSheetTextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar cliente"
            placeholderTextColor={theme.textSecondary}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Buscar cliente por nombre"
            style={[styles.searchInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
          />
          {/* `clearButtonMode` solo existe en iOS: Android lleva su propia X. */}
          {Platform.OS !== 'ios' && query !== '' && (
            <Pressable
              onPress={() => setQuery('')}
              accessibilityRole="button"
              accessibilityLabel="Borrar búsqueda"
              hitSlop={Spacing.two}
              style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
              <ThemedText themeColor="textSecondary">✕</ThemedText>
            </Pressable>
          )}
        </View>
      )}

      {state.status === 'loading' ? (
        // Mismo componente que `_layout.tsx` usa para su propia carga
        // (`ActivityIndicator` centrado, sin texto): la primera carga de la
        // ruta es la misma clase de espera con red que la del perfil.
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : state.status === 'error' ? (
        // Mismo par "mensaje + reintentar" que `access-denied.tsx`, pero sin
        // reusar el componente entero: `AccessDenied` es una pantalla
        // completa con su propio `SafeAreaView` y un boton de cerrar sesion
        // que no aplica dentro de esta hoja (la sesion aca es valida, lo que
        // fallo fue pedir la ruta).
        <View style={styles.centered}>
          <ThemedText type="subtitle" style={styles.centeredText}>
            No se pudo cargar la ruta
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centeredText}>
            {state.message}
          </ThemedText>
          <Button title="Reintentar" onPress={onReload} />
        </View>
      ) : (
        <BottomSheetScrollView
          contentContainerStyle={visibleStops.length === 0 ? styles.empty : styles.list}
          // Con el teclado abierto, el primer toque en una tarjeta la abre en
          // vez de solo cerrar el teclado.
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onReload}
              tintColor={theme.tint}
              colors={[theme.tint]}
            />
          }>
          {state.stops.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              {emptyMessage}
            </ThemedText>
          ) : visibleStops.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              Ningún cliente coincide con “{query.trim()}”.
            </ThemedText>
          ) : (
            visibleStops.map((stop) => (
              <StopCard
                key={stop.id}
                stop={stop}
                currentLocation={currentLocation}
                onPress={onStopPress ? () => onStopPress(stop) : undefined}
                onValidatePress={onValidateStop ? () => onValidateStop(stop) : undefined}
                onSetLocationPress={onSetLocation ? () => onSetLocation(stop) : undefined}
                settingLocation={settingLocationId === stop.id}
              />
            ))
          )}
        </BottomSheetScrollView>
      )}
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  background: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  topBorder: {
    height: 3,
  },
  handleRow: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: Spacing.half,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
  },
  headerLabel: {
    flexShrink: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    // Lugar para la X de Android, que va encima del campo.
    paddingRight: Spacing.five,
    fontSize: 16,
  },
  clearButton: {
    position: 'absolute',
    right: Spacing.three + Spacing.two,
    top: Spacing.two,
    bottom: 0,
    justifyContent: 'center',
  },
  prospectButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderWidth: 1,
    borderRadius: 999,
  },
  pressed: {
    opacity: 0.7,
  },
  list: {
    gap: Spacing.two,
    padding: Spacing.three,
  },
  empty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.three,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  centeredText: {
    textAlign: 'center',
  },
});
