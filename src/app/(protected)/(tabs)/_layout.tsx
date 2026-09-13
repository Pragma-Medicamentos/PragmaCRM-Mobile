import AppTabs from '@/components/app-tabs';

/**
 * Todas las pantallas de la app viven bajo este grupo: al estar dentro de
 * `(protected)`, heredan la compuerta de sesion y la de rol sin repetir logica.
 */
export default function TabsLayout() {
  return <AppTabs />;
}
