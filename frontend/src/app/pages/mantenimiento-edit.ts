import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { ApiService } from '../core/api.service';
import { mensajeDeError } from '../core/errors';
import { esInvalido, textoError } from '../core/form-utils';
import { formatKm, hoyISO } from '../core/formatters';
import { Mantenimiento, MantenimientoRequest, Taller, TipoServicio } from '../core/models';
import { ToastService } from '../core/toast.service';
import { Icon } from '../shared/icon';
import { Modal } from '../shared/modal';
import { StateView } from '../shared/state-view';

function fechaNoFutura(control: AbstractControl): ValidationErrors | null {
  return control.value && control.value > hoyISO() ? { futura: true } : null;
}

/**
 * Ventana para corregir un mantenimiento ya registrado.
 * El vehículo no se puede cambiar (si se registró en el equivocado, se elimina y se registra de nuevo).
 * El kilometraje debe quedar entre el del servicio anterior y el del siguiente del mismo vehículo.
 */
@Component({
  selector: 'app-mantenimiento-edit',
  imports: [ReactiveFormsModule, Modal, Icon, StateView],
  template: `
    <app-modal titulo="Editar mantenimiento" [etiqueta]="mantenimiento().placa" ancho (cerrar)="cerrar.emit()">
      @if (estado() === 'cargando') {
        <app-state-view tipo="cargando" [filas]="[1, 2, 3]" [alto]="48" />
      } @else if (estado() === 'error') {
        <app-state-view tipo="error" [mensaje]="errorCatalogos()" (reintentar)="cargarCatalogos()" />
      } @else {
        <form [formGroup]="form" (ngSubmit)="guardar()" novalidate>
          @if (errorServidor()) {
            <div class="form-banner" role="alert">
              <app-icon nombre="aviso" />
              <span>{{ errorServidor() }}</span>
            </div>
          }

          <div class="form-grid">
            <div class="field">
              <label for="me-servicio">Tipo de servicio</label>
              <select id="me-servicio" class="select" formControlName="tipoServicioId" [class.invalido]="esInvalido(form.controls.tipoServicioId)">
                <option [ngValue]="null" disabled>Selecciona…</option>
                @for (t of tipos(); track t.id) {
                  <option [ngValue]="t.id">{{ t.nombre }}</option>
                }
              </select>
              @if (esInvalido(form.controls.tipoServicioId)) {
                <span class="field-error">Selecciona el tipo de servicio.</span>
              }
            </div>

            <div class="field">
              <label for="me-taller">Taller</label>
              <select id="me-taller" class="select" formControlName="tallerId" [class.invalido]="esInvalido(form.controls.tallerId)">
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
              <label for="me-fecha">Fecha del servicio</label>
              <input id="me-fecha" class="input" type="date" formControlName="fecha" [max]="hoy" [class.invalido]="esInvalido(form.controls.fecha)" />
              @if (esInvalido(form.controls.fecha)) {
                <span class="field-error">{{ error(form.controls.fecha) }}</span>
              }
            </div>

            <div class="field">
              <label for="me-km">Kilometraje del servicio</label>
              <input
                id="me-km"
                class="input mono"
                type="number"
                inputmode="numeric"
                min="0"
                formControlName="kilometraje"
                [class.invalido]="esInvalido(form.controls.kilometraje)"
              />
              @if (esInvalido(form.controls.kilometraje)) {
                <span class="field-error">{{ error(form.controls.kilometraje) }}</span>
              } @else {
                <span class="hint">{{ rangoKm() }}</span>
              }
            </div>

            <div class="field full">
              <label for="me-costo">Costo (COP)</label>
              <input
                id="me-costo"
                class="input mono"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.01"
                formControlName="costo"
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
            <button type="button" class="btn btn-ghost" (click)="cerrar.emit()">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="enviando()">
              <app-icon nombre="ok" /> {{ enviando() ? 'Guardando…' : 'Guardar cambios' }}
            </button>
          </div>
        </form>
      }
    </app-modal>
  `,
})
export class MantenimientoEdit implements OnInit {
  readonly mantenimiento = input.required<Mantenimiento>();
  /** Kilometraje del servicio anterior del mismo vehículo (null si es el primero). */
  readonly minimo = input<number | null>(null);
  /** Kilometraje del servicio siguiente del mismo vehículo (null si es el último). */
  readonly maximo = input<number | null>(null);

  readonly guardado = output<Mantenimiento>();
  readonly cerrar = output<void>();

  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  protected readonly tipos = signal<TipoServicio[]>([]);
  protected readonly talleres = signal<Taller[]>([]);
  protected readonly estado = signal<'cargando' | 'listo' | 'error'>('cargando');
  protected readonly errorCatalogos = signal('');
  protected readonly enviando = signal(false);
  protected readonly errorServidor = signal<string | null>(null);

  protected readonly hoy = hoyISO();
  protected readonly esInvalido = esInvalido;

  protected readonly form = new FormGroup({
    tipoServicioId: new FormControl<number | null>(null, Validators.required),
    tallerId: new FormControl<number | null>(null, Validators.required),
    fecha: new FormControl('', { nonNullable: true, validators: [Validators.required, fechaNoFutura] }),
    kilometraje: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.pattern(/^\d+$/),
      (c: AbstractControl): ValidationErrors | null => {
        const valor = c.value as number | null;
        if (valor === null || valor === undefined) return null;
        const minimo = this.minimo();
        const maximo = this.maximo();
        if (minimo !== null && valor < minimo) return { fueraDeRango: true };
        if (maximo !== null && valor > maximo) return { fueraDeRango: true };
        return null;
      },
    ]),
    costo: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.max(9999999999.99),
      Validators.pattern(/^\d+(\.\d{1,2})?$/),
    ]),
  });

  ngOnInit(): void {
    const m = this.mantenimiento();
    this.form.patchValue({
      tipoServicioId: m.tipoServicioId,
      tallerId: m.tallerId,
      fecha: m.fecha,
      kilometraje: m.kilometraje,
      costo: m.costo,
    });
    this.cargarCatalogos();
  }

  protected cargarCatalogos(): void {
    this.estado.set('cargando');
    forkJoin({ tipos: this.api.tiposServicio(), talleres: this.api.talleres() }).subscribe({
      next: ({ tipos, talleres }) => {
        this.tipos.set(tipos);
        this.talleres.set(talleres);
        this.estado.set('listo');
      },
      error: (e) => {
        this.errorCatalogos.set(mensajeDeError(e));
        this.estado.set('error');
      },
    });
  }

  /** Texto de ayuda con los límites del kilometraje. */
  protected rangoKm(): string {
    const minimo = this.minimo();
    const maximo = this.maximo();
    if (minimo !== null && maximo !== null) return `Debe estar entre ${formatKm(minimo)} y ${formatKm(maximo)} km.`;
    if (minimo !== null) return `No puede ser menor a ${formatKm(minimo)} km (servicio anterior).`;
    if (maximo !== null) return `No puede ser mayor a ${formatKm(maximo)} km (servicio siguiente).`;
    return 'Sin límites: es el único servicio de este vehículo.';
  }

  protected error(control: FormControl): string {
    return textoError(control, {
      futura: 'La fecha del mantenimiento no puede ser futura.',
      fueraDeRango: this.rangoKm(),
      pattern: 'Ingresa un valor numérico válido (costo con máximo 2 decimales).',
    });
  }

  protected guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.enviando()) return;

    const original = this.mantenimiento();
    const v = this.form.getRawValue();
    const cuerpo: MantenimientoRequest = {
      vehiculoId: original.vehiculoId,
      tipoServicioId: v.tipoServicioId as number,
      tallerId: v.tallerId as number,
      fecha: v.fecha,
      kilometraje: Number(v.kilometraje),
      costo: Number(v.costo),
    };

    this.enviando.set(true);
    this.errorServidor.set(null);
    this.api.actualizarMantenimiento(original.id, cuerpo).subscribe({
      next: (actualizado) => {
        this.toast.exito(`Mantenimiento de ${actualizado.placa} actualizado.`);
        this.guardado.emit(actualizado);
      },
      error: (e) => {
        this.enviando.set(false);
        this.errorServidor.set(mensajeDeError(e));
      },
    });
  }
}
