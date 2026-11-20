import { Component, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApiService } from '../core/api.service';
import { mensajeDeError } from '../core/errors';
import { FleetStore } from '../core/fleet.store';
import { Mantenimiento } from '../core/models';
import { Hito } from '../shared/hito';
import { Icon } from '../shared/icon';
import { StateView } from '../shared/state-view';
import { MantenimientoForm } from './mantenimiento-form';

/** Registro de servicios: formulario a la izquierda y, a la derecha, los últimos servicios del vehículo elegido. */
@Component({
  selector: 'app-mantenimientos-page',
  imports: [RouterLink, Icon, Hito, StateView, MantenimientoForm],
  template: `
    <div class="page">
      <header class="page-head reveal">
        <div>
          <p class="t-eyebrow">Mantenimiento</p>
          <h2 class="t-title">Registrar un servicio</h2>
        </div>
        <p class="t-muted ayuda">Elige el vehículo, completa los datos del servicio y quedará en su hoja de vida.</p>
      </header>

      <div class="dos">
        <section class="glass panel reveal" [style.--i]="1" aria-label="Formulario de mantenimiento">
          <app-mantenimiento-form (vehiculoCambio)="vehiculoId.set($event)" (guardado)="alGuardar()" />
        </section>

        <aside class="glass panel reveal" [style.--i]="2" aria-label="Últimos servicios del vehículo">
          <div class="panel-title">
            <h3>Últimos servicios</h3>
            @if (placa(); as p) {
              <span class="plate">{{ p }}</span>
            }
          </div>

          @if (vehiculoId() === null) {
            <div class="vacio">
              <span class="state-icon"><app-icon nombre="historial" /></span>
              <p>Selecciona un vehículo para ver aquí sus servicios más recientes.</p>
            </div>
          } @else if (error()) {
            <app-state-view tipo="error" [mensaje]="error()!" (reintentar)="cargar(vehiculoId())" />
          } @else if (reciente() === null) {
            <app-state-view tipo="cargando" [filas]="[1, 2, 3]" [alto]="64" />
          } @else if (reciente()!.length === 0) {
            <div class="vacio">
              <span class="state-icon"><app-icon nombre="llave" /></span>
              <p>Este vehículo todavía no tiene servicios. El que registres ahora será el primero.</p>
            </div>
          } @else {
            <ol class="timeline">
              @for (m of reciente()!; track m.id; let i = $index) {
                <li class="timeline-item reveal" [style.--i]="i">
                  <app-hito [mantenimiento]="m" compacto />
                </li>
              }
            </ol>
            <a class="btn btn-ghost completo" [routerLink]="['/historial']" [queryParams]="{ vehiculo: vehiculoId() }">
              Ver historial completo <app-icon nombre="flecha" />
            </a>
          }
        </aside>
      </div>
    </div>
  `,
  styles: [
    `
      .ayuda {
        max-width: 44ch;
        font-size: var(--fs-sm);
      }
      .dos {
        display: grid;
        grid-template-columns: minmax(0, 1.25fr) minmax(300px, 1fr);
        gap: var(--sp-5);
        align-items: start;
      }
      .vacio {
        display: grid;
        justify-items: center;
        gap: var(--sp-3);
        padding: var(--sp-6) var(--sp-3);
        text-align: center;
        color: var(--tx-300);
      }
      .completo {
        width: 100%;
        margin-top: var(--sp-4);
      }
      @media (max-width: 1000px) {
        .dos {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class MantenimientosPage {
  private readonly api = inject(ApiService);
  private readonly store = inject(FleetStore);

  protected readonly vehiculoId = signal<number | null>(null);
  protected readonly reciente = signal<Mantenimiento[] | null>(null);
  protected readonly error = signal<string | null>(null);

  protected placa(): string | null {
    const id = this.vehiculoId();
    return this.store.vehiculos().find((v) => v.id === id)?.placa ?? null;
  }

  constructor() {
    effect(() => {
      const id = this.vehiculoId();
      untracked(() => this.cargar(id));
    });
  }

  protected cargar(id: number | null): void {
    this.error.set(null);
    this.reciente.set(null);
    if (id === null) return;
    this.api.historial(id).subscribe({
      next: (lista) => {
        if (this.vehiculoId() === id) this.reciente.set(lista.slice(0, 4));
      },
      error: (e) => this.error.set(mensajeDeError(e)),
    });
  }

  protected alGuardar(): void {
    this.cargar(this.vehiculoId());
  }
}
