import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiService } from '../core/api.service';
import { ConfirmService } from '../core/confirm.service';
import { mensajeDeError } from '../core/errors';
import { esInvalido, textoError } from '../core/form-utils';
import { Taller } from '../core/models';
import { ToastService } from '../core/toast.service';
import { Icon } from '../shared/icon';
import { Modal } from '../shared/modal';
import { StateView } from '../shared/state-view';

/** Ventana para agregar o editar un taller. */
@Component({
  selector: 'app-taller-form',
  imports: [ReactiveFormsModule, Modal, Icon],
  template: `
    <app-modal [titulo]="taller() ? 'Editar taller' : 'Nuevo taller'" [etiqueta]="taller() ? taller()!.nombre : 'Catálogo de talleres'" (cerrar)="cerrar.emit()">
      <form [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        @if (errorServidor()) {
          <div class="form-banner" role="alert">
            <app-icon nombre="aviso" />
            <span>{{ errorServidor() }}</span>
          </div>
        }
        <div class="form-grid">
          <div class="field full">
            <label for="tf-nombre">Nombre del taller</label>
            <input id="tf-nombre" class="input" formControlName="nombre" maxlength="100" autocomplete="off" [class.invalido]="esInvalido(form.controls.nombre)" />
            @if (esInvalido(form.controls.nombre)) {
              <span class="field-error">{{ error(form.controls.nombre) }}</span>
            }
          </div>
          <div class="field full">
            <label for="tf-telefono">Teléfono (opcional)</label>
            <input
              id="tf-telefono"
              class="input mono"
              formControlName="telefono"
              maxlength="20"
              inputmode="tel"
              autocomplete="off"
              [class.invalido]="esInvalido(form.controls.telefono)"
            />
            @if (esInvalido(form.controls.telefono)) {
              <span class="field-error">{{ error(form.controls.telefono, 'Solo números, espacios y los símbolos + - ( ).') }}</span>
            } @else {
              <span class="hint">Por ejemplo: 601 555 0101</span>
            }
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" (click)="cerrar.emit()">Cancelar</button>
          <button type="submit" class="btn btn-primary" [disabled]="enviando()">
            <app-icon nombre="ok" /> {{ enviando() ? 'Guardando…' : taller() ? 'Guardar cambios' : 'Agregar taller' }}
          </button>
        </div>
      </form>
    </app-modal>
  `,
})
export class TallerForm implements OnInit {
  readonly taller = input<Taller | null>(null);
  readonly guardado = output<Taller>();
  readonly cerrar = output<void>();

  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  protected readonly enviando = signal(false);
  protected readonly errorServidor = signal<string | null>(null);
  protected readonly esInvalido = esInvalido;

  protected readonly form = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    telefono: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(20), Validators.pattern(/^[0-9+\-() ]*$/)] }),
  });

  ngOnInit(): void {
    const t = this.taller();
    if (t) this.form.patchValue({ nombre: t.nombre, telefono: t.telefono ?? '' });
  }

  protected error(control: FormControl, patron = 'Valor inválido.'): string {
    return textoError(control, { pattern: patron });
  }

  protected guardar(): void {
    this.form.markAllAsTouched();
    const v = this.form.getRawValue();
    if (this.form.invalid || !v.nombre.trim() || this.enviando()) {
      if (!v.nombre.trim()) this.form.controls.nombre.setErrors({ required: true });
      return;
    }

    const cuerpo = { nombre: v.nombre.trim(), telefono: v.telefono.trim() || null };
    const editando = this.taller();
    const peticion = editando ? this.api.actualizarTaller(editando.id, cuerpo) : this.api.crearTaller(cuerpo);

    this.enviando.set(true);
    this.errorServidor.set(null);
    peticion.subscribe({
      next: (resultado) => {
        this.toast.exito(editando ? `Taller ${resultado.nombre} actualizado.` : `Taller ${resultado.nombre} agregado.`);
        this.guardado.emit(resultado);
      },
      error: (e) => {
        this.enviando.set(false);
        this.errorServidor.set(mensajeDeError(e));
      },
    });
  }
}

/** Sección "Talleres" de Gestión: agregar, editar y eliminar talleres. */
@Component({
  selector: 'app-gestion-talleres',
  imports: [Icon, StateView, TallerForm],
  template: `
    <section class="glass panel reveal" [style.--i]="2" aria-label="Talleres">
      <div class="panel-title">
        <h3>Talleres registrados @if (lista() !== null) { <span class="cuenta t-data">{{ lista()!.length }}</span> }</h3>
        <button type="button" class="btn btn-primary" (click)="abrirNuevo()"><app-icon nombre="mas" /> Nuevo taller</button>
      </div>

      @if (error()) {
        <app-state-view tipo="error" [mensaje]="error()!" (reintentar)="cargar()" />
      } @else if (lista() === null) {
        <app-state-view tipo="cargando" [filas]="[1, 2]" [alto]="52" />
      } @else if (lista()!.length === 0) {
        <app-state-view tipo="vacio" icono="taller" titulo="Aún no hay talleres" mensaje="Agrega el primer taller para poder registrar mantenimientos." />
      } @else {
        <div class="tabla-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Taller</th>
                <th>Teléfono</th>
                <th class="acc"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (t of lista()!; track t.id) {
                <tr>
                  <td class="nombre">{{ t.nombre }}</td>
                  <td class="t-data">{{ t.telefono || '—' }}</td>
                  <td class="acc">
                    <button type="button" class="btn-icon" [attr.aria-label]="'Editar ' + t.nombre" title="Editar" (click)="editar(t)">
                      <app-icon nombre="editar" />
                    </button>
                    <button
                      type="button"
                      class="btn-icon peligro"
                      [attr.aria-label]="'Eliminar ' + t.nombre"
                      title="Eliminar"
                      [disabled]="eliminando() === t.id"
                      (click)="eliminar(t)"
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
      <app-taller-form [taller]="editando()" (guardado)="alGuardar()" (cerrar)="cerrarFormulario()" />
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
export class GestionTalleres {
  private readonly api = inject(ApiService);
  private readonly confirmacion = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly lista = signal<Taller[] | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly formularioAbierto = signal(false);
  protected readonly editando = signal<Taller | null>(null);
  protected readonly eliminando = signal<number | null>(null);

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.error.set(null);
    this.api.talleres().subscribe({
      next: (lista) => this.lista.set(lista),
      error: (e) => this.error.set(mensajeDeError(e)),
    });
  }

  protected abrirNuevo(): void {
    this.editando.set(null);
    this.formularioAbierto.set(true);
  }

  protected editar(t: Taller): void {
    this.editando.set(t);
    this.formularioAbierto.set(true);
  }

  protected cerrarFormulario(): void {
    this.formularioAbierto.set(false);
    this.editando.set(null);
  }

  protected alGuardar(): void {
    this.cerrarFormulario();
    this.cargar();
  }

  protected async eliminar(t: Taller): Promise<void> {
    const aceptado = await this.confirmacion.confirmar({
      titulo: 'Eliminar taller',
      mensaje: `Se eliminará el taller "${t.nombre}". Solo es posible si no tiene mantenimientos registrados.`,
      confirmar: 'Eliminar',
      peligro: true,
    });
    if (!aceptado) return;

    this.eliminando.set(t.id);
    this.api.eliminarTaller(t.id).subscribe({
      next: () => {
        this.eliminando.set(null);
        this.toast.exito(`Taller ${t.nombre} eliminado.`);
        this.cargar();
      },
      error: (e) => {
        this.eliminando.set(null);
        this.toast.error(mensajeDeError(e));
      },
    });
  }
}
