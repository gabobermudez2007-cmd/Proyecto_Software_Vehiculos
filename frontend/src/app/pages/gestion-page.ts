import { Component, signal } from '@angular/core';

import { Icon, NombreIcono } from '../shared/icon';
import { GestionMantenimientos } from './gestion-mantenimientos';
import { GestionServicios } from './gestion-servicios';
import { GestionTalleres } from './gestion-talleres';

type Seccion = 'mantenimientos' | 'talleres' | 'servicios';

interface Pestana {
  valor: Seccion;
  etiqueta: string;
  descripcion: string;
  icono: NombreIcono;
}

/** Una sola pestaña para gestionar los mantenimientos, los talleres y los tipos de servicio. */
@Component({
  selector: 'app-gestion-page',
  imports: [Icon, GestionMantenimientos, GestionTalleres, GestionServicios],
  template: `
    <div class="page">
      <header class="page-head reveal">
        <div>
          <p class="t-eyebrow">Administración</p>
          <h2 class="t-title">Gestión de datos</h2>
        </div>
        <p class="t-muted ayuda">Corrige mantenimientos y mantén al día tus talleres y tipos de servicio.</p>
      </header>

      <nav class="pestanas reveal" [style.--i]="1" role="tablist" aria-label="Qué quieres gestionar">
        @for (p of pestanas; track p.valor) {
          <button
            type="button"
            role="tab"
            class="pestana"
            [class.activa]="seccion() === p.valor"
            [attr.aria-selected]="seccion() === p.valor"
            (click)="seccion.set(p.valor)"
          >
            <span class="ico"><app-icon [nombre]="p.icono" /></span>
            <span class="txt">
              <b>{{ p.etiqueta }}</b>
              <small>{{ p.descripcion }}</small>
            </span>
          </button>
        }
      </nav>

      @switch (seccion()) {
        @case ('mantenimientos') {
          <app-gestion-mantenimientos />
        }
        @case ('talleres') {
          <app-gestion-talleres />
        }
        @case ('servicios') {
          <app-gestion-servicios />
        }
      }
    </div>
  `,
  styles: [
    `
      .ayuda {
        max-width: 42ch;
        font-size: var(--fs-sm);
      }
      .pestanas {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: var(--sp-3);
      }
      .pestana {
        position: relative;
        display: flex;
        align-items: center;
        gap: var(--sp-3);
        padding: var(--sp-3) var(--sp-4);
        border: 1px solid var(--line);
        border-radius: var(--r-md);
        background: rgba(7, 17, 31, 0.5);
        color: var(--tx-300);
        text-align: left;
        cursor: pointer;
        overflow: hidden;
        transition: transform var(--t-med) var(--ease-out), border-color var(--t-fast), background var(--t-med), box-shadow var(--t-med);
      }
      .pestana:hover {
        transform: translateY(-2px);
        border-color: var(--line-strong);
      }
      .pestana.activa {
        color: var(--tx-100);
        border-color: var(--cyan-400);
        background: linear-gradient(160deg, rgba(7, 91, 206, 0.38), rgba(0, 200, 232, 0.08));
        box-shadow: var(--glow-cyan);
      }
      .ico {
        display: grid;
        place-items: center;
        flex: none;
        width: 38px;
        height: 38px;
        border-radius: var(--r-md);
        background: rgba(42, 123, 239, 0.14);
        color: var(--cyan-400);
      }
      .txt {
        display: grid;
        gap: 2px;
        min-width: 0;
      }
      .txt b {
        font-family: var(--font-display);
        font-size: var(--fs-md);
      }
      .txt small {
        font-size: var(--fs-xs);
        color: var(--tx-400);
      }
      @media (max-width: 760px) {
        .pestanas {
          grid-template-columns: 1fr;
        }
        .txt small {
          display: none;
        }
      }
    `,
  ],
})
export class GestionPage {
  protected readonly seccion = signal<Seccion>('mantenimientos');

  protected readonly pestanas: Pestana[] = [
    { valor: 'mantenimientos', etiqueta: 'Mantenimientos', descripcion: 'Editar y eliminar servicios', icono: 'llave' },
    { valor: 'talleres', etiqueta: 'Talleres', descripcion: 'Agregar, editar y eliminar', icono: 'taller' },
    { valor: 'servicios', etiqueta: 'Tipos de servicio', descripcion: 'Catálogo e intervalos', icono: 'calendario' },
  ];
}
