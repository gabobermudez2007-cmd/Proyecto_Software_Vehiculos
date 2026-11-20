import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiService } from '../core/api.service';
import { ConfirmService } from '../core/confirm.service';
import { mensajeDeError } from '../core/errors';
import { FleetStore } from '../core/fleet.store';
import { esInvalido, textoError } from '../core/form-utils';
import { KmPipe } from '../core/formatters';
import { TipoServicio } from '../core/models';
import { ToastService } from '../core/toast.service';
import { Icon } from '../shared/icon';
import { Modal } from '../shared/modal';
import { StateView } from '../shared/state-view';

/** Ventana para agregar o editar un tipo de servicio. */
@Component({
  selector: 'app-servicio-form',
  imports: [ReactiveFormsModule, Modal, Icon],
  template: `
    <app-modal [titulo]="servicio() ? 'Editar servicio' : 'Nuevo tipo de servicio'" [etiqueta]="servicio() ? servicio()!.nombre : 'Catálogo de servicios'" (cerrar)="cerrar.emit()">
      <form [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        @if (errorServidor()) {
          <div class="form-banner" role="alert">
            <app-icon nombre="aviso" />
            <span>{{ errorServidor() }}</span>
          </div>
        }
        <div class="form-grid">
          <div class="field full">
            <label for="sf-nombre">Nombre del servicio</label>
            <input id="sf-nombre" class="input" formControlName="nombre" maxlength="80" autocomplete="off" [class.invalido]="esInvalido(form.controls.nombre)" />
            @if (esInvalido(form.controls.nombre)) {
              <span class="field-error">{{ error(form.controls.nombre) }}</span>
            }
          </div>
          <div class="field">
            <label for="sf-km">Se repite cada (km)</label>
            <input
              id="sf-km"
              class="input mono"
              type="number"
              inputmode="numeric"
              min="1"
              formControlName="intervaloKm"
              [class.invalido]="esInvalido(form.controls.intervaloKm)"
            />
            @if (esInvalido(form.controls.intervaloKm)) {
              <span class="field-error">{{ error(form.controls.intervaloKm, 'Ingresa un número entero mayor a cero.') }}</span>
            }
          </div>
          <div class="field">
            <label for="sf-meses">Se repite cada (meses)</label>
            <input
              id="sf-meses"
              class="input mono"
              type="number"
              inputmode="numeric"
              min="1"
              formControlName="intervaloMeses"
              [class.invalido]="esInvalido(form.controls.intervaloMeses)"
            />
            @if (esInvalido(form.controls.intervaloMeses)) {
              <span class="field-error">{{ error(form.controls.intervaloMeses, 'Ingresa un número entero mayor a cero.') }}</span>
            }
          </div>
          <p class="full nota">
            <app-icon nombre="info" />
            El servicio vence cuando se cumple primero el kilometraje o el tiempo. Estos intervalos generan las alertas de mantenimiento.
          </p>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" (click)="cerrar.emit()">Cancelar</button>
          <button type="submit" class="btn btn-primary" [disabled]="enviando()">
            <app-icon nombre="ok" /> {{ enviando() ? 'Guardando…' : servicio() ? 'Guardar cambios' : 'Agregar servicio' }}
          </button>
        </div>
      </form>
    </app-modal>
  `,
  styles: [
    `
      .nota {
        display: flex;
        gap: var(--sp-2);
        align-items: flex-start;
        font-size: var(--fs-xs);
        color: var(--tx-300);
      }
      .nota app-icon {
        flex: none;
        color: var(--cyan-400);
      }
    `,
  ],
})
export class ServicioForm implements OnInit {
  readonly servicio = input<TipoServicio | null>(null);
  readonly guardado = output<TipoServicio>();
  readonly cerrar = output<void>();

  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  protected readonly enviando = signal(false);
  protected readonly errorServidor = signal<string | null>(null);
  protected readonly esInvalido = esInvalido;

  protected readonly form = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(80)] }),
    intervaloKm: new FormControl<number | null>(null, [Validators.required, Validators.min(1), Validators.max(1000000), Validators.pattern(/^\d+$/)]),
    intervaloMeses: new FormControl<number | null>(null, [Validators.required, Validators.min(1), Validators.max(240), Validators.pattern(/^\d+$/)]),
  });

  ngOnInit(): void {
    const s = this.servicio();
    if (s) this.form.patchValue({ nombre: s.nombre, intervaloKm: s.intervaloKm, intervaloMeses: s.intervaloMeses });
  }

  protected error(control: FormControl, patron = 'Valor inválido.'): string {
    const errores = control.errors;
    if (errores?.['min']) return 'Debe ser mayor a cero.';
    if (errores?.['max']) return `No puede superar ${(errores['max'] as { max: number }).max.toLocaleString('es-CO')}.`;
    return textoError(control, { pattern: patron });
  }

  protected guardar(): void {
    this.form.markAllAsTouched();
    const v = this.form.getRawValue();
    if (!v.nombre.trim()) this.form.controls.nombre.setErrors({ required: true });
    if (this.form.invalid || this.enviando()) return;

    const cuerpo = { nombre: v.nombre.trim(), intervaloKm: Number(v.intervaloKm), intervaloMeses: Number(v.intervaloMeses) };
    const editando = this.servicio();
    const peticion = editando ? this.api.actualizarTipoServicio(editando.id, cuerpo) : this.api.crearTipoServicio(cuerpo);

    this.enviando.set(true);
    this.errorServidor.set(null);
    peticion.subscribe({
      next: (resultado) => {
        this.toast.exito(editando ? `Servicio ${resultado.nombre} actualizado.` : `Servicio ${resultado.nombre} agregado.`);
        this.guardado.emit(resultado);
      },
      error: (e) => {
        this.enviando.set(false);
        this.errorServidor.set(mensajeDeError(e));
      },
    });
  }
}

/** Sección "Tipos de servicio" de Gestión: agregar, editar y eliminar servicios del catálogo. */
@Component({
  selector: 'app-gestion-servicios',
  imports: [Icon, StateView, KmPipe, ServicioForm],
  template: `
    <section class="glass panel reveal" [style.--i]="2" aria-label="Tipos de servicio">
      <div class="panel-title">
        <h3>Tipos de servicio @if (lista() !== null) { <span class="cuenta t-data">{{ lista()!.length }}</span> }</h3>
        <button type="button" class="btn btn-primary" (click)="abrirNuevo()"><app-icon nombre="mas" /> Nuevo servicio</button>
      </div>

      @if (error()) {
        <app-state-view tipo="error" [mensaje]="error()!" (reintentar)="cargar()" />
      } @else if (lista() === null) {
        <app-state-view tipo="cargando" [filas]="[1, 2, 3]" [alto]="52" />
      } @else if (lista()!.length === 0) {
        <app-state-view tipo="vacio" icono="calendario" titulo="Aún no hay servicios" mensaje="Agrega el primer tipo de servicio para poder registrar mantenimientos." />
      } @else {
        <div class="tabla-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Servicio</th>
                <th class="num">Cada (km)</th>
                <th class="num">Cada (meses)</th>
                <th class="acc"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (s of lista()!; track s.id) {
                <tr>
                  <td class="nombre">{{ s.nombre }}</td>
                  <td class="num t-data">{{ s.intervaloKm | km }} km</td>
                  <td class="num t-data">{{ s.intervaloMeses }} {{ s.intervaloMeses === 1 ? 'mes' : 'meses' }}</td>
                  <td class="acc">
                    <button type="button" class="btn-icon" [attr.aria-label]="'Editar ' + s.nombre" title="Editar" (click)="editar(s)">
                      <app-icon nombre="editar" />
                    </button>
                    <button
                      type="button"
                      class="btn-icon peligro"
                      [attr.aria-label]="'Eliminar ' + s.nombre"
                      title="Eliminar"
                      [disabled]="eliminando() === s.id"
                      (click)="eliminar(s)"
                    >
                      <app-icon nombre="papelera" />
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>

    @if (formularioAbierto()) {
      <app-servicio-form [servicio]="editando()" (guardado)="alGuardar()" (cerrar)="cerrarFormulario()" />
    }
  `,
  styles: [
    `
      .cuenta {
        margin-left: 6px;
        padding: 1px 8px;
        border: 1px solid var(--line-strong);
        border-radius: var(--r-pill);
        font-size: var(--fs-xs);
        color: var(--tx-300);
      }
      .tabla-wrap {
        overflow-x: auto;
      }
      .nombre {
        font-weight: 600;
        color: var(--tx-100);
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
export class GestionServicios {
  private readonly api = inject(ApiService);
  private readonly store = inject(FleetStore);
  private readonly confirmacion = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly lista = signal<TipoServicio[] | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly formularioAbierto = signal(false);
  protected readonly editando = signal<TipoServicio | null>(null);
  protected readonly eliminando = signal<number | null>(null);

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.error.set(null);
    this.api.tiposServicio().subscribe({
      next: (lista) => this.lista.set(lista),
      error: (e) => this.error.set(mensajeDeError(e)),
    });
  }

  protected abrirNuevo(): void {
    this.editando.set(null);
    this.formularioAbierto.set(true);
  }

  protected editar(s: TipoServicio): void {
    this.editando.set(s);
    this.formularioAbierto.set(true);
  }

  protected cerrarFormulario(): void {
    this.formularioAbierto.set(false);
    this.editando.set(null);
  }

  protected alGuardar(): void {
    this.cerrarFormulario();
    this.cargar();
    // Los intervalos cambian cuándo vence cada servicio, así que se refrescan las alertas.
    this.store.refresh();
  }

  protected async eliminar(s: TipoServicio): Promise<void> {
    const aceptado = await this.confirmacion.confirmar({
      titulo: 'Eliminar tipo de servicio',
      mensaje: `Se eliminará el servicio "${s.nombre}". Solo es posible si no tiene mantenimientos registrados.`,
      confirmar: 'Eliminar',
      peligro: true,
    });
    if (!aceptado) return;

    this.eliminando.set(s.id);
    this.api.eliminarTipoServicio(s.id).subscribe({
      next: () => {
        this.eliminando.set(null);
        this.toast.exito(`Servicio ${s.nombre} eliminado.`);
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
