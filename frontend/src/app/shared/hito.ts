import { Component, booleanAttribute, computed, input } from '@angular/core';

import { CopPipe, KmPipe, parseFecha } from '../core/formatters';
import { Mantenimiento } from '../core/models';
import { Icon } from './icon';

/** Un servicio dentro de la línea de tiempo del historial. Va dentro de un <li class="timeline-item">. */
@Component({
  selector: 'app-hito',
  imports: [Icon, KmPipe, CopPipe],
  template: `
    <div class="hito glass" [class.compacto]="compacto()">
      <div class="fecha">
        <b class="t-data">{{ dia() }}</b>
        <span>{{ mesAnio() }}</span>
      </div>
      <div class="info">
        <h4>{{ mantenimiento().tipoServicio }}</h4>
        <p><app-icon nombre="taller" /> {{ mantenimiento().taller }}</p>
      </div>
      <div class="cifras">
        <span class="t-data"><small>Km</small> {{ mantenimiento().kilometraje | km }}</span>
        <span class="t-data costo"><small>Costo</small> {{ mantenimiento().costo | cop }}</span>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .hito {
        display: grid;
        grid-template-columns: 92px minmax(0, 1fr) auto;
        align-items: center;
        gap: var(--sp-4);
        padding: var(--sp-4) var(--sp-5);
        transition: transform var(--t-med) var(--ease-out), border-color var(--t-med);
      }
      .hito:hover {
        transform: translateX(5px);
        border-color: var(--line-strong);
      }
      .hito.compacto {
        grid-template-columns: 64px minmax(0, 1fr) auto;
        gap: var(--sp-3);
        padding: var(--sp-3) var(--sp-4);
      }
      .fecha {
        display: grid;
        justify-items: center;
        padding-right: var(--sp-4);
        border-right: 1px solid var(--line);
      }
      .fecha b {
        font-size: var(--fs-2xl);
        line-height: 1;
        color: var(--cyan-300);
      }
      .compacto .fecha {
        padding-right: var(--sp-3);
      }
      .compacto .fecha b {
        font-size: var(--fs-xl);
      }
      .fecha span {
        font-size: var(--fs-xs);
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--tx-400);
      }
      .info h4 {
        font-family: var(--font-display);
        font-size: var(--fs-lg);
      }
      .compacto .info h4 {
        font-size: var(--fs-md);
      }
      .info p {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 2px;
        font-size: var(--fs-sm);
        color: var(--tx-300);
      }
      .cifras {
        display: grid;
        gap: 4px;
        text-align: right;
        font-size: var(--fs-sm);
      }
      .cifras small {
        margin-right: 6px;
        font-size: var(--fs-xs);
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--tx-400);
      }
      .costo {
        font-weight: 700;
        color: var(--tx-100);
      }
      @media (max-width: 640px) {
        .hito,
        .hito.compacto {
          grid-template-columns: 1fr;
        }
        .fecha {
          justify-items: start;
          padding: 0 0 var(--sp-3);
          border-right: 0;
          border-bottom: 1px solid var(--line);
        }
        .cifras {
          text-align: left;
        }
      }
    `,
  ],
})
export class Hito {
  readonly mantenimiento = input.required<Mantenimiento>();
  readonly compacto = input(false, { transform: booleanAttribute });

  protected readonly dia = computed(() => String(parseFecha(this.mantenimiento().fecha).getDate()).padStart(2, '0'));
  protected readonly mesAnio = computed(() =>
    new Intl.DateTimeFormat('es-CO', { month: 'short', year: 'numeric' }).format(parseFecha(this.mantenimiento().fecha)),
  );
}
