import { Component, computed, effect, inject, signal, untracked } from '@angular/core';

import { ApiService } from '../core/api.service';
import { mensajeDeError } from '../core/errors';
import { FleetStore } from '../core/fleet.store';
import { CopPipe, FechaPipe, KmPipe, hoyISO } from '../core/formatters';
import { ReporteCostos, TipoServicio } from '../core/models';
import { ToastService } from '../core/toast.service';
import { Icon } from '../shared/icon';
import { StateView } from '../shared/state-view';

/** Reporte de costos filtrable por vehículo, tipo de servicio y rango de fechas, con descarga en CSV. */
@Component({
  selector: 'app-reportes-page',
  imports: [Icon, StateView, CopPipe, FechaPipe, KmPipe],
  template: `
    <div class="page">
      <header class="page-head reveal">
        <div>
          <p class="t-eyebrow">Análisis</p>
          <h2 class="t-title">Reporte de costos</h2>
        </div>
        <button type="button" class="btn btn-primary" [disabled]="descargando() || !reporte()?.cantidadMantenimientos" (click)="descargar()">
          <app-icon nombre="descargar" /> {{ descargando() ? 'Generando…' : 'Descargar CSV' }}
        </button>
      </header>

      <section class="filtros glass reveal" [style.--i]="1" aria-label="Filtros del reporte">
        <div class="field">
          <label for="rp-vehiculo">Vehículo</label>
          <select id="rp-vehiculo" class="select" [value]="vehiculoId() ?? ''" (change)="vehiculoId.set(numero($any($event.target).value))">
            <option value="">Todos</option>
            @for (v of store.vehiculos(); track v.id) {
              <option [value]="v.id" [selected]="v.id === vehiculoId()">{{ v.placa }} · {{ v.marca }} {{ v.modelo }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label for="rp-servicio">Tipo de servicio</label>
          <select id="rp-servicio" class="select" [value]="servicioId() ?? ''" (change)="servicioId.set(numero($any($event.target).value))">
            <option value="">Todos</option>
            @for (t of servicios(); track t.id) {
              <option [value]="t.id" [selected]="t.id === servicioId()">{{ t.nombre }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label for="rp-desde">Desde</label>
          <input id="rp-desde" class="input" type="date" [value]="desde()" [max]="hasta() || null" (change)="desde.set($any($event.target).value)" />
        </div>
        <div class="field">
          <label for="rp-hasta">Hasta</label>
          <input id="rp-hasta" class="input" type="date" [value]="hasta()" [min]="desde() || null" (change)="hasta.set($any($event.target).value)" />
        </div>
        @if (hayFiltros()) {
          <button type="button" class="btn btn-ghost limpiar" (click)="limpiar()">Quitar filtros</button>
        }
      </section>

      @if (error()) {
        <app-state-view tipo="error" [mensaje]="error()!" (reintentar)="cargar()" />
      } @else if (reporte() === null) {
        <app-state-view tipo="cargando" [filas]="[1, 2, 3]" [alto]="72" />
      } @else {
        <section class="kpis reveal" [style.--i]="2" aria-label="Totales del reporte">
          <article class="kpi glass">
            <span class="t-eyebrow">Mantenimientos</span>
            <b class="t-data">{{ reporte()!.cantidadMantenimientos }}</b>
          </article>
          <article class="kpi glass">
            <span class="t-eyebrow">Costo total</span>
            <b class="t-data">{{ reporte()!.costoTotal | cop }}</b>
          </article>
          <article class="kpi glass">
            <span class="t-eyebrow">Costo promedio</span>
            <b class="t-data">{{ reporte()!.costoPromedio | cop }}</b>
          </article>
        </section>

        @if (reporte()!.mantenimientos.length === 0) {
          <app-state-view
            tipo="vacio"
            icono="reporte"
            titulo="Sin resultados"
            mensaje="No hay mantenimientos que cumplan con estos filtros. Prueba ampliando el rango de fechas."
          />
        } @else {
          <section class="glass panel reveal" [style.--i]="3" aria-label="Detalle de mantenimientos">
            <div class="tabla-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Vehículo</th>
                    <th>Servicio</th>
                    <th>Taller</th>
                    <th class="num">Kilometraje</th>
                    <th class="num">Costo</th>
                  </tr>
                </thead>
                <tbody>
                  @for (m of reporte()!.mantenimientos; track m.id) {
                    <tr>
                      <td class="t-data">{{ m.fecha | fecha }}</td>
                      <td><span class="plate">{{ m.placa }}</span></td>
                      <td>{{ m.tipoServicio }}</td>
                      <td>{{ m.taller }}</td>
                      <td class="num t-data">{{ m.kilometraje | km }} km</td>
                      <td class="num t-data">{{ m.costo | cop }}</td>
                    </tr>
                  }
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="5">Total</td>
                    <td class="num t-data">{{ reporte()!.costoTotal | cop }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        }
      }
    </div>
  `,
  styles: [
    `
      .filtros {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: var(--sp-4) var(--sp-5);
        align-items: end;
        padding: var(--sp-4) var(--sp-5);
      }
      .limpiar {
        grid-column: 1 / -1;
        justify-self: start;
      }
      input[type='date'] {
        color-scheme: dark;
      }
      .kpis {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: var(--sp-4);
      }
      .kpi {
        display: grid;
        gap: 4px;
        padding: var(--sp-4) var(--sp-5);
      }
      .kpi b {
        font-size: var(--fs-xl);
        line-height: 1.1;
      }
      .tabla-wrap {
        margin: calc(var(--sp-2) * -1);
        overflow-x: auto;
      }
      .table {
        min-width: 680px;
      }
      .num {
        text-align: right;
        white-space: nowrap;
      }
      tfoot td {
        border-bottom: 0;
        border-top: 1px solid var(--line-strong);
        font-weight: 700;
        color: var(--tx-100);
      }
      @media (max-width: 1000px) {
        .filtros {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 640px) {
        .filtros,
        .kpis {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ReportesPage {
  protected readonly store = inject(FleetStore);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  protected readonly servicios = signal<TipoServicio[]>([]);
  protected readonly vehiculoId = signal<number | null>(null);
  protected readonly servicioId = signal<number | null>(null);
  protected readonly desde = signal('');
  protected readonly hasta = signal('');

  protected readonly reporte = signal<ReporteCostos | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly descargando = signal(false);
  private peticion = 0;

  protected readonly hayFiltros = computed(
    () => this.vehiculoId() !== null || this.servicioId() !== null || this.desde() !== '' || this.hasta() !== '',
  );

  constructor() {
    this.api.tiposServicio().subscribe({ next: (lista) => this.servicios.set(lista) });
    // Cada cambio de filtro vuelve a pedir el reporte.
    effect(() => {
      this.vehiculoId();
      this.servicioId();
      this.desde();
      this.hasta();
      untracked(() => this.cargar());
    });
  }

  protected numero(valor: string): number | null {
    return valor ? Number(valor) : null;
  }

  protected limpiar(): void {
    this.vehiculoId.set(null);
    this.servicioId.set(null);
    this.desde.set('');
    this.hasta.set('');
  }

  private filtros() {
    return { vehiculoId: this.vehiculoId(), tipoServicioId: this.servicioId(), desde: this.desde(), hasta: this.hasta() };
  }

  protected cargar(): void {
    if (this.desde() && this.hasta() && this.desde() > this.hasta()) {
      this.error.set('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }
    this.error.set(null);
    const numero = ++this.peticion;
    this.api.reporteCostos(this.filtros()).subscribe({
      next: (r) => {
        if (numero === this.peticion) this.reporte.set(r);
      },
      error: (e) => {
        if (numero === this.peticion) this.error.set(mensajeDeError(e));
      },
    });
  }

  /** Descarga el reporte (con los filtros actuales) como archivo CSV. */
  protected descargar(): void {
    this.descargando.set(true);
    this.api.descargarCsv(this.filtros()).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `reporte-costos-${hoyISO()}.csv`;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        URL.revokeObjectURL(url);
        this.descargando.set(false);
        this.toast.exito('Reporte descargado en CSV.');
      },
      error: (e) => {
        this.descargando.set(false);
        this.toast.error(mensajeDeError(e));
      },
    });
  }
}
