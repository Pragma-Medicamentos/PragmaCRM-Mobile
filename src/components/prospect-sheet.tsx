import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useMemo, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View, type TextInputProps } from 'react-native';

import { ThemedText } from './themed-text';
import { Button } from './ui/button';

import { Spacing } from '@/constants/theme';
import { readPreciseLocation } from '@/hooks/use-device-location';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import { registerProspect } from '@/lib/prospect';
import {
  prospectErrorMessage,
  validateProspect,
  type ProspectDraft,
  type ProspectValidation,
} from '@/lib/prospect-form';
import type { LocationRead } from '@/lib/visit-gate';

const EMPTY_DRAFT: ProspectDraft = { name: '', phone: '', email: '', nrc: '', nit: '' };

type FieldError = Extract<ProspectValidation, { ok: false }> | null;

type Props = {
  /** Se llama tras registrar con exito, para cerrar la hoja. */
  onDone: () => void;
};

export type ProspectSheetHandle = ComponentRef<typeof BottomSheetModal>;

/**
 * Hoja de alta de prospecto (RF-10, PCRM-175).
 *
 * El vendedor entra a una farmacia que no esta en su ruta y deja el contacto
 * anotado; la venta que despues llegue del ERP es la que lo gradua a cliente,
 * del lado del panel web. Aca solo se captura.
 *
 * La ubicacion se toma con `readPreciseLocation` (~10 m, la misma lectura que
 * usa la validacion de visita) y no con el watch de la lista (~100 m): este
 * pin es el que va a quedar como ubicacion del negocio, y corregirlo solo se
 * puede desde el panel web.
 *
 * Sin coordenadas no hay registro: `latitude` y `longitude` son obligatorias
 * en `POST /api/v1/prospects`, asi que el boton no se habilita sin lectura.
 */
export const ProspectSheet = forwardRef<ProspectSheetHandle, Props>(function ProspectSheet(
  { onDone },
  ref,
) {
  const theme = useTheme();
  const [draft, setDraft] = useState<ProspectDraft>(EMPTY_DRAFT);
  const [reading, setReading] = useState(false);
  const [read, setRead] = useState<LocationRead | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<FieldError>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const snapPoints = useMemo(() => ['88%'], []);

  const takeReading = useCallback(async () => {
    setReading(true);
    setErrorMessage(null);
    setRead(await readPreciseLocation());
    setReading(false);
  }, []);

  // Cada apertura arranca de cero, igual que la hoja de validacion: heredar
  // los datos del prospecto anterior seria registrar un negocio con el nombre
  // de otro, y peor, con una ubicacion que ya no es donde esta parado.
  const handleChange = useCallback(
    (index: number) => {
      if (index < 0) return;
      setDraft(EMPTY_DRAFT);
      setRead(null);
      setFieldError(null);
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

  const update = (field: keyof ProspectDraft) => (value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    // El error deja de aplicar en cuanto el vendedor toca ese campo: dejarlo
    // ahi mientras escribe la correccion es acusarlo de algo que ya arreglo.
    setFieldError((current) => (current?.field === field ? null : current));
  };

  const hasLocation = read?.status === 'ok';
  const canSave = hasLocation && !reading && !submitting;

  const locationLabel = reading
    ? 'Buscando tu ubicación…'
    : read?.status === 'ok'
      ? 'Ubicación tomada aquí mismo'
      : read?.status === 'denied'
        ? 'Activa la ubicación para registrar el prospecto.'
        : 'No se pudo obtener tu ubicación. Intenta de nuevo.';

  async function handleSave() {
    if (read?.status !== 'ok') return;

    const validation = validateProspect(draft);
    if (!validation.ok) {
      setFieldError(validation);
      return;
    }

    setSubmitting(true);
    setFieldError(null);
    setErrorMessage(null);

    try {
      await registerProspect(validation.value, read.location, new Date());
      onDone();
      Alert.alert('Prospecto registrado', `${validation.value.name} quedó registrado.`);
    } catch (error) {
      // Sin conexion o timeout (status 0) va como aviso y no como texto al
      // pie: el vendedor acaba de tocar "Guardar" y tiene que enterarse de
      // que no se mando. Lo escrito se queda en la hoja para reintentar.
      if (error instanceof ApiError && error.status === 0) {
        Alert.alert('Sin conexión', error.message);
        return;
      }

      setErrorMessage(
        error instanceof ApiError
          ? prospectErrorMessage(error.status, error.message)
          : 'No se pudo registrar el prospecto. Intenta de nuevo.',
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
        <ThemedText type="subtitle">Nuevo prospecto</ThemedText>

        <SheetField
          label="Nombre del negocio"
          value={draft.name}
          onChangeText={update('name')}
          error={fieldError?.field === 'name' ? fieldError.message : undefined}
          maxLength={200}
          placeholder="ej. Farmacia San José"
        />

        <SheetField
          label="Teléfono"
          value={draft.phone}
          onChangeText={update('phone')}
          error={fieldError?.field === 'phone' ? fieldError.message : undefined}
          maxLength={40}
          keyboardType="phone-pad"
          placeholder="ej. 7777-7777"
        />

        <SheetField
          label="Correo (opcional)"
          value={draft.email}
          onChangeText={update('email')}
          error={fieldError?.field === 'email' ? fieldError.message : undefined}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="ej. contacto@farmacia.com"
        />

        <SheetField
          label="NRC (opcional)"
          value={draft.nrc}
          onChangeText={update('nrc')}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="ej. 123456-7"
        />

        <SheetField
          label="NIT (opcional)"
          value={draft.nit}
          onChangeText={update('nit')}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="ej. 0614-123456-001-2"
        />

        {/* Mismo trato que la hoja de validacion: borde neutro mientras lee
            (todavia no hay veredicto), de marca cuando hay lectura, rojo solo
            cuando ya se sabe que no la hay. */}
        <View
          style={[
            styles.gpsRow,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: reading
                ? theme.backgroundSelected
                : hasLocation
                  ? theme.tint
                  : theme.danger,
            },
          ]}>
          {reading ? <ActivityIndicator /> : <ThemedText type="subtitle">{hasLocation ? '✔' : '✗'}</ThemedText>}
          <ThemedText type="small" style={styles.gpsText}>
            {locationLabel}
          </ThemedText>
        </View>

        {!hasLocation && !reading && (
          <Button
            title="Actualizar ubicación"
            variant="secondary"
            onPress={() => void takeReading()}
            disabled={submitting}
          />
        )}

        {errorMessage && (
          <ThemedText type="small" style={{ color: theme.danger }}>
            {errorMessage}
          </ThemedText>
        )}

        <Button
          title="Guardar prospecto"
          onPress={() => void handleSave()}
          loading={submitting}
          disabled={!canSave}
        />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

type SheetFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

/**
 * `BottomSheetTextInput` y no el `TextField` de la app: dentro de una hoja, un
 * TextInput comun deja el teclado tapando el campo -- gorhom necesita su
 * propio input para reacomodar la hoja.
 */
function SheetField({ label, error, ...input }: SheetFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      <BottomSheetTextInput
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          {
            backgroundColor: theme.backgroundElement,
            color: theme.text,
            borderColor: error ? theme.danger : 'transparent',
          },
        ]}
        {...input}
      />
      {error && (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
    padding: Spacing.three,
    paddingBottom: Spacing.five,
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    lineHeight: 20,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 2,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  gpsText: {
    flex: 1,
  },
});
