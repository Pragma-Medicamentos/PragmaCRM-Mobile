import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useMemo, type ComponentRef } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { CustomerProfileRow } from './customer-profile-row';
import { ProspectPill } from './prospect-pill';
import { StopBadge } from './stop-badge';
import { buildStopSubtitle, StopAction } from './stop-card';
import { StopPill } from './stop-pill';
import { ThemedText } from './themed-text';
import { Button } from './ui/button';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCreditLimit } from '@/lib/customer-profile';
import type { DailyRouteStop } from '@/lib/daily-route';
import type { Coordinates } from '@/lib/distance';
import { isProspectStop } from '@/lib/stop-pin';

type Props = {
  /**
   * La parada a mostrar; null mientras la hoja esta cerrada. Quien la monta la
   * re-deriva de la ruta en cada refresco, asi que despues de fijar el pin o
   * confirmar la visita el detalle abierto ya muestra el estado nuevo.
   */
  stop: DailyRouteStop | null;
  currentLocation: Coordinates | null;
  /** Cierra las hojas y centra el mapa en el pin. Solo se ofrece con GPS. */
  onShowOnMap: (stop: DailyRouteStop) => void;
  onValidate: (stop: DailyRouteStop) => void;
  onSetLocation: (stop: DailyRouteStop) => void;
  settingLocation: boolean;
};

export type StopDetailSheetHandle = ComponentRef<typeof BottomSheetModal>;

/**
 * Detalle del cliente de una parada (PCRM-166): todo lo que muestra la tarjeta
 * mas la ficha -- nombre comercial, tipo de establecimiento, direccion,
 * municipio, zona, telefono y limite de credito.
 *
 * Se apila sobre la hoja de paradas, igual que la de validacion: al cerrarla
 * el vendedor vuelve a la lista, que es donde estaba.
 */
export const StopDetailSheet = forwardRef<StopDetailSheetHandle, Props>(function StopDetailSheet(
  { stop, currentLocation, onShowOnMap, onValidate, onSetLocation, settingLocation },
  ref,
) {
  const theme = useTheme();
  const snapPoints = useMemo(() => ['75%'], []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.background }}>
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        {stop && (
          <>
            <View style={styles.header}>
              <ThemedText type="subtitle" style={styles.name}>
                {stop.name}
                {stop.completed_at ? ' ✔' : ''}
              </ThemedText>
              <StopPill stopType={stop.stop_type} />
            </View>

            {(isProspectStop(stop) || stop.is_extra) && (
              <View style={styles.badgeRow}>
                {isProspectStop(stop) && <ProspectPill />}
                {stop.is_extra && <StopBadge />}
              </View>
            )}

            <CustomerProfileRow stop={stop} />

            <ThemedText type="small" themeColor="textSecondary">
              {buildStopSubtitle(stop, currentLocation)}
            </ThemedText>

            <View style={[styles.fields, { backgroundColor: theme.backgroundElement }]}>
              <DetailField label="Nombre comercial" value={stop.trade_name} />
              <DetailField label="Tipo de establecimiento" value={stop.establishment_type} />
              <DetailField label="Dirección" value={stop.address} />
              <DetailField label="Municipio" value={stop.municipality} />
              <DetailField label="Zona" value={stop.zone} />
              <DetailField
                label="Teléfono"
                value={stop.phone}
                onPress={
                  stop.phone
                    ? () => void Linking.openURL(`tel:${stop.phone?.replace(/[^\d+]/g, '')}`)
                    : undefined
                }
              />
              <DetailField label="Límite de crédito" value={formatCreditLimit(stop.credit_limit)} />
            </View>

            {stop.reason && <DetailField label="Motivo de la parada" value={stop.reason} />}

            <View style={styles.actions}>
              <StopAction
                stop={stop}
                onValidatePress={() => onValidate(stop)}
                onSetLocationPress={() => onSetLocation(stop)}
                settingLocation={settingLocation}
              />
              {stop.location && (
                <Button
                  title="Ver en el mapa"
                  variant="secondary"
                  onPress={() => onShowOnMap(stop)}
                />
              )}
            </View>
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

type DetailFieldProps = {
  label: string;
  value: string | null;
  /** Hace el valor tocable (el telefono abre el marcador). */
  onPress?: () => void;
};

/**
 * Una fila etiqueta/valor. Sin valor no se dibuja: una ficha llena de "—" hace
 * buscar el dato que si esta entre los que faltan.
 */
function DetailField({ label, value, onPress }: DetailFieldProps) {
  const theme = useTheme();

  if (!value) return null;

  const content = (
    <>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="default" style={onPress ? { color: theme.tint } : undefined}>
        {value}
      </ThemedText>
    </>
  );

  if (!onPress) return <View style={styles.field}>{content}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityHint="Llama a este número"
      style={({ pressed }) => [styles.field, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
    padding: Spacing.three,
    paddingBottom: Spacing.five,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  name: {
    flexShrink: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  fields: {
    gap: Spacing.three,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  field: {
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
  actions: {
    gap: Spacing.two,
  },
});
