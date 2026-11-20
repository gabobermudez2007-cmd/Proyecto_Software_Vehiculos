import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ApiService } from '../core/api.service';
import { ConfirmService } from '../core/confirm.service';
import { mensajeDeError } from '../core/errors';
import { FleetStore } from '../core/fleet.store';
import { Alerta, Mantenimiento, Vehiculo } from '../core/models';
import { ToastService } from '../core/toast.service';
import { colorTipo, etiquetaTipo } from '../core/vehicle-meta';
import { AlertaItem } from '../shared/alerta-item';
import { Hito } from '../shared/hito';
import { Icon } from '../shared/icon';
import { Odometer } from '../shared/odometer';
import { StateView } from '../shared/state-view';
import { VehicleStage } from '../shared/vehicle-stage';
import { MantenimientoModal } from './mantenimiento-form';
import { VehiculoForm } from './vehiculo-form';

/** Ficha individual: vehículo 3D protagonista, datos alrededor, estado de mantenimiento e historial. */
@Component({
  selector: 'app-vehiculo-detalle-page',
  imports: [
    RouterLink, Icon, Odometer, StateView, VehicleStage,
    AlertaItem, Hito, VehiculoForm, MantenimientoModal,
  ],
  template: `
    <div class="page">
      <a class="volver reveal" routerLink="/vehiculos"><app-icon nombre="atras" /> Volver a la flota</a>

      @if (error()) {
        <app-state-view tipo="error" [mensaje]="error()!" (reintentar)="cargar()" />
      } @else if (!vehiculo()) {
        <div class="skeleton" style="height: 460px"></div>
      } @else {
        @let v = vehiculo()!;

        <section class="hero">
          <div class="escena glass reveal" [style.--acento]="color(v.tipo)">
            <app-vehicle-stage [tipo]="v.tipo" [inactivo]="v.estado === 'INACTIVO'" [modo]="modo()" />

            <div class="hud sup-izq">
              <p class="t-eyebrow">{{ etiqueta(v.tipo) }}</p>
              <p class="placa t-data">{{ v.placa }}</p>
            </div>

            <div class="hud sup-der">
              <div class="seg" role="group" aria-label="Modo de visualización">
                <button type="button" [class.activo]="modo() === 'solido'" (click)="modo.set('solido')">
                  <app-icon nombre="solido" /> Sólido
                </button>
                <button type="button" [class.activo]="modo() === 'estructura'" (click)="modo.set('estructura')">
                  <app-icon nombre="estructura" /> Estructura
                </button>
              </div>
            </div>

            <div class="hud inf-izq">
              <p class="t-eyebrow">Kilometraje actual</p>
              <app-odometer [valor]="v.kilometrajeActual" />
            </div>

            <div class="hud inf-der">
              <span class="pill" [class.pill-ok]="v.estado === 'ACTIVO'" [class.pill-muted]="v.estado === 'INACTIVO'">
                {{ v.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
              </span>
              <p class="nombre">{{ v.marca }} <b>{{ v.modelo }}</b></p>
            </div>
          </div>

          <aside class="lateral">
            <section class="glass panel reveal" [style.--i]="1">
              <div class="panel-title">
                <h3>Estado de mantenimiento</h3>
                @if (alertas().length) {
                  <span class="pill pill-danger">{{ alertas().length }} vencido{{ alertas().length === 1 ? '' : 's' }}</span>
                }
              </div>

              @if (alertas().length) {
                <div class="lista-alertas">
                  @for (a of alertas(); track a.tipoServicioId) {
                    <app-alerta-item [alerta]="a" compacto ocultarPlaca (registrar)="abrirServicio($event)" />
                  }
                </div>
              } @else {
                <div class="al-dia">
                  <span class="state-icon"><app-icon nombre="ok" /></span>
                  <p>
                    {{ historial()?.length ? 'Sin servicios vencidos.' : 'Aún no tiene servicios registrados.' }}
                  </p>
                </div>
              }
            </section>

            <section class="glass panel reveal" [style.--i]="2">
              <div class="panel-title"><h3>Acciones</h3></div>
              <div class="botones">
                <button type="button" class="btn btn-primary" [disabled]="v.estado === 'INACTIVO'" (click)="abrirServicio()">
                  <app-icon nombre="llave" /> Registrar servicio
                </button>
                <button type="button" class="btn" (click)="editando.set(true)">
                  <app-icon nombre="editar" /> Editar datos
                </button>
                <button type="button" class="btn btn-danger" (click)="eliminar(v)">
                  <app-icon nombre="papelera" /> Eliminar
                </button>
              </div>
              @if (v.estado === 'INACTIVO') {
                <p class="nota">Un vehículo inactivo conserva su historial, pero no admite nuevos servicios.</p>
              }
            </section>
          </aside>
        </section>

        <section class="historial reveal" [style.--i]="3">
          <div class="page-head">
            <div>
              <p class="t-eyebrow">Hoja de vida</p>
              <h2 class="t-title">Historial de mantenimientos</h2>
            </div>
            @if (historial(); as h) {
              <span class="t-muted">{{ h.length }} servicio{{ h.length === 1 ? '' : 's' }} registrado{{ h.length === 1 ? '' : 's' }}</span>
            }
          </div>

          @if (historial() === null) {
            <app-state-view tipo="cargando" [filas]="[1, 2]" [alto]="84" />
          } @else if (historial()!.length === 0) {
            <app-state-view
              tipo="vacio"
              icono="historial"
              titulo="Sin mantenimientos"
              mensaje="Este vehículo todavía no tiene servicios registrados. El primero aparecerá aquí, del más reciente al más antiguo."
            />
          } @else {
            <ol class="timeline">
              @for (m of historial()!; track m.id; let i = $index) {
                <li class="timeline-item reveal" [style.--i]="i">
                  <app-hito [mantenimiento]="m" />
                </li>
              }
            </ol>
          }
        </section>

        @if (editando()) {
          <app-vehiculo-form [vehiculo]="v" (guardado)="alEditar()" (cerrar)="editando.set(false)" />
        }
        @if (registrando()) {
          <app-mantenimiento-modal
            [vehiculoId]="v.id"
            [tipoServicioId]="servicioSugerido()"
            (guardado)="alRegistrar()"
            (cerrar)="registrando.set(false)"
          />
        }
      }
    </div>
  `,
  styles: [
    `
      .volver {
        display: inline-flex;
        align-items: center;
        gap: var(--sp-2);
        width: fit-content;
        color: var(--tx-300);
        font-size: var(--fs-sm);
        font-weight: 600;
        transition: color var(--t-fast), transform var(--t-med) var(--ease-out);
      }
      .volver:hover {
        color: var(--cyan-300);
        transform: translateX(-3px);
      }
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1.7fr) minmax(300px, 1fr);
        gap: var(--sp-5);
      }
      .escena {
        position: relative;
        min-height: 480px;
        overflow: hidden;
        background:
          radial-gradient(70% 60% at 50% 70%, color-mix(in srgb, var(--acento) 22%, transparent), transparent 70%),
          var(--glass);
      }
      .escena app-vehicle-stage {
        position: absolute;
        inset: 0;
        min-height: 0;
      }
      .hud {
        position: absolute;
        z-index: 2;
        pointer-events: none;
      }
      .hud > * {
        pointer-events: auto;
      }
      .sup-izq {
        top: var(--sp-5);
        left: var(--sp-5);
      }
      .sup-der {
        top: var(--sp-5);
        right: var(--sp-5);
      }
      .inf-izq {
        bottom: var(--sp-5);
        left: var(--sp-5);
        display: grid;
        gap: var(--sp-2);
      }
      .inf-der {
        bottom: var(--sp-5);
        right: var(--sp-5);
        display: grid;
        justify-items: end;
        gap: var(--sp-2);
        text-align: right;
      }
      .placa {
        font-size: var(--fs-2xl);
        font-weight: 700;
        letter-spacing: 0.14em;
      }
      .nombre {
        font-size: var(--fs-lg);
        color: var(--tx-200);
      }
      .nombre b {
        font-family: var(--font-display);
        color: var(--tx-100);
      }
      .seg button {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .lateral {
        display: grid;
        gap: var(--sp-5);
        align-content: start;
      }
      .lista-alertas {
        display: grid;
        gap: var(--sp-3);
      }
      .al-dia {
        display: flex;
        align-items: center;
        gap: var(--sp-4);
        color: var(--tx-200);
      }
      .al-dia .state-icon {
        flex: none;
        width: 48px;
        height: 48px;
        color: var(--ok);
        border-color: rgba(47, 211, 139, 0.4);
      }
      .botones {
        display: grid;
        gap: var(--sp-3);
      }
      .nota {
        margin-top: var(--sp-3);
        font-size: var(--fs-xs);
        color: var(--tx-400);
      }
      .historial {
        display: grid;
        gap: var(--sp-5);
        margin-top: var(--sp-3);
      }
      @media (max-width: 1000px) {
        .hero {
          grid-template-columns: 1fr;
        }
        .escena {
          min-height: 420px;
        }
      }
      @media (max-width: 640px) {
        .hud.inf-der {
          display: none;
        }
      }
    `,
  ],
})
export class VehiculoDetallePage {
  /** Identificador de la ruta /vehiculos/:id (enlazado automáticamente al @Input). */
  readonly id = input.required<string>();

  private readonly api = inject(ApiService);
  private readonly store = inject(FleetStore);
  private readonly toast = inject(ToastService);
  private readonly confirmacion = inject(ConfirmService);
  private readonly router = inject(Router);

  protected readonly vehiculo = signal<Vehiculo | null>(null);
  protected readonly historial = signal<Mantenimiento[] | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly modo = signal<'solido' | 'estructura'>('solido');
  protected readonly editando = signal(false);
  protected readonly registrando = signal(false);
  protected readonly servicioSugerido = signal<number | null>(null);

  protected readonly etiqueta = etiquetaTipo;
  protected readonly color = colorTipo;

  /** Servicios vencidos de este vehículo (los entrega el motor de alertas del backend). */
  protected readonly alertas = computed(() => this.store.alertasPorVehiculo().get(Number(this.id())) ?? []);

  constructor() {
    effect(() => {
      const id = Number(this.id());
      untracked(() => this.cargar(id));
    });
  }

  protected cargar(id = Number(this.id())): void {
    this.error.set(null);
    this.vehiculo.set(null);
    this.historial.set(null);
    forkJoin({ v: this.api.vehiculo(id), h: this.api.historial(id) }).subscribe({
      next: ({ v, h }) => {
        this.vehiculo.set(v);
        this.historial.set(h);
      },
      error: (e) => this.error.set(mensajeDeError(e)),
    });
  }

  protected abrirServicio(alerta?: Alerta): void {
    this.servicioSugerido.set(alerta?.tipoServicioId ?? null);
    this.registrando.set(true);
  }

  protected alRegistrar(): void {
    this.registrando.set(false);
    this.cargar();
    this.store.refresh();
  }

  protected alEditar(): void {
    this.editando.set(false);
    this.cargar();
    this.store.refresh();
  }

  protected async eliminar(v: Vehiculo): Promise<void> {
    const confirmado = await this.confirmacion.confirmar({
      titulo: `Eliminar ${v.placa}`,
      mensaje:
        'Si el vehículo tiene mantenimientos registrados quedará inactivo y conservará su historial. ' +
        'Si no tiene ninguno, se eliminará de forma definitiva. ¿Deseas continuar?',
      confirmar: 'Eliminar vehículo',
      peligro: true,
    });
    if (!confirmado) return;

    this.api.eliminarVehiculo(v.id).subscribe({
      next: (resultado) => {
        this.toast.exito(resultado.mensaje);
        this.store.refresh();
        if (resultado.eliminadoDefinitivamente) this.router.navigate(['/vehiculos']);
        else this.cargar();
      },
      error: (e) => this.toast.error(mensajeDeError(e)),
    });
  }
}
