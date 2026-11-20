import { Component, inject } from '@angular/core';

import { ConfirmService } from '../core/confirm.service';
import { Icon } from './icon';
import { Modal } from './modal';

/** Muestra el diálogo de confirmación solicitado a través de ConfirmService. */
@Component({
  selector: 'app-confirm-dialog',
  imports: [Modal, Icon],
  template: `
    @if (servicio.actual(); as c) {
      <app-modal [titulo]="c.titulo" etiqueta="Confirmación" (cerrar)="servicio.responder(false)">
        <div class="mensaje">
          <app-icon [nombre]="c.peligro ? 'aviso' : 'info'" [class.peligro]="c.peligro" />
          <p>{{ c.mensaje }}</p>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" (click)="servicio.responder(false)">
            {{ c.cancelar ?? 'Cancelar' }}
          </button>
          <button type="button" class="btn" [class.btn-danger]="c.peligro" [class.btn-primary]="!c.peligro" (click)="servicio.responder(true)">
            {{ c.confirmar ?? 'Confirmar' }}
          </button>
        </div>
      </app-modal>
    }
  `,
  styles: [
    `
      .mensaje {
        display: flex;
        gap: var(--sp-4);
        align-items: flex-start;
        color: var(--tx-200);
        line-height: 1.6;
      }
      .mensaje app-icon {
        font-size: 1.8rem;
        color: var(--cyan-400);
      }
      .mensaje app-icon.peligro {
        color: var(--danger);
      }
    `,
  ],
})
export class ConfirmDialog {
  protected readonly servicio = inject(ConfirmService);
}
