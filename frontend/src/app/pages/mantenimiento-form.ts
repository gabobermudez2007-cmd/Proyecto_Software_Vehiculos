import { Component, OnInit, booleanAttribute, computed, inject, input, output, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { ApiService } from '../core/api.service';
import { mensajeDeError } from '../core/errors';
import { FleetStore } from '../core/fleet.store';
import { esInvalido, textoError } from '../core/form-utils';
import { formatKm, hoyISO } from '../core/formatters';
import { Mantenimiento, MantenimientoRequest, Taller, TipoServicio } from '../core/models';
import { ToastService } from '../core/toast.service';
import { Icon } from '../shared/icon';
import { Modal } from '../shared/modal';
import { StateView } from '../shared/state-view';

/** Impide registrar un servicio con fecha futura (regla del backend). */
function fechaNoFutura(control: AbstractControl): ValidationErrors | null {
  return control.value && control.value > hoyISO() ? { futura: true } : null;
}

/**
 * Formulario de registro de mantenimiento.
 * Al elegir un vehículo se consulta su historial para mostrar el último kilometraje registrado
 * y evitar valores inferiores (RNF-07); el backend valida de nuevo y su mensaje se muestra tal cual.
 */
@Component({
  selector: 'app-mantenimiento-form',
  imports: [ReactiveFormsModule, Icon, StateView],
  template: `
    @if (estadoCatalogos() === 'cargando') {
      <app-state-view tipo="cargando" [filas]="[1, 2, 3]" [alto]="52" />
    } @else if (estadoCatalogos() === 'error') {
      <app-state-view
        tipo="error"
        titulo="No se pudieron cargar los catálogos"
        [mensaje]="errorCatalogos()"
        (reintentar)="cargarCatalogos()"
      />
    } @else {
      <form [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        @if (errorServidor()) {
          <div class="form-banner" role="alert">
            <app-icon nombre="aviso" />
            <span>{{ errorServidor() }}</span>
          </div>
        }

        <div class="form-grid">
          <div class="field full">
            <label for="mf-vehiculo">Vehículo</label>
            <select
              id="mf-vehiculo"
              class="select mono"
              formControlName="vehiculoId"
              [class.invalido]="esInvalido(form.controls.vehiculoId)"
            >
              <option [ngValue]="null" disabled>Selecciona una placa…</option>
              @for (v of store.activos(); track v.id) {
                <option [ngValue]="v.id">{{ v.placa }} · {{ v.marca }} {{ v.modelo }}</option>
              }
            </select>
            @if (esInvalido(form.controls.vehiculoId)) {
              <span class="field-error">Selecciona el vehículo.</span>
            } @else {
              @let v = vehiculoSeleccionado();
              @if (v) {
                <span class="referencia">
                  <span><small>Km actual</small> <b class="t-data">{{ km(v.kilometrajeActual) }}</b></span>
                  <span>
                    <small>Último servicio</small>
                    <b class="t-data">{{ kmMinimo() === null ? 'Sin servicios previos' : km(kmMinimo()!) + ' km' }}</b>
                  </span>
                </span>
              } @else {
                <span class="hint">Solo se listan vehículos activos.</span>
              }
            }
          </div>

          <div class="field">
            <label for="mf-servicio">Tipo de servicio</label>
            <select
              id="mf-servicio"
              class="select"
              formControlName="tipoServicioId"
              [class.invalido]="esInvalido(form.controls.tipoServicioId)"
            >
              <option [ngValue]="null" disabled>Selecciona…</option>
              @for (t of tipos(); track t.id) {
                <option [ngValue]="t.id">{{ t.nombre }}</option>
              }
            </select>
            @if (esInvalido(form.controls.tipoServicioId)) {
              <span class="field-error">Selecciona el tipo de servicio.</span>
            } @else {
              @let s = servicioSeleccionado();
              @if (s) {
                <span class="hint">Se repite cada {{ km(s.intervaloKm) }} km o {{ s.intervaloMeses }} meses.</span>
              }
            }
          </div>

          <div class="field">
            <label for="mf-taller">Taller</label>
            <select
              id="mf-taller"
              class="select"
              formControlName="tallerId"
              [class.invalido]="esInvalido(form.controls.tallerId)"
            >
              <option [ngValue]="null" disabled>Selecciona…</option>
              @for (t of talleres(); track t.id) {
                <option [ngValue]="t.id">{{ t.nombre }}</option>
              }
            </select>
            @if (esInvalido(form.controls.tallerId)) {
              <span class="field-error">Selecciona el taller.</span>
            }
          </div>

          <div class="field">
            <label for="mf-fecha">Fecha del servicio</label>
            <input
              id="mf-fecha"
              class="input"
              type="date"
              formControlName="fecha"
              [max]="hoy"
              [class.invalido]="esInvalido(form.controls.fecha)"
            />
            @if (esInvalido(form.controls.fecha)) {
              <span class="field-error">{{ error(form.controls.fecha) }}</span>
            }
          </div>

          <div class="field">
            <label for="mf-km">Kilometraje del servicio</label>
            <input
              id="mf-km"
              class="input mono"
              type="number"
              inputmode="numeric"
              min="0"
              formControlName="kilometraje"
              placeholder="0"
              [class.invalido]="esInvalido(form.controls.kilometraje)"
            />
            @if (esInvalido(form.controls.kilometraje)) {
              <span class="field-error">{{ error(form.controls.kilometraje) }}</span>
            }
          </div>

          <div class="field full">
            <label for="mf-costo">Costo (COP)</label>
            <input
              id="mf-costo"
              class="input mono"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
              formControlName="costo"
              placeholder="0"
              [class.invalido]="esInvalido(form.controls.costo)"
            />
            @if (esInvalido(form.controls.costo)) {
              <span class="field-error">{{ error(form.controls.costo) }}</span>
            } @else {
              <span class="hint">Hasta 2 decimales.</span>
            }
          </div>
        </div>

        <div class="form-actions">
          @if (mostrarCancelar()) {
            <button type="button" class="btn btn-ghost" (click)="cancelar.emit()">Cancelar</button>
          }
          <button type="submit" class="btn btn-primary" [disabled]="enviando()">
            <app-icon nombre="llave" /> {{ enviando() ? 'Registrando…' : 'Registrar mantenimiento' }}
          </button>
        </div>
      </form>
    }
  `,
  styles: [
    `
      .referencia {
        display: flex;
        flex-wrap: wrap;
        gap: var(--sp-2) var(--sp-5);
        padding: var(--sp-2) var(--sp-3);
        border: 1px dashed var(--line-strong);
        border-radius: var(--r-md);
        font-size: var(--fs-sm);
        color: var(--tx-300);
      }
      .referencia small {
        margin-right: 6px;
        font-size: var(--fs-xs);
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--tx-400);
      }
      .referencia b {
        color: var(--cyan-300);
      }
    `,
  ],
})
export class MantenimientoForm implements OnInit {
  /** Vehículo preseleccionado (por ejemplo, al registrar desde su ficha o desde una alerta). */
  readonly vehiculoId = input<number | null>(null);
  readonly tipoServicioId = input<number | null>(null);
  readonly mostrarCancelar = input(false, { transform: booleanAttribute });

  readonly guardado = output<Mantenimiento>();
  readonly vehiculoCambio = output<number | null>();
  readonly cancelar = output<void>();

  protected readonly store = inject(FleetStore);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  protected readonly tipos = signal<TipoServicio[]>([]);
  protected readonly talleres = signal<Taller[]>([]);
  protected readonly estadoCatalogos = signal<'cargando' | 'listo' | 'error'>('cargando');
  protected readonly errorCatalogos = signal('');
  protected readonly enviando = signal(false);
  protected readonly errorServidor = signal<string | null>(null);

  /** Mayor kilometraje registrado en los servicios del vehículo elegido (null si no tiene). */
  protected readonly kmMinimo = signal<number | null>(null);
  private readonly idSeleccionado = signal<number | null>(null);
  private readonly idServicio = signal<number | null>(null);

  protected readonly vehiculoSeleccionado = computed(() => {
    const id = this.idSeleccionado();
    return id === null ? null : (this.store.vehiculos().find((v) => v.id === id) ?? null);
  });
  protected readonly servicioSeleccionado = computed(() => {
    const id = this.idServicio();
    return id === null ? null : (this.tipos().find((t) => t.id === id) ?? null);
  });

  protected readonly hoy = hoyISO();
  protected readonly km = formatKm;
  protected readonly esInvalido = esInvalido;

  protected readonly form = new FormGroup({
    vehiculoId: new FormControl<number | null>(null, Validators.required),
    tipoServicioId: new FormControl<number | null>(null, Validators.required),
    tallerId: new FormControl<number | null>(null, Validators.required),
    fecha: new FormControl(hoyISO(), { nonNullable: true, validators: [Validators.required, fechaNoFutura] }),
    kilometraje: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.pattern(/^\d+$/),
      (c: AbstractControl): ValidationErrors | null => {
        const minimo = this.kmMinimo();
        return minimo !== null && c.value !== null && c.value < minimo ? { menorQueUltimo: { minimo } } : null;
      },
    ]),
    costo: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.max(9999999999.99),
      Validators.pattern(/^\d+(\.\d{1,2})?$/),
    ]),
  });

  constructor() {
    this.form.controls.vehiculoId.valueChanges.subscribe((id) => {
      this.idSeleccionado.set(id);
      this.vehiculoCambio.emit(id);
      this.cargarReferencia(id);
    });
    this.form.controls.tipoServicioId.valueChanges.subscribe((id) => this.idServicio.set(id));
  }

  ngOnInit(): void {
    this.cargarCatalogos();
    const vehiculo = this.vehiculoId();
    if (vehiculo !== null) this.form.controls.vehiculoId.setValue(vehiculo);
    const servicio = this.tipoServicioId();
    if (servicio !== null) this.form.controls.tipoServicioId.setValue(servicio);
  }

  protected cargarCatalogos(): void {
    this.estadoCatalogos.set('cargando');
    forkJoin({ tipos: this.api.tiposServicio(), talleres: this.api.talleres() }).subscribe({
      next: ({ tipos, talleres }) => {
        this.tipos.set(tipos);
        this.talleres.set(talleres);
        this.estadoCatalogos.set('listo');
      },
      error: (e) => {
        this.errorCatalogos.set(mensajeDeError(e));
        this.estadoCatalogos.set('error');
      },
    });
  }

  /** Consulta el historial del vehículo para conocer su último kilometraje de servicio. */
  private cargarReferencia(id: number | null): void {
    this.kmMinimo.set(null);
    this.form.controls.kilometraje.updateValueAndValidity();
    if (id === null) return;

    this.api.historial(id).subscribe({
      next: (historial) => {
        if (this.idSeleccionado() !== id) return;
        this.kmMinimo.set(historial.length ? Math.max(...historial.map((m) => m.kilometraje)) : null);
        const control = this.form.controls.kilometraje;
        // Sugiere el kilometraje actual del vehículo si todavía no se ha escrito nada.
        if (control.value === null) {
          const v = this.vehiculoSeleccionado();
          if (v) control.setValue(v.kilometrajeActual);
        }
        control.updateValueAndValidity();
      },
      error: () => this.kmMinimo.set(null),
    });
  }

  protected error(control: FormControl): string {
    const minimo = (control.errors?.['menorQueUltimo'] as { minimo: number } | undefined)?.minimo;
    return textoError(control, {
      futura: 'La fecha del mantenimiento no puede ser futura.',
      menorQueUltimo: `No puede ser menor al último servicio registrado (${formatKm(minimo)} km).`,
      pattern: 'Ingresa un valor numérico válido (costo con máximo 2 decimales).',
    });
  }

  protected guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.enviando()) return;

    const v = this.form.getRawValue();
    const cuerpo: MantenimientoRequest = {
      vehiculoId: v.vehiculoId as number,
      tipoServicioId: v.tipoServicioId as number,
      tallerId: v.tallerId as number,
      fecha: v.fecha,
      kilometraje: Number(v.kilometraje),
      costo: Number(v.costo),
    };

    this.enviando.set(true);
    this.errorServidor.set(null);
    this.api.registrarMantenimiento(cuerpo).subscribe({
      next: (registrado) => {
        this.enviando.set(false);
        this.toast.exito(`Mantenimiento registrado para ${registrado.placa}.`);
        this.store.refresh();
        this.guardado.emit(registrado);
        // Limpia lo propio del servicio y conserva el vehículo elegido.
        this.form.patchValue({ tipoServicioId: null, kilometraje: null, costo: null, fecha: hoyISO() });
        this.form.markAsUntouched();
        this.form.markAsPristine();
        this.cargarReferencia(registrado.vehiculoId);
      },
      error: (e) => {
        this.enviando.set(false);
        this.errorServidor.set(mensajeDeError(e));
      },
    });
  }
}

/** Ventana modal que contiene el formulario de mantenimiento. */
@Component({
  selector: 'app-mantenimiento-modal',
  imports: [Modal, MantenimientoForm],
  template: `
    <app-modal titulo="Registrar mantenimiento" etiqueta="Nuevo servicio" ancho (cerrar)="cerrar.emit()">
      <app-mantenimiento-form
        [vehiculoId]="vehiculoId()"
        [tipoServicioId]="tipoServicioId()"
        mostrarCancelar
        (cancelar)="cerrar.emit()"
        (guardado)="guardado.emit($event)"
      />
    </app-modal>
  `,
})
export class MantenimientoModal {
  readonly vehiculoId = input<number | null>(null);
  readonly tipoServicioId = input<number | null>(null);
  readonly guardado = output<Mantenimiento>();
  readonly cerrar = output<void>();
}
