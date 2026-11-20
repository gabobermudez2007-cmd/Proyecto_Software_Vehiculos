import { Component, booleanAttribute, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FechaPipe, KmPipe, formatKm, parseFecha } from '../core/formatters';
import { Alerta } from '../core/models';
import { GRAVEDAD_META, etiquetaTipo, gravedadDe, motivoAlerta } from '../core/vehicle-meta';
import { Icon } from './icon';

/**
 * Fila de una alerta de mantenimiento. La barra lateral y la etiqueta reflejan su gravedad.
 * En modo normal muestra además dos medidores (kilometraje y tiempo) del avance hacia el servicio.
 */
@Component({
  selector: 'app-alerta-item',
  imports: [RouterLink, Icon, KmPipe, FechaPipe],
  template: `
    <article class="alerta" [class]="'g-' + gravedad()" [class.compacto]="compacto()">
      <span class="barra" aria-hidden="true"></span>

      <div class="identidad">
        <div class="cab">
          @if (!ocultarPlaca()) {
            <span class="plate">{{ alerta().placa }}</span>
          }
          <span class="pill" [class]="meta().pill">{{ meta().etiqueta }}</span>
        </div>
        <h3>{{ alerta().tipoServicio }}</h3>
        <p class="motivo">{{ motivo() }}</p>
        @if (!ocultarPlaca()) {
          <p class="vehiculo">{{ tipoVehiculo() }} · <span class="t-data">{{ alerta().kilometrajeActual | km }} km</span></p>
        }
      </div>

      @if (!compacto()) {
        <div class="medidores">
          <div>
            <p class="meta-linea">
              <span><app-icon nombre="tablero" /> Kilometraje</span>
              <span class="t-data">{{ alerta().kilometrajeActual | km }} / {{ alerta().kilometrajeProximoServicio | km }} km</span>
            </p>
            <div class="meter" [class.danger]="alerta().vencidoPorKilometraje" [style.--p]="pctKm()"><i></i></div>
          </div>
          <div>
            <p class="meta-linea">
              <span><app-icon nombre="calendario" /> Tiempo</span>
              <span class="t-data">vence {{ alerta().fechaProximoServicio | fecha }}</span>
            </p>
            <div class="meter" [class.danger]="alerta().vencidoPorTiempo" [style.--p]="pctTiempo()"><i></i></div>
          </div>
        </div>
      }

      <div class="acciones">
        @if (!ocultarPlaca()) {
          <a class="btn btn-sm btn-ghost" [routerLink]="['/vehiculos', alerta().vehiculoId]">Ver ficha</a>
        }
        <button type="button" class="btn btn-sm" (click)="registrar.emit(alerta())">
          <app-icon nombre="llave" /> Registrar servicio
        </button>
      </div>
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .alerta {
        position: relative;
        display: grid;
        grid-template-columns: minmax(180px, 1.1fr) minmax(220px, 1.4fr) auto;
        align-items: center;
        gap: var(--sp-3) var(--sp-5);
        padding: var(--sp-4) var(--sp-4) var(--sp-4) var(--sp-5);
        border: 1px solid var(--line);
        border-radius: var(--r-md);
        background: linear-gradient(90deg, color-mix(in srgb, var(--tono) 9%, transparent), rgba(12, 22, 40, 0.4) 55%);
        transition: transform var(--t-med) var(--ease-out), border-color var(--t-med);
      }
      .alerta:hover {
        transform: translateX(4px);
        border-color: var(--line-strong);
      }
      .alerta.compacto {
        grid-template-columns: 1fr auto;
        padding: var(--sp-3) var(--sp-3) var(--sp-3) var(--sp-4);
      }
      .g-critica {
        --tono: var(--danger);
      }
      .g-vencida {
        --tono: var(--warn);
      }
      .g-limite {
        --tono: var(--cyan-400);
      }
      .barra {
        position: absolute;
        left: 0;
        top: 10px;
        bottom: 10px;
        width: 3px;
        border-radius: 3px;
        background: var(--tono);
        box-shadow: 0 0 18px var(--tono);
      }
      .cab {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--sp-2);
        margin-bottom: 6px;
      }
      h3 {
        font-size: var(--fs-md);
      }
      .motivo {
        margin-top: 2px;
        font-size: var(--fs-sm);
        font-weight: 600;
        color: var(--tono);
      }
      .vehiculo {
        margin-top: 4px;
        font-size: var(--fs-xs);
        color: var(--tx-400);
      }
      .medidores {
        display: grid;
        gap: var(--sp-3);
      }
      .meta-linea {
        display: flex;
        justify-content: space-between;
        gap: var(--sp-3);
        margin-bottom: 6px;
        font-size: var(--fs-xs);
        color: var(--tx-300);
      }
      .meta-linea span:first-child {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--tx-400);
      }
      .acciones {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: var(--sp-2);
      }
      @media (max-width: 900px) {
        .alerta {
          grid-template-columns: 1fr;
        }
        .acciones {
          justify-content: flex-start;
        }
      }
    `,
  ],
})
export class AlertaItem {
  readonly alerta = input.required<Alerta>();
  readonly compacto = input(false, { transform: booleanAttribute });
  /** Oculta la placa cuando ya se está dentro de la ficha del vehículo. */
  readonly ocultarPlaca = input(false, { transform: booleanAttribute });
  readonly registrar = output<Alerta>();

  protected readonly gravedad = computed(() => gravedadDe(this.alerta()));
  protected readonly meta = computed(() => GRAVEDAD_META[this.gravedad()]);
  protected readonly motivo = computed(() => motivoAlerta(this.alerta(), formatKm));
  protected readonly tipoVehiculo = computed(() => etiquetaTipo(this.alerta().tipoVehiculo));

  /** Avance del kilometraje entre el último servicio y el próximo (100 % = límite alcanzado). */
  protected readonly pctKm = computed(() => {
    const a = this.alerta();
    const total = a.kilometrajeProximoServicio - a.kilometrajeUltimoServicio;
    if (total <= 0) return 100;
    return Math.max(0, Math.min(100, ((a.kilometrajeActual - a.kilometrajeUltimoServicio) / total) * 100));
  });

  /** Avance del tiempo entre el último servicio y la fecha prevista. */
  protected readonly pctTiempo = computed(() => {
    const a = this.alerta();
    const inicio = parseFecha(a.fechaUltimoServicio).getTime();
    const fin = parseFecha(a.fechaProximoServicio).getTime();
    if (fin <= inicio) return 100;
    return Math.max(0, Math.min(100, ((Date.now() - inicio) / (fin - inicio)) * 100));
  });
}
