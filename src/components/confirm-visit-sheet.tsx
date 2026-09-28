import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useMemo, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { Button } from './ui/button';

import { Spacing } from '@/constants/theme';
import { readPreciseLocation } from '@/hooks/use-device-location';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import type { DailyRouteStop } from '@/lib/daily-route';
import { confirmVisit } from '@/lib/visit';
import { visitGate, visitGateMessage, type LocationRead } from '@/lib/visit-gate';

/**
 * Atajos de nota del wireframe (pantalla 6). Escriben en el campo de texto en
 * vez de mandar un campo propio: `successful` y `no_order_reason` existen en
 * el endpoint pero son de RF-07, que es otro ticket. Tratarlos como texto
 * evita inventarles una semantica ahora y tener que migrarla despues.
 */
const NOTE_SHORTCUTS = ['Sin novedad', 'Atendió encargado', 'Cliente ausente'];

type Props = {
  /** La parada a confirmar; null mientras la hoja esta cerrada. */
  stop: DailyRouteStop | null;
  /** Se llama tras confirmar con exito, para refrescar la ruta. */
  onConfirmed: () => void;
};

export type ConfirmVisitSheetHandle = ComponentRef<typeof BottomSheetModal>;

/**
 * Hoja para validar una parada por GPS y marcarla como visitada (PCRM-52 y
 * PCRM-53, CA1 y CA2 de HU-06).
 *
 * Comprime en un paso las pantallas 4, 5 y 6 del wireframe -- detalle,
 * validacion GPS y nota. El wireframe las separa porque ahi la validacion ya
 * registra la visita y la nota llega despues; aca hay una sola llamada al
 * endpoint, asi que partirlo en tres dejaria dos pantallas que no hacen nada
 * salvo esperar.
 *
 * La lectura de GPS que decide es propia (`readPreciseLocation`, ~10 m) y no
 * la del watch de la lista (~100 m): ver el comentario de esa funcion para el
 * porque.
 */
export const ConfirmVisitSheet = forwardRef<ConfirmVisitSheetHandle, Props>(
  function ConfirmVisitSheet({ stop, onConfirmed }, ref) {
    const theme = useTheme();
    const [reading, setReading] = useState(false);
    const [read, setRead] = useState<LocationRead | null>(null);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const snapPoints = useMemo(() => ['72%'], []);

    const takeReading = useCallback(async () => {
      setReading(true);
      setErrorMessage(null);
      setRead(await readPreciseLocation());
      setReading(false);
    }, []);

    // Cada apertura arranca de cero: la hoja se reusa para todas las paradas,
    // y heredar la lectura o la nota de la parada anterior seria confirmar una
    // visita con la ubicacion de otra.
    const handleChange = useCallback(
      (index: number) => {
        if (index < 0) return;
        setNotes('');
        setRead(null);
        setErrorMessage(null);
        void takeReading();
      },
      [takeReading],
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      ),
      [],
    );

    // `stop.location` no es null: `isVisitable` ya lo garantizo antes de que
    // esta hoja se presente. El fallback evita el non-null assertion.
    const gate = stop?.location
      ? visitGate(stop.location, read)
      : { status: 'unavailable' as const };
    const canConfirm = gate.status === 'ready' && !reading && !submitting;

    async function handleConfirm() {
      if (!stop?.location || read?.status !== 'ok') return;

      setSubmitting(true);
      setErrorMessage(null);

      try {
        await confirmVisit({
          scheduledVisitId: stop.id,
          location: read.location,
          notes,
        });
        onConfirmed();
      } catch (error) {
        // 409 es "esta parada ya estaba confirmada". Para el vendedor eso no
        // es un error: es el resultado que buscaba, y pasa de verdad cuando un
        // reintento offline llega dos veces. Se trata como exito y se refresca
        // la ruta, que es lo que deja la tarjeta en gris.
        if (error instanceof ApiError && error.status === 409) {
          onConfirmed();
          return;
        }

        setErrorMessage(
          error instanceof ApiError ? error.message : 'No se pudo registrar la visita.',
        );
      } finally {
        setSubmitting(false);
      }
    }

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        onChange={handleChange}
        keyboardBehavior="interactive"
        android_keyboardInputMode="adjustResize"
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.background }}>
        <BottomSheetScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle" numberOfLines={2}>
            {stop?.name ?? 'Parada'}
          </ThemedText>

          {/* Pantalla 5 del wireframe: el estado y, si no se puede, el motivo.
              El texto sale de `visitGateMessage`, que tiene test -- CA2 no
              pide solo rechazar, pide notificar el motivo. */}
          <View
            style={[
              styles.gpsRow,
              {
                backgroundColor: theme.backgroundElement,
                // Mientras lee, el borde es neutro y no rojo: todavia no hay
                // veredicto, y pintarlo de rojo le dice al vendedor que algo
                // fallo cuando en realidad esta trabajando.
                borderColor: reading
                  ? theme.backgroundSelected
                  : gate.status === 'ready'
                    ? theme.tint
                    : theme.danger,
              },
            ]}>
            {reading ? (
              <ActivityIndicator />
            ) : (
              <ThemedText type="subtitle">{gate.status === 'ready' ? '✔' : '✗'}</ThemedText>
            )}
            <ThemedText type="small" style={styles.gpsText}>
              {reading ? 'Buscando tu ubicación…' : visitGateMessage(gate)}
            </ThemedText>
          </View>

          <Button
            title="Actualizar ubicación"
            variant="secondary"
            onPress={() => void takeReading()}
            disabled={reading || submitting}
          />

          <View style={styles.shortcuts}>
            {NOTE_SHORTCUTS.map((shortcut) => {
              const selected = notes.trim() === shortcut;

              return (
                <Pressable
                  key={shortcut}
                  onPress={() => setNotes(selected ? '' : shortcut)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [
                    styles.shortcut,
                    {
                      borderColor: selected ? theme.tint : theme.backgroundSelected,
                      backgroundColor: selected ? theme.backgroundSelected : theme.background,
                    },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="small">{shortcut}</ThemedText>
                </Pressable>
              );
            })}
          </View>

          {/* `BottomSheetTextInput` y no el `TextField` de la app: dentro de
              una hoja, un TextInput comun deja el teclado tapando el campo
              -- gorhom necesita su propio input para reacomodar la hoja. */}
          <View style={styles.field}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Nota (opcional)
            </ThemedText>
            <BottomSheetTextInput
              value={notes}
              onChangeText={setNotes}
              multiline
              maxLength={1000}
              placeholder="ej. cliente no se encontró, atendió el encargado"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                { backgroundColor: theme.backgroundElement, color: theme.text },
              ]}
            />
          </View>

          {errorMessage && (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {errorMessage}
            </ThemedText>
          )}

          <Button
            title="Guardar y finalizar"
            onPress={() => void handleConfirm()}
            loading={submitting}
            disabled={!canConfirm}
          />
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
    padding: Spacing.three,
    paddingBottom: Spacing.five,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 2,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  gpsText: {
    flexShrink: 1,
  },
  shortcuts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  shortcut: {
    borderWidth: 2,
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    minHeight: 88,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    fontSize: 16,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
});
