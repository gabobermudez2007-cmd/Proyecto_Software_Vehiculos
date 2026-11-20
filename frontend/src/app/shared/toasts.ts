import { Component, inject } from '@angular/core';

import { ToastService } from '../core/toast.service';
import { Icon } from './icon';

/** Contenedor de notificaciones (se monta una sola vez en la raíz). */
@Component({
  selector: 'app-toasts',
  imports: [Icon],
  template: `
    <div class="pila" aria-live="polite" role="status">
      @for (t of servicio.toasts(); track t.id) {
        <div class="toast glass" [class]="t.tipo">
          <app-icon [nombre]="t.tipo === 'exito' ? 'ok' : t.tipo === 'error' ? 'aviso' : 'info'" />
          <p>{{ t.mensaje }}</p>
          <button type="button" class="btn-icon" aria-label="Cerrar notificación" (click)="servicio.cerrar(t.id)">
            <app-icon nombre="cerrar" />
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .pila {
        position: fixed;
        right: var(--sp-5);
        bottom: var(--sp-5);
        z-index: 80;
        display: grid;
        gap: var(--sp-3);
        width: min(380px, calc(100vw - 2rem));
      }
      .toast {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: var(--sp-3);
        padding: var(--sp-3) var(--sp-3) var(--sp-3) var(--sp-4);
        background: rgba(13, 26, 46, 0.92);
        animation: pop-in 0.4s var(--ease-out);
        font-size: var(--fs-sm);
      }
      .toast > app-icon {
        font-size: 1.4rem;
      }
      .toast.exito {
        border-color: rgba(47, 211, 139, 0.5);
      }
      .toast.exito > app-icon {
        color: var(--ok);
      }
      .toast.error {
        border-color: rgba(255, 92, 108, 0.55);
      }
      .toast.error > app-icon {
        color: var(--danger);
      }
      .toast.info > app-icon {
        color: var(--cyan-400);
      }
      @media (max-width: 720px) {
        .pila {
          bottom: 84px;
        }
      }
    `,
  ],
})
export class Toasts {
  protected readonly servicio = inject(ToastService);
}
