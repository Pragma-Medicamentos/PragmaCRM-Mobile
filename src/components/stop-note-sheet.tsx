import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useMemo, useState, type ComponentRef } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { NoteField } from './note-field';
import { ThemedText } from './themed-text';
import { Button } from './ui/button';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import type { DailyRouteStop } from '@/lib/daily-route';
import { canSaveNote, noteErrorNeedsRefresh, stopNoteErrorMessage } from '@/lib/note';
import { setStopNote } from '@/lib/stop-note';

type Props = {
  /** La parada completada cuya nota se edita; null mientras la hoja esta cerrada. */
  stop: DailyRouteStop | null;
  /**
   * Se llama al guardar, y tambien ante un error que deja la ruta en pantalla
   * desfasada del servidor (ver `noteErrorNeedsRefresh`): en ambos casos lo
   * que sigue es refrescarla.
   */
  onSaved: () => void;
};

export type StopNoteSheetHandle = ComponentRef<typeof BottomSheetModal>;

/**
 * Agregar o editar la nota de una parada ya completada (PCRM-56, HU-07).
 *
 * La nota tambien se puede dejar al confirmar la visita; esta hoja cubre el
 * caso de quien la confirmo sin nota o quiere corregirla despues. Solo el
 * mismo dia de la parada: el servidor responde 422 fuera de el, porque el
 * administrador lee estas notas como el registro de lo que paso en campo.
 */
export const StopNoteSheet = forwardRef<StopNoteSheetHandle, Props>(function StopNoteSheet(
  { stop, onSaved },
  ref,
) {
  const theme = useTheme();
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const snapPoints = useMemo(() => ['60%'], []);
  const current = stop?.notes ?? null;

  // Cada apertura arranca de la nota guardada: la hoja se reusa para todas
  // las paradas, y heredar el borrador de otra seria guardarlo en la que no es.
  const handleChange = useCallback(
    (index: number) => {
      if (index < 0) return;
      setDraft(current ?? '');
      setErrorMessage(null);
    },
    [current],
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
    ),
    [],
  );

  async function handleSave() {
    if (!stop || !canSaveNote(draft, current)) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await setStopNote({ scheduledVisitId: stop.id, notes: draft });
      onSaved();
    } catch (error) {
      const status = error instanceof ApiError ? error.status : null;
      const message = stopNoteErrorMessage(status, error instanceof Error ? error.message : '');

      // Con la ruta desfasada no tiene sentido reintentar desde esta hoja:
      // se avisa con un Alert, que sobrevive al cierre, y se refresca.
      if (noteErrorNeedsRefresh(status)) {
        Alert.alert('No se pudo guardar la nota', message);
        onSaved();
        return;
      }

      setErrorMessage(message);
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

        <NoteField label="Nota de la visita" value={draft} onChangeText={setDraft} />

        {errorMessage && (
          <ThemedText type="small" style={{ color: theme.danger }}>
            {errorMessage}
          </ThemedText>
        )}

        <Button
          title="Guardar nota"
          onPress={() => void handleSave()}
          loading={submitting}
          disabled={!canSaveNote(draft, current)}
        />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
    padding: Spacing.three,
    paddingBottom: Spacing.five,
  },
});
