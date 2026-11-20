import { Alerta, TipoVehiculo } from './models';

export interface TipoMeta {
  valor: TipoVehiculo;
  etiqueta: string;
  plural: string;
  color: string;
}

/** Catálogo de tipos de vehículo (coincide con el enum TipoVehiculo del backend). */
export const TIPOS: TipoMeta[] = [
  { valor: 'AUTOMOVIL', etiqueta: 'Automóvil', plural: 'Automóviles', color: 'var(--tipo-1)' },
  { valor: 'CAMIONETA', etiqueta: 'Camioneta', plural: 'Camionetas', color: 'var(--tipo-2)' },
  { valor: 'CAMION', etiqueta: 'Camión', plural: 'Camiones', color: 'var(--tipo-3)' },
  { valor: 'BUS', etiqueta: 'Bus', plural: 'Buses', color: 'var(--tipo-4)' },
  { valor: 'MOTOCICLETA', etiqueta: 'Motocicleta', plural: 'Motocicletas', color: 'var(--tipo-5)' },
];

export function etiquetaTipo(tipo: TipoVehiculo): string {
  return TIPOS.find((t) => t.valor === tipo)?.etiqueta ?? tipo;
}

export function colorTipo(tipo: TipoVehiculo): string {
  return TIPOS.find((t) => t.valor === tipo)?.color ?? 'var(--blue-400)';
}

// ── Gravedad de las alertas ──────────────────────────────────
// Se deduce solo con los datos que entrega el backend:
//  · crítica   → vencido por kilometraje Y por tiempo
//  · vencida   → vencido por uno de los dos criterios, con exceso
//  · en el límite → alcanzó el límite exacto (0 km / 0 días de exceso)
export type Gravedad = 'critica' | 'vencida' | 'limite';

export function gravedadDe(a: Alerta): Gravedad {
  const alLimite =
    (!a.vencidoPorKilometraje || a.kilometrosExcedidos === 0) &&
    (!a.vencidoPorTiempo || a.diasVencido === 0);
  if (alLimite) return 'limite';
  if (a.vencidoPorKilometraje && a.vencidoPorTiempo) return 'critica';
  return 'vencida';
}

export const GRAVEDAD_META: Record<Gravedad, { etiqueta: string; pill: string; color: string; orden: number }> = {
  critica: { etiqueta: 'Crítica', pill: 'pill-danger', color: 'var(--danger)', orden: 0 },
  vencida: { etiqueta: 'Vencida', pill: 'pill-warn', color: 'var(--warn)', orden: 1 },
  limite: { etiqueta: 'En el límite', pill: 'pill-info', color: 'var(--cyan-400)', orden: 2 },
};

/** Texto corto con el motivo de la alerta. */
export function motivoAlerta(a: Alerta, fmtKm: (n: number) => string): string {
  const partes: string[] = [];
  if (a.vencidoPorKilometraje) {
    partes.push(a.kilometrosExcedidos > 0 ? `${fmtKm(a.kilometrosExcedidos)} km sobre el previsto` : 'Alcanzó el kilometraje previsto');
  }
  if (a.vencidoPorTiempo) {
    partes.push(a.diasVencido > 0 ? `${a.diasVencido} ${a.diasVencido === 1 ? 'día' : 'días'} de retraso` : 'Vence hoy');
  }
  return partes.join(' · ');
}
