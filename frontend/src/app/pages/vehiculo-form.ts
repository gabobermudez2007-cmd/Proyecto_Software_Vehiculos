import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiService } from '../core/api.service';
import { mensajeDeError } from '../core/errors';
import { esInvalido, textoError } from '../core/form-utils';
import { TipoVehiculo, Vehiculo, VehiculoRequest } from '../core/models';
import { ToastService } from '../core/toast.service';
import { TIPOS } from '../core/vehicle-meta';
import { Icon } from '../shared/icon';
import { Modal } from '../shared/modal';
import { VehicleThumb } from '../shared/vehicle-thumb';

/** Formulario (en ventana modal) para registrar o editar un vehículo. */
@Component({
  selector: 'app-vehiculo-form',
  imports: [ReactiveFormsModule, Modal, Icon, VehicleThumb],
  template: `
    <app-modal
      [titulo]="vehiculo() ? 'Editar vehículo' : 'Nuevo vehículo'"
      [etiqueta]="vehiculo() ? vehiculo()!.placa : 'Registro de flota'"
      (cerrar)="cerrar.emit()"
    >
      <form [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        @if (errorServidor()) {
          <div class="form-banner" role="alert">
            <app-icon nombre="aviso" />
            <span>{{ errorServidor() }}</span>
          </div>
        }

        <div class="form-grid">
          <div class="field full">
            <span class="label" id="vf-tipo-label">Tipo de vehículo</span>
            <div class="tipos" role="radiogroup" aria-labelledby="vf-tipo-label">
              @for (t of tipos; track t.valor) {
                <button
                  type="button"
                  class="tipo"
                  role="radio"
                  [attr.aria-checked]="form.controls.tipo.value === t.valor"
                  [class.activo]="form.controls.tipo.value === t.valor"
                  (click)="elegirTipo(t.valor)"
                >
                  <app-vehicle-thumb [tipo]="t.valor" />
                  <span>{{ t.etiqueta }}</span>
                </button>
              }
            </div>
            @if (esInvalido(form.controls.tipo)) {
              <span class="field-error">Selecciona un tipo de vehículo.</span>
            }
          </div>

          <div class="field">
            <label for="vf-placa">Placa</label>
            <input
              id="vf-placa"
              class="input mono"
              formControlName="placa"
              maxlength="6"
              placeholder="ABC123"
              autocomplete="off"
              [class.invalido]="esInvalido(form.controls.placa)"
              (input)="mayusculas()"
            />
            @if (esInvalido(form.controls.placa)) {
              <span class="field-error">{{ error(form.controls.placa, 'Formato inválido: usa ABC123 o ABC12D.') }}</span>
            } @else {
              <span class="hint">Tres letras, dos dígitos y un dígito o letra.</span>
            }
          </div>

          <div class="field">
            <label for="vf-km">Kilometraje actual</label>
            <input
              id="vf-km"
              class="input mono"
              type="number"
              inputmode="numeric"
              min="0"
              formControlName="kilometrajeActual"
              placeholder="0"
              [class.invalido]="esInvalido(form.controls.kilometrajeActual)"
            />
            @if (esInvalido(form.controls.kilometrajeActual)) {
              <span class="field-error">{{ error(form.controls.kilometrajeActual, 'Ingresa un número entero.') }}</span>
            }
          </div>

          <div class="field">
            <label for="vf-marca">Marca</label>
            <input
              id="vf-marca"
              class="input"
              formControlName="marca"
              maxlength="50"
              autocomplete="off"
              [class.invalido]="esInvalido(form.controls.marca)"
            />
            @if (esInvalido(form.controls.marca)) {
              <span class="field-error">{{ error(form.controls.marca) }}</span>
            }
          </div>

          <div class="field">
            <label for="vf-modelo">Modelo</label>
            <input
              id="vf-modelo"
              class="input"
              formControlName="modelo"
              maxlength="50"
              autocomplete="off"
              [class.invalido]="esInvalido(form.controls.modelo)"
            />
            @if (esInvalido(form.controls.modelo)) {
              <span class="field-error">{{ error(form.controls.modelo) }}</span>
            }
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-ghost" (click)="cerrar.emit()">Cancelar</button>
          <button type="submit" class="btn btn-primary" [disabled]="enviando()">
            <app-icon nombre="ok" />
            {{ enviando() ? 'Guardando…' : vehiculo() ? 'Guardar cambios' : 'Registrar vehículo' }}
          </button>
        </div>
      </form>
    </app-modal>
  `,
  styles: [
    `
      .tipos {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
        gap: var(--sp-2);
      }
      .tipo {
        display: grid;
        gap: 2px;
        padding: var(--sp-2) var(--sp-2) var(--sp-2);
        border: 1px solid var(--line);
        border-radius: var(--r-md);
        background: rgba(7, 17, 31, 0.5);
        color: var(--tx-300);
        font-size: var(--fs-xs);
        font-weight: 700;
        letter-spacing: 0.04em;
        cursor: pointer;
        transition: border-color var(--t-fast), background var(--t-med), transform var(--t-fast), box-shadow var(--t-med);
      }
      .tipo:hover {
        border-color: var(--line-strong);
        transform: translateY(-2px);
      }
      .tipo.activo {
        color: var(--tx-100);
        border-color: var(--cyan-400);
        background: linear-gradient(160deg, rgba(7, 91, 206, 0.35), rgba(0, 200, 232, 0.08));
        box-shadow: var(--glow-cyan);
      }
    `,
  ],
})
export class VehiculoForm implements OnInit {
  /** Vehículo a editar; si es nulo, el formulario registra uno nuevo. */
  readonly vehiculo = input<Vehiculo | null>(null);
  readonly guardado = output<Vehiculo>();
  readonly cerrar = output<void>();

  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  protected readonly tipos = TIPOS;
  protected readonly enviando = signal(false);
  protected readonly errorServidor = signal<string | null>(null);
  protected readonly esInvalido = esInvalido;

  protected readonly form = new FormGroup({
    placa: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[A-Za-z]{3}\d{2}[A-Za-z0-9]$/)],
    }),
    tipo: new FormControl<TipoVehiculo | null>(null, Validators.required),
    marca: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(50)] }),
    modelo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(50)] }),
    kilometrajeActual: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.pattern(/^\d+$/),
    ]),
  });

  ngOnInit(): void {
    const v = this.vehiculo();
    if (v) {
      this.form.patchValue({
        placa: v.placa,
        tipo: v.tipo,
        marca: v.marca,
        modelo: v.modelo,
        kilometrajeActual: v.kilometrajeActual,
      });
    }
  }

  protected elegirTipo(tipo: TipoVehiculo): void {
    this.form.controls.tipo.setValue(tipo);
    this.form.controls.tipo.markAsTouched();
  }

  protected mayusculas(): void {
    const control = this.form.controls.placa;
    control.setValue(control.value.toUpperCase(), { emitEvent: false });
  }

  protected error(control: FormControl, patron = 'Valor inválido.'): string {
    return textoError(control, { pattern: patron });
  }

  protected guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.enviando()) return;

    const v = this.form.getRawValue();
    const cuerpo: VehiculoRequest = {
      placa: v.placa.trim().toUpperCase(),
      tipo: v.tipo as TipoVehiculo,
      marca: v.marca.trim(),
      modelo: v.modelo.trim(),
      kilometrajeActual: Number(v.kilometrajeActual),
    };

    const editando = this.vehiculo();
    const peticion = editando ? this.api.actualizarVehiculo(editando.id, cuerpo) : this.api.crearVehiculo(cuerpo);

    this.enviando.set(true);
    this.errorServidor.set(null);
    peticion.subscribe({
      next: (resultado) => {
        this.toast.exito(
          editando ? `Vehículo ${resultado.placa} actualizado.` : `Vehículo ${resultado.placa} registrado correctamente.`,
        );
        this.guardado.emit(resultado);
      },
      error: (e) => {
        this.enviando.set(false);
        this.errorServidor.set(mensajeDeError(e));
      },
    });
  }
}
