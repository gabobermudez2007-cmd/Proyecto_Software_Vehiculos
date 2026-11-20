import { Component, input, output } from '@angular/core';

import { Icon, NombreIcono } from './icon';

/**
 * Estados de una sección: cargando (esqueletos), vacío y error.
 * El contenido proyectado se muestra debajo del mensaje (por ejemplo, un botón de acción).
 */
@Component({
  selector: 'app-state-view',
  imports: [Icon],
  template: `
    @switch (tipo()) {
      @case ('cargando') {
        <div class="cargando" aria-busy="true" aria-label="Cargando">
          @for (n of filas(); track n) {
            <div class="skeleton" [style.height.px]="alto()" [style.animation-delay.ms]="n * 120"></div>
          }
        </div>
      }
      @case ('vacio') {
        <div class="state glass">
          <span class="state-icon"><app-icon [nombre]="icono()" /></span>
          <h3>{{ titulo() }}</h3>
          <p>{{ mensaje() }}</p>
          <ng-content />
        </div>
      }
      @case ('error') {
        <div class="state glass" role="alert">
          <span class="state-icon error"><app-icon nombre="aviso" /></span>
          <h3>{{ titulo() || 'No se pudo cargar la información' }}</h3>
          <p>{{ mensaje() }}</p>
          <button type="button" class="btn" (click)="reintentar.emit()">
            <app-icon nombre="actualizar" /> Reintentar
          </button>
        </div>
      }
    }
  `,
  styles: [
    `
      .cargando {
        display: grid;
        gap: var(--sp-3);
      }
    `,
  ],
})
export class StateView {
  readonly tipo = input.required<'cargando' | 'vacio' | 'error'>();
  readonly titulo = input('');
  readonly mensaje = input('');
  readonly icono = input<NombreIcono>('auto');
  readonly filas = input([1, 2, 3]);
  readonly alto = input(72);
  readonly reintentar = output<void>();
}
