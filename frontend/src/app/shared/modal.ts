import { DOCUMENT } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  booleanAttribute,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { Icon } from './icon';

let modalesAbiertos = 0;

/**
 * Ventana modal reutilizable (formularios, confirmaciones).
 * Se cierra con la X, con Escape o al pulsar el fondo; anima su apertura y su cierre.
 */
@Component({
  selector: 'app-modal',
  imports: [Icon],
  host: {
    '(document:keydown.escape)': 'solicitarCierre()',
    '[class.ancho]': 'ancho()',
  },
  template: `
    <div class="fondo" [class.saliendo]="saliendo()" (click)="solicitarCierre()"></div>
    <section class="ventana glass" [class.saliendo]="saliendo()" role="dialog" aria-modal="true" [attr.aria-label]="titulo()">
      <header>
        <div>
          @if (etiqueta()) {
            <p class="t-eyebrow">{{ etiqueta() }}</p>
          }
          <h2>{{ titulo() }}</h2>
        </div>
        <button type="button" class="btn-icon" aria-label="Cerrar" (click)="solicitarCierre()">
          <app-icon nombre="cerrar" />
        </button>
      </header>
      <div class="cuerpo">
        <ng-content />
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        position: fixed;
        inset: 0;
        z-index: 60;
        display: grid;
        place-items: center;
        padding: var(--sp-4);
      }
      .fondo {
        position: absolute;
        inset: 0;
        background: rgba(3, 8, 16, 0.72);
        backdrop-filter: blur(6px);
        animation: fade-in 0.25s var(--ease-out);
      }
      .fondo.saliendo {
        opacity: 0;
        transition: opacity 0.18s;
      }
      .ventana {
        position: relative;
        width: min(560px, 100%);
        max-height: calc(100dvh - 2rem);
        display: flex;
        flex-direction: column;
        background: linear-gradient(160deg, rgba(20, 36, 66, 0.96), rgba(10, 20, 36, 0.97));
        box-shadow: var(--sh-2);
        animation: pop-in 0.38s var(--ease-out);
      }
      :host(.ancho) .ventana {
        width: min(860px, 100%);
      }
      .ventana.saliendo {
        animation: pop-out 0.18s var(--ease-io) forwards;
      }
      header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--sp-4);
        padding: var(--sp-5) var(--sp-5) var(--sp-4);
        border-bottom: 1px solid var(--line);
      }
      h2 {
        margin-top: 4px;
        font-size: var(--fs-xl);
      }
      .cuerpo {
        padding: var(--sp-5);
        overflow-y: auto;
      }
    `,
  ],
})
export class Modal implements OnDestroy {
  readonly titulo = input.required<string>();
  readonly etiqueta = input('');
  readonly ancho = input(false, { transform: booleanAttribute });
  readonly cerrar = output<void>();

  protected readonly saliendo = signal(false);

  private readonly documento = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    modalesAbiertos++;
    this.documento.body.classList.add('modal-abierto');
    // Lleva el foco al primer campo del formulario.
    afterNextRender(() => {
      const primero = this.host.nativeElement.querySelector<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      );
      primero?.focus();
    });
  }

  solicitarCierre(): void {
    if (this.saliendo()) return;
    this.saliendo.set(true);
    setTimeout(() => this.cerrar.emit(), 180);
  }

  ngOnDestroy(): void {
    modalesAbiertos = Math.max(0, modalesAbiertos - 1);
    if (modalesAbiertos === 0) this.documento.body.classList.remove('modal-abierto');
  }
}
