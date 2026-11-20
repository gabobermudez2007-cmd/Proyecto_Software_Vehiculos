import { Component, computed, inject, input } from '@angular/core';

import { TipoVehiculo } from '../core/models';
import { etiquetaTipo } from '../core/vehicle-meta';
import { Icon } from './icon';
import { VehicleRenderService } from './vehicle-render.service';

/** Render 3D individual de un tipo de vehículo (imagen generada una sola vez y reutilizada). */
@Component({
  selector: 'app-vehicle-thumb',
  imports: [Icon],
  template: `
    @if (imagen(); as src) {
      <img [src]="src" [alt]="'Representación de ' + etiqueta()" width="720" height="400" />
    } @else if (render.fallo()) {
      <span class="alt"><app-icon nombre="auto" /></span>
    } @else {
      <span class="skeleton cargando"></span>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        aspect-ratio: 720 / 400;
      }
      img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
        animation: fade-in 0.6s var(--ease-out);
      }
      .cargando {
        display: block;
        width: 60%;
        height: 50%;
        margin: 15% auto 0;
      }
      .alt {
        display: grid;
        place-items: center;
        height: 100%;
        font-size: 3rem;
        color: var(--tx-400);
      }
    `,
  ],
})
export class VehicleThumb {
  readonly tipo = input.required<TipoVehiculo>();

  protected readonly render = inject(VehicleRenderService);
  protected readonly imagen = computed(() => this.render.miniaturas()[this.tipo()]);
  protected readonly etiqueta = computed(() => etiquetaTipo(this.tipo()));

  constructor() {
    this.render.solicitar();
  }
}
