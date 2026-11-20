import { Pipe, PipeTransform } from '@angular/core';

const nfKm = new Intl.NumberFormat('es-CO');
const nfCosto = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatKm(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? '—' : nfKm.format(valor);
}

export function formatCosto(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? '—' : nfCosto.format(valor);
}

/** Convierte AAAA-MM-DD en fecha local (evita el desfase de zona horaria de new Date('AAAA-MM-DD')). */
export function parseFecha(iso: string): Date {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

export function formatFecha(iso: string | null | undefined, estilo: 'corta' | 'larga' = 'corta'): string {
  if (!iso) return '—';
  const opciones: Intl.DateTimeFormatOptions =
    estilo === 'larga'
      ? { day: 'numeric', month: 'long', year: 'numeric' }
      : { day: '2-digit', month: 'short', year: 'numeric' };
  return new Intl.DateTimeFormat('es-CO', opciones).format(parseFecha(iso));
}

/** Fecha de hoy en formato AAAA-MM-DD (hora local). */
export function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

@Pipe({ name: 'km' })
export class KmPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    return formatKm(valor);
  }
}

@Pipe({ name: 'cop' })
export class CopPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    return formatCosto(valor);
  }
}

@Pipe({ name: 'fecha' })
export class FechaPipe implements PipeTransform {
  transform(iso: string | null | undefined, estilo: 'corta' | 'larga' = 'corta'): string {
    return formatFecha(iso, estilo);
  }
}
