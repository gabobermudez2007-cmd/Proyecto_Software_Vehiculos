import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, forkJoin, from, map, mergeMap, of, toArray } from 'rxjs';

import { ApiService } from './api.service';
import { mensajeDeError } from './errors';
import { Alerta, Mantenimiento, TipoVehiculo, Vehiculo } from './models';
import { TIPOS } from './vehicle-meta';

/**
 * Estado compartido de la flota: vehículos y alertas vigentes.
 * Las páginas lo leen con señales y llaman a refresh() después de cada cambio.
 */
@Injectable({ providedIn: 'root' })
export class FleetStore {
  private readonly api = inject(ApiService);

  readonly vehiculos = signal<Vehiculo[]>([]);
  readonly alertas = signal<Alerta[]>([]);
  readonly cargando = signal(false);
  readonly cargado = signal(false);
  readonly error = signal<string | null>(null);

  readonly conectado = computed(() => this.error() === null);
  readonly activos = computed(() => this.vehiculos().filter((v) => v.estado === 'ACTIVO'));
  readonly inactivos = computed(() => this.vehiculos().filter((v) => v.estado === 'INACTIVO'));

  /** Cantidad de vehículos por tipo (solo los tipos que tienen al menos uno). */
  readonly porTipo = computed(() => {
    const lista = this.vehiculos();
    return TIPOS.map((t) => ({
      ...t,
      total: lista.filter((v) => v.tipo === t.valor).length,
    })).filter((t) => t.total > 0);
  });

  /** Alertas agrupadas por vehículo, para consultarlas rápido desde las tarjetas. */
  readonly alertasPorVehiculo = computed(() => {
    const mapa = new Map<number, Alerta[]>();
    for (const a of this.alertas()) {
      const lista = mapa.get(a.vehiculoId) ?? [];
      lista.push(a);
      mapa.set(a.vehiculoId, lista);
    }
    return mapa;
  });

  refresh(): void {
    this.cargando.set(true);
    forkJoin({ vehiculos: this.api.vehiculos(), alertas: this.api.alertas() }).subscribe({
      next: ({ vehiculos, alertas }) => {
        this.vehiculos.set(vehiculos);
        this.alertas.set(alertas);
        this.error.set(null);
        this.cargado.set(true);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

  /**
   * Últimos servicios registrados en toda la flota.
   * El backend no tiene un endpoint global, así que se combinan los historiales por vehículo
   * (con un máximo de 6 consultas en paralelo).
   */
  actividadReciente(max = 5): Observable<Mantenimiento[]> {
    const ids = this.vehiculos().map((v) => v.id);
    if (ids.length === 0) return of([]);
    return from(ids).pipe(
      mergeMap((id) => this.api.historial(id).pipe(catchError(() => of([] as Mantenimiento[]))), 6),
      toArray(),
      map((listas) =>
        listas
          .flat()
          .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)
          .slice(0, max),
      ),
    );
  }

  contarPorTipo(tipo: TipoVehiculo): number {
    return this.vehiculos().filter((v) => v.tipo === tipo).length;
  }
}
