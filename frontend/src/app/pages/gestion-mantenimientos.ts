import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApiService } from '../core/api.service';
import { ConfirmService } from '../core/confirm.service';
import { mensajeDeError } from '../core/errors';
import { FleetStore } from '../core/fleet.store';
import { CopPipe, FechaPipe, KmPipe, formatFecha } from '../core/formatters';
import { Mantenimiento } from '../core/models';
import { ToastService } from '../core/toast.service';
import { Icon } from '../shared/icon';
import { StateView } from '../shared/state-view';
import { MantenimientoEdit } from './mantenimiento-edit';

/** Sección "Mantenimientos" de Gestión: consulta los servicios de un vehículo y permite editarlos o eliminarlos. */
@Component({
  selector: 'app-gestion-mantenimientos',
  imports: [RouterLink, Icon, StateView, CopPipe, FechaPipe, KmPipe, MantenimientoEdit],
  template: `
    <section class="barra glass reveal" [style.--i]="2">
      <div class="field">
        <label for="gm-vehiculo">Vehículo</label>
        <select id="gm-vehiculo" class="select" [value]="vehiculoId() ?? ''" (change)="cambiarVehiculo($any($event.target).value)">
          @if (store.vehiculos().length === 0) {
            <option value="">Sin vehículos registrados</option>
          }
          @for (v of store.vehiculos(); track v.id) {
            <option [value]="v.id" [selected]="v.id === vehiculoId()">
              {{ v.placa }} · {{ v.marca }} {{ v.modelo }}{{ v.estado === 'INACTIVO' ? ' (inactivo)' : '' }}
            </option>
          }
        </select>
      </div>
      <a class="btn btn-primary" routerLink="/mantenimientos"><app-icon nombre="mas" /> Registrar servicio</a>
    </section>

    @if (store.cargado() && store.vehiculos().length === 0) {
      <app-state-view tipo="vacio" icono="auto" titulo="No hay vehículos" mensaje="Registra un vehículo para empezar a registrar y gestionar sus mantenimientos." />
    } @else if (error()) {
      <app-state-view tipo="error" [mensaje]="error()!" (reintentar)="cargar()" />
    } @else if (lista() === null) {
      <app-state-view tipo="cargando" [filas]="[1, 2, 3]" [alto]="56" />
    } @else if (lista()!.length === 0) {
      <app-state-view
        tipo="vacio"
        icono="historial"
        titulo="Sin mantenimientos"
        mensaje="Este vehículo todavía no tiene servicios registrados."
      />
    } @else {
      <section class="glass panel reveal" [style.--i]="3" aria-label="Mantenimientos del vehículo">
        <div class="panel-title">
          <h3>{{ lista()!.length }} servicio{{ lista()!.length === 1 ? '' : 's' }} registrado{{ lista()!.length === 1 ? '' : 's' }}</h3>
        </div>
        <div class="tabla-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Servicio</th>
                <th>Taller</th>
                <th class="num">Kilometraje</th>
                <th class="num">Costo</th>
                <th class="acc"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (m of lista()!; track m.id) {
                <tr>
                  <td class="t-data">{{ m.fecha | fecha }}</td>
                  <td>{{ m.tipoServicio }}</td>
                  <td>{{ m.taller }}</td>
                  <td class="num t-data">{{ m.kilometraje | km }} km</td>
                  <td class="num t-data">{{ m.costo | cop }}</td>
                  <td class="acc">
                    <button type="button" class="btn-icon" [attr.aria-label]="'Editar servicio del ' + (m.fecha | fecha)" title="Editar" (click)="editar(m)">
                      <app-icon nombre="editar" />
                    </button>
                    <button
                      type="button"
                      class="btn-icon peligro"
                      [attr.aria-label]="'Eliminar servicio del ' + (m.fecha | fecha)"
                      title="Eliminar"
                      [disabled]="eliminando() === m.id"
                      (click)="eliminar(m)"
                    >
                      <app-icon nombre="papelera" />
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }

    @if (editando(); as m) {
      <app-mantenimiento-edit [mantenimiento]="m" [minimo]="limites().minimo" [maximo]="limites().maximo" (guardado)="alEditar()" (cerrar)="editando.set(null)" />
    }
  `,
  styles: [
    `
      .barra {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        justify-content: space-between;
        gap: var(--sp-4);
        padding: var(--sp-4) var(--sp-5);
      }
      .barra .field {
        flex: 1 1 280px;
        max-width: 420px;
      }
      .tabla-wrap {
        overflow-x: auto;
      }
      .table {
        min-width: 620px;
      }
      .num {
        text-align: right;
        white-space: nowrap;
      }
      .acc {
        width: 1%;
        white-space: nowrap;
        text-align: right;
      }
      .acc .btn-icon + .btn-icon {
        margin-left: var(--sp-2);
      }
      .btn-icon:disabled {
        opacity: 0.5;
        cursor: wait;
      }
    `,
  ],
})
export class GestionMantenimientos {
  protected readonly store = inject(FleetStore);
  private readonly api = inject(ApiService);
  private readonly confirmacion = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly vehiculoId = signal<number | null>(null);
  protected readonly lista = signal<Mantenimiento[] | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly editando = signal<Mantenimiento | null>(null);
  protected readonly eliminando = signal<number | null>(null);
  private peticion = 0;

  /** Kilometraje del servicio anterior y del siguiente (por orden de registro) al que se está editando. */
  protected readonly limites = computed(() => {
    const actual = this.editando();
    const lista = this.lista() ?? [];
    if (!actual) return { minimo: null as number | null, maximo: null as number | null };
    const ordenados = [...lista].sort((a, b) => a.id - b.id);
    const i = ordenados.findIndex((m) => m.id === actual.id);
    return {
      minimo: i > 0 ? ordenados[i - 1].kilometraje : null,
      maximo: i >= 0 && i < ordenados.length - 1 ? ordenados[i + 1].kilometraje : null,
    };
  });

  constructor() {
    // Selecciona el primer vehículo en cuanto carga la flota.
    effect(() => {
      const vehiculos = this.store.vehiculos();
      untracked(() => {
        if (this.vehiculoId() === null && vehiculos.length > 0) this.vehiculoId.set(vehiculos[0].id);
      });
    });
    effect(() => {
      this.vehiculoId();
      untracked(() => this.cargar());
    });
  }

  protected cambiarVehiculo(valor: string): void {
    this.lista.set(null);
    this.vehiculoId.set(valor ? Number(valor) : null);
  }

  protected cargar(): void {
    const id = this.vehiculoId();
    if (id === null) return;
    this.error.set(null);
    const numero = ++this.peticion;
    this.api.historial(id).subscribe({
      next: (lista) => {
        if (numero === this.peticion) this.lista.set(lista);
      },
      error: (e) => {
        if (numero === this.peticion) this.error.set(mensajeDeError(e));
      },
    });
  }

  protected editar(m: Mantenimiento): void {
    this.editando.set(m);
  }

  protected alEditar(): void {
    this.editando.set(null);
    this.cargar();
    this.store.refresh();
  }

  protected async eliminar(m: Mantenimiento): Promise<void> {
    const aceptado = await this.confirmacion.confirmar({
      titulo: 'Eliminar mantenimiento',
      mensaje: `Se eliminará el servicio "${m.tipoServicio}" del ${formatFecha(m.fecha)} (${m.placa}). Esta acción no se puede deshacer y puede cambiar las alertas del vehículo.`,
      confirmar: 'Eliminar',
      peligro: true,
    });
    if (!aceptado) return;

    this.eliminando.set(m.id);
    this.api.eliminarMantenimiento(m.id).subscribe({
      next: () => {
        this.eliminando.set(null);
        this.toast.exito('Mantenimiento eliminado.');
        this.cargar();
        this.store.refresh();
      },
      error: (e) => {
        this.eliminando.set(null);
        this.toast.error(mensajeDeError(e));
      },
    });
  }
}
