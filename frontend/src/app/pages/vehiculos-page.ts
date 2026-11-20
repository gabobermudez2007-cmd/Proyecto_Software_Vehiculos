import { Component, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, debounceTime, map, of, switchMap } from 'rxjs';

import { ApiService } from '../core/api.service';
import { ConfirmService } from '../core/confirm.service';
import { mensajeDeError } from '../core/errors';
import { FleetStore } from '../core/fleet.store';
import { KmPipe } from '../core/formatters';
import { EstadoVehiculo, FiltrosVehiculo, TipoVehiculo, Vehiculo } from '../core/models';
import { ToastService } from '../core/toast.service';
import { TIPOS, colorTipo, etiquetaTipo } from '../core/vehicle-meta';
import { Icon } from '../shared/icon';
import { StateView } from '../shared/state-view';
import { VehicleThumb } from '../shared/vehicle-thumb';
import { VehiculoForm } from './vehiculo-form';

/** Galería visual de la flota con búsqueda por placa y filtros por tipo y estado. */
@Component({
  selector: 'app-vehiculos-page',
  imports: [RouterLink, Icon, KmPipe, StateView, VehicleThumb, VehiculoForm],
  template: `
    <div class="page">
      <header class="page-head reveal">
        <div>
          <p class="t-eyebrow">Flota</p>
          <h2 class="t-title">
            Vehículos
            @if (lista(); as l) {
              <span class="total t-data">{{ l.length }}</span>
            }
          </h2>
        </div>
        <button type="button" class="btn btn-primary" (click)="abrirNuevo()">
          <app-icon nombre="mas" /> Nuevo vehículo
        </button>
      </header>

      <section class="filtros glass reveal" [style.--i]="1" aria-label="Filtros">
        <label class="busqueda">
          <app-icon nombre="buscar" />
          <span class="sr-only">Buscar por placa</span>
          <input
            class="input mono"
            type="search"
            placeholder="Buscar por placa…"
            autocomplete="off"
            [value]="placa()"
            (input)="cambiarPlaca($any($event.target).value)"
          />
        </label>

        <div class="seg" role="group" aria-label="Filtrar por tipo">
          <button type="button" [class.activo]="tipo() === ''" (click)="cambiarTipo('')">Todos</button>
          @for (t of tipos; track t.valor) {
            <button type="button" [class.activo]="tipo() === t.valor" (click)="cambiarTipo(t.valor)">
              {{ t.plural }}
            </button>
          }
        </div>

        <div class="seg" role="group" aria-label="Filtrar por estado">
          <button type="button" [class.activo]="estado() === ''" (click)="cambiarEstado('')">Todos</button>
          <button type="button" [class.activo]="estado() === 'ACTIVO'" (click)="cambiarEstado('ACTIVO')">Activos</button>
          <button type="button" [class.activo]="estado() === 'INACTIVO'" (click)="cambiarEstado('INACTIVO')">Inactivos</button>
        </div>
      </section>

      @if (error()) {
        <app-state-view tipo="error" [mensaje]="error()!" (reintentar)="recargar()" />
      } @else if (lista() === null) {
        <div class="galeria">
          @for (n of [1, 2, 3, 4, 5, 6]; track n) {
            <div class="skeleton" style="height: 340px"></div>
          }
        </div>
      } @else if (lista()!.length === 0) {
        <app-state-view
          tipo="vacio"
          [titulo]="hayFiltros() ? 'Sin resultados' : 'Aún no hay vehículos'"
          [mensaje]="
            hayFiltros()
              ? 'Ningún vehículo coincide con la búsqueda o los filtros aplicados.'
              : 'Registra el primer vehículo de la flota para comenzar a llevar su historial.'
          "
        >
          @if (!hayFiltros()) {
            <button type="button" class="btn btn-primary" (click)="abrirNuevo()">
              <app-icon nombre="mas" /> Registrar vehículo
            </button>
          }
        </app-state-view>
      } @else {
        <section class="galeria" aria-label="Vehículos de la flota">
          @for (v of lista()!; track v.id; let i = $index) {
            <article
              class="vcard glass reveal"
              [class.inactivo]="v.estado === 'INACTIVO'"
              [style.--i]="i"
              [style.--acento]="color(v.tipo)"
            >
              <a class="render" [routerLink]="['/vehiculos', v.id]" [attr.aria-label]="'Abrir ficha de ' + v.placa">
                <app-vehicle-thumb [tipo]="v.tipo" />
              </a>

              <div class="cuerpo">
                <div class="fila">
                  <span class="plate">{{ v.placa }}</span>
                  <span class="pill" [class.pill-ok]="v.estado === 'ACTIVO'" [class.pill-muted]="v.estado === 'INACTIVO'">
                    {{ v.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                  </span>
                </div>

                <p class="nombre">
                  {{ v.marca }} <b>{{ v.modelo }}</b>
                </p>
                <p class="tipo">{{ etiqueta(v.tipo) }}</p>

                <div class="datos">
                  <span class="km t-data">{{ v.kilometrajeActual | km }}<small>km</small></span>
                  @if (alertasDe(v.id); as n) {
                    <span class="mantenimiento alerta"><app-icon nombre="campana" /> {{ n }} vencido{{ n === 1 ? '' : 's' }}</span>
                  } @else {
                    <span class="mantenimiento al-dia"><app-icon nombre="ok" /> Sin vencidos</span>
                  }
                </div>
              </div>

              <div class="acciones">
                <a class="btn btn-sm" [routerLink]="['/vehiculos', v.id]">Ver ficha <app-icon nombre="flecha" /></a>
                <span class="row">
                  <button type="button" class="btn-icon" [attr.aria-label]="'Editar ' + v.placa" (click)="abrirEditar(v)">
                    <app-icon nombre="editar" />
                  </button>
                  <button type="button" class="btn-icon peligro" [attr.aria-label]="'Eliminar ' + v.placa" (click)="eliminar(v)">
                    <app-icon nombre="papelera" />
                  </button>
                </span>
              </div>
            </article>
          }
        </section>
      }
    </div>

    @if (formAbierto()) {
      <app-vehiculo-form [vehiculo]="editando()" (guardado)="alGuardar()" (cerrar)="cerrarFormulario()" />
    }
  `,
  styles: [
    `
      .total {
        display: inline-block;
        margin-left: var(--sp-2);
        padding: 0 10px;
        border: 1px solid var(--line-strong);
        border-radius: var(--r-pill);
        font-size: var(--fs-md);
        color: var(--cyan-300);
        vertical-align: middle;
      }
      .filtros {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--sp-3) var(--sp-4);
        padding: var(--sp-3) var(--sp-4);
      }
      .busqueda {
        position: relative;
        flex: 1 1 240px;
      }
      .busqueda app-icon {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--tx-400);
        pointer-events: none;
      }
      .busqueda .input {
        padding-left: 38px;
        text-transform: uppercase;
      }
      .galeria {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
        gap: var(--sp-6) var(--sp-5);
        padding-top: var(--sp-6);
      }

      /* Tarjeta: el render sobresale por encima del panel */
      .vcard {
        display: flex;
        flex-direction: column;
        gap: var(--sp-3);
        padding: 0 var(--sp-4) var(--sp-4);
        transition: transform var(--t-med) var(--ease-out), border-color var(--t-med), box-shadow var(--t-med);
      }
      .vcard::after {
        content: '';
        position: absolute;
        left: var(--sp-4);
        top: -1px;
        width: 56px;
        height: 3px;
        border-radius: 0 0 3px 3px;
        background: var(--acento);
        box-shadow: 0 0 16px var(--acento);
      }
      .vcard:hover {
        transform: translateY(-6px);
        border-color: var(--line-strong);
        box-shadow: var(--sh-2);
      }
      .render {
        display: block;
        margin: -44px calc(var(--sp-2) * -1) 0;
        filter: drop-shadow(0 18px 22px rgba(0, 0, 0, 0.5));
        transition: transform var(--t-slow) var(--ease-out);
      }
      .vcard:hover .render {
        transform: scale(1.06) translateY(-4px);
      }
      .vcard.inactivo .render {
        filter: grayscale(1) opacity(0.55) drop-shadow(0 18px 22px rgba(0, 0, 0, 0.5));
      }
      .fila {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--sp-3);
      }
      .nombre {
        font-size: var(--fs-lg);
        color: var(--tx-200);
      }
      .nombre b {
        font-family: var(--font-display);
        color: var(--tx-100);
      }
      .tipo {
        margin-top: -8px;
        font-size: var(--fs-xs);
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--tx-400);
      }
      .datos {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: var(--sp-3);
        padding-top: var(--sp-3);
        border-top: 1px solid var(--line);
      }
      .km {
        font-size: var(--fs-xl);
        font-weight: 700;
      }
      .km small {
        margin-left: 6px;
        font-size: var(--fs-xs);
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--cyan-400);
      }
      .mantenimiento {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: var(--fs-xs);
        font-weight: 700;
      }
      .mantenimiento.alerta {
        color: var(--danger);
      }
      .mantenimiento.al-dia {
        color: var(--ok);
      }
      .acciones {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--sp-3);
      }
      @media (max-width: 640px) {
        .galeria {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class VehiculosPage {
  /** Parámetro de consulta ?nuevo=1: abre el formulario de registro (acceso rápido de la barra superior). */
  readonly nuevo = input<string | undefined>();

  private readonly api = inject(ApiService);
  private readonly store = inject(FleetStore);
  private readonly toast = inject(ToastService);
  private readonly confirmacion = inject(ConfirmService);
  private readonly router = inject(Router);

  protected readonly tipos = TIPOS;
  protected readonly etiqueta = etiquetaTipo;
  protected readonly color = colorTipo;

  protected readonly lista = signal<Vehiculo[] | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly placa = signal('');
  protected readonly tipo = signal<TipoVehiculo | ''>('');
  protected readonly estado = signal<EstadoVehiculo | ''>('');
  protected readonly formAbierto = signal(false);
  protected readonly editando = signal<Vehiculo | null>(null);

  private readonly filtros$ = new BehaviorSubject<FiltrosVehiculo>({});

  constructor() {
    this.filtros$
      .pipe(
        debounceTime(220),
        switchMap((filtros) =>
          this.api.vehiculos(filtros).pipe(
            map((lista) => ({ lista, error: null as string | null })),
            catchError((e) => of({ lista: null, error: mensajeDeError(e) })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ lista, error }) => {
        this.error.set(error);
        if (lista) this.lista.set(lista);
      });

    effect(() => {
      if (this.nuevo()) {
        this.abrirNuevo();
        this.router.navigate([], { queryParams: { nuevo: null }, replaceUrl: true });
      }
    });
  }

  protected hayFiltros(): boolean {
    return this.placa().trim() !== '' || this.tipo() !== '' || this.estado() !== '';
  }

  protected alertasDe(vehiculoId: number): number {
    return this.store.alertasPorVehiculo().get(vehiculoId)?.length ?? 0;
  }

  protected cambiarPlaca(valor: string): void {
    this.placa.set(valor);
    this.aplicarFiltros();
  }

  protected cambiarTipo(valor: TipoVehiculo | ''): void {
    this.tipo.set(valor);
    this.aplicarFiltros();
  }

  protected cambiarEstado(valor: EstadoVehiculo | ''): void {
    this.estado.set(valor);
    this.aplicarFiltros();
  }

  private aplicarFiltros(): void {
    this.filtros$.next({ placa: this.placa(), tipo: this.tipo(), estado: this.estado() });
  }

  protected recargar(): void {
    this.error.set(null);
    this.lista.set(null);
    this.aplicarFiltros();
  }

  protected abrirNuevo(): void {
    this.editando.set(null);
    this.formAbierto.set(true);
  }

  protected abrirEditar(vehiculo: Vehiculo): void {
    this.editando.set(vehiculo);
    this.formAbierto.set(true);
  }

  protected cerrarFormulario(): void {
    this.formAbierto.set(false);
    this.editando.set(null);
  }

  protected alGuardar(): void {
    this.cerrarFormulario();
    this.aplicarFiltros();
    this.store.refresh();
  }

  protected async eliminar(vehiculo: Vehiculo): Promise<void> {
    const confirmado = await this.confirmacion.confirmar({
      titulo: `Eliminar ${vehiculo.placa}`,
      mensaje:
        'Si el vehículo tiene mantenimientos registrados quedará inactivo y conservará su historial. ' +
        'Si no tiene ninguno, se eliminará de forma definitiva. ¿Deseas continuar?',
      confirmar: 'Eliminar vehículo',
      peligro: true,
    });
    if (!confirmado) return;

    this.api.eliminarVehiculo(vehiculo.id).subscribe({
      next: (resultado) => {
        this.toast.exito(resultado.mensaje);
        this.aplicarFiltros();
        this.store.refresh();
      },
      error: (e) => this.toast.error(mensajeDeError(e)),
    });
  }
}
