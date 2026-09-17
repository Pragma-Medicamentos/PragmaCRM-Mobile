import { Stack } from 'expo-router';

/**
 * El ingreso por codigo es la via principal: la mayoria de los vendedores no
 * recuerda una contraseña que solo usa en esta app. Sin esto el grupo abriria
 * en la primera ruta por orden de archivo, que no es la que queremos.
 */
export const unstable_settings = {
  anchor: 'otp',
};

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
