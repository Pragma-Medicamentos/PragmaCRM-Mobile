import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useMemo, useState, type ComponentRef } from 'react';
import { Alert, StyleSheet, View, type TextInputProps } from 'react-native';

import { ThemedText } from './themed-text';
import { Button } from './ui/button';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import type { DailyRouteStop } from '@/lib/daily-route';
import { registerProductRequest } from '@/lib/product-request';
import {
  productRequestErrorMessage,
  validateProductRequest,
  type ProductRequestValidation,
} from '@/lib/product-request-form';

type Props = {
  /** La parada ya visitada; null mientras la hoja esta cerrada. */
  stop: DailyRouteStop | null;
  /** "Listo" en la alerta de exito: quien la monta decide como cerrarla. */
  onDone: () => void;
};

export type ProductRequestSheetHandle = ComponentRef<typeof BottomSheetModal>;

type FieldError = Extract<ProductRequestValidation, { ok: false }>;

/**
 * Formulario rapido de producto fuera de catalogo (PCRM-66, wireframe 8, HU-11
 * CA1). Se abre desde el detalle de una parada ya validada: el cliente es el de
 * la parada y la visita la resuelve el servidor, asi el registro queda
 * asociado a los dos sin que el vendedor elija nada.
 *
 * El wireframe trae "Nota adicional (opcional)", pero `product_request` no tiene
 * columna de notas y el GPI no la pide (caso de uso: indicar producto, indicar
 * cantidad, guardar). Queda fuera hasta que el equipo decida agregarla.
 *
 * Despues de guardar, la hoja se limpia y queda abierta: en una visita el
 * cliente suele pedir mas de un producto.
 */
export const ProductRequestSheet = forwardRef<ProductRequestSheetHandle, Props>(
  function ProductRequestSheet({ stop, onDone }, ref) {
    const theme = useTheme();
    const [productName, setProductName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [fieldError, setFieldError] = useState<FieldError | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const snapPoints = useMemo(() => ['70%'], []);

    const resetForm = useCallback(() => {
      setProductName('');
      setQuantity('');
      setFieldError(null);
      setErrorMessage(null);
    }, []);

    // Cada apertura arranca de cero: la hoja se reusa entre paradas, y heredar
    // lo escrito para otro cliente seria registrarlo en la visita equivocada.
    const handleChange = useCallback(
      (index: number) => {
        if (index >= 0) resetForm();
      },
      [resetForm],
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      ),
      [],
    );

    async function handleSave() {
      if (!stop) return;

      const result = validateProductRequest({ productName, quantity });
      if (!result.ok) {
        setFieldError(result);
        return;
      }

      setFieldError(null);
      setErrorMessage(null);
      setSubmitting(true);

      try {
        const saved = await registerProductRequest({
          scheduledVisitId: stop.id,
          ...result.value,
        });
        resetForm();
        Alert.alert(
          'Producto registrado',
          `"${saved.quoted_product.name}" quedó registrado para ${stop.name}.`,
          [
            { text: 'Registrar otro', style: 'cancel' },
            { text: 'Listo', onPress: onDone },
          ],
        );
      } catch (error) {
        setErrorMessage(
          error instanceof ApiError
            ? productRequestErrorMessage(error.status, error.message)
            : 'No se pudo registrar el producto. Intenta de nuevo.',
        );
      } finally {
        setSubmitting(false);
      }
    }

    const inputStyle = [styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }];

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
        <BottomSheetScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <ThemedText type="subtitle">Producto fuera de catálogo</ThemedText>

          <View style={styles.field}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Cliente
            </ThemedText>
            <ThemedText type="default" numberOfLines={2}>
              {stop?.name ?? '—'}
            </ThemedText>
          </View>

          {/* `BottomSheetTextInput` y no `TextField`: dentro de una hoja, un
              TextInput comun deja el teclado tapando el campo. */}
          <SheetField
            label="Nombre del producto solicitado"
            error={fieldError?.field === 'productName' ? fieldError.message : null}
            value={productName}
            onChangeText={setProductName}
            placeholder="ej. Ibuprofeno 400 mg, caja x 100"
            maxLength={200}
            autoCapitalize="sentences"
            returnKeyType="next"
            style={inputStyle}
          />

          <SheetField
            label="Cantidad aproximada (opcional)"
            error={fieldError?.field === 'quantity' ? fieldError.message : null}
            value={quantity}
            onChangeText={setQuantity}
            placeholder="ej. 12"
            keyboardType="decimal-pad"
            maxLength={13}
            returnKeyType="done"
            onSubmitEditing={() => void handleSave()}
            style={inputStyle}
          />

          {errorMessage && (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {errorMessage}
            </ThemedText>
          )}

          <Button
            title="Guardar producto"
            onPress={() => void handleSave()}
            loading={submitting}
            disabled={submitting || !stop}
          />
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

type SheetFieldProps = TextInputProps & {
  label: string;
  error: string | null;
};

function SheetField({ label, error, ...input }: SheetFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      <BottomSheetTextInput placeholderTextColor={theme.textSecondary} {...input} />
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
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    lineHeight: 20,
  },
});
