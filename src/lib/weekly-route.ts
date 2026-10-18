import { apiFetch } from '@/lib/api';
import type { DailyRouteStop, RouteRef } from '@/lib/daily-route';

/** Un dia de la semana asignada del vendedor (PCRM-170). */
export interface WeeklyRouteDay {
  /** Dia ISO: 1 = lunes … 7 = domingo, igual que `route_user.day`. */
  day: number;
  /** `YYYY-MM-DD`, dia calendario en la zona del negocio. */
  date: string;
  /** Vacio junto con `stops`, nunca uno sin el otro. */
  routes: RouteRef[];
  /**
   * Mismo shape que las paradas de la ruta diaria, para reutilizar el mapa y
   * la hoja. `completed_at` siempre llega null: es el plan, no su ejecucion.
   * Las extras (`is_extra`) vienen al final de cada dia.
   */
  stops: DailyRouteStop[];
}

export interface WeeklyRoute {
  /** Lunes de la semana en curso, `YYYY-MM-DD`. */
  week_start: string;
  /** Domingo, `YYYY-MM-DD`. */
  week_end: string;
  /**
   * Hoy en la zona del negocio. Viene del servidor para no depender del reloj
   * ni de la zona horaria del dispositivo.
   */
  today: string;
  /** Siempre siete dias, lunes primero, incluidos los dias sin ruta. */
  days: WeeklyRouteDay[];
}

/**
 * Trae la semana asignada del vendedor autenticado.
 *
 * No es historial: el backend la arma cada vez desde la asignacion viva
 * (`route_user` + `route_customer`), asi que una reasignacion hecha en el
 * panel web aparece en la siguiente llamada.
 */
export function fetchWeeklyRoute(): Promise<WeeklyRoute> {
  return apiFetch<WeeklyRoute>('/api/v1/me/route/week');
}
