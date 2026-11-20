import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FleetStore } from '../core/fleet.store';
import { FechaPipe, KmPipe } from '../core/formatters';
import { Alerta, Mantenimiento } from '../core/models';
import { GRAVEDAD_META, Gravedad, colorTipo, etiquetaTipo, gravedadDe } from '../core/vehicle-meta';
import { AlertaItem } from '../shared/alerta-item';
import { Counter } from '../shared/counter';
import { Icon } from '../shared/icon';
import { Odometer } from '../shared/odometer';
import { StateView } from '../shared/state-view';
import { VehicleStage } from '../shared/vehicle-stage';
import { MantenimientoModal } from './mantenimiento-form';

/**
 * Centro de control: un vehículo 3D como protagonista y, a su alrededor, solo la información
 * que el backend puede entregar (flota, estado, servicios vencidos y actividad reciente).
 */
@Component({
  selector: 'app-panel-page',
  imports: [RouterLink, Icon, Counter, Odometer, StateView, VehicleStage, AlertaItem, KmPipe, FechaPipe, MantenimientoModal],
  template: `
    @if (!store.cargado() && store.error()) {
      <app-state-view tipo="error" [mensaje]="store.error()!" (reintentar)="store.refresh()" />
    } @else if (!store.cargado()) {
      <div class="centro">
        <div class="skeleton" style="height: 560px"></div>
        <div class="columna">
          <div class="skeleton" style="height: 260px"></div>
          <div class="skeleton" style="height: 120px"></div>
        </div>
      </div>
    } @else if (store.vehiculos().length === 0) {
      <app-state-view
        tipo="vacio"
        titulo="Tu flota está vacía"
        mensaje="Registra el primer vehículo para ver aquí el estado de la flota, sus servicios y sus alertas."
      >
        <a class="btn btn-primary" routerLink="/vehiculos" [queryParams]="{ nuevo: 1 }"><app-icon nombre="mas" /> Registrar vehículo</a>
      </app-state-view>
    } @else {
      <div class="centro">
        <!-- Vehículo protagonista -->
        @if (seleccionado(); as v) {
          <section class="hero glass reveal" [style.--acento]="color(v.tipo)" aria-label="Vehículo destacado">
            <app-vehicle-stage [tipo]="v.tipo" [inactivo]="v.estado === 'INACTIVO'" />

            <div class="flota">
              <p class="t-eyebrow">Flota registrada</p>
              <p class="cifra t-data"><app-counter [valor]="store.vehiculos().length" /></p>
              <ul class="desglose">
                <li><span class="dot ok"></span> <b class="t-data">{{ store.activos().length }}</b> activos</li>
                <li><span class="dot apagado"></span> <b class="t-data">{{ store.inactivos().length }}</b> inactivos</li>
              </ul>
            </div>

            <article class="ficha glass">
              <div class="fila">
                <span class="plate">{{ v.placa }}</span>
                <span class="pill" [class.pill-ok]="v.estado === 'ACTIVO'" [class.pill-muted]="v.estado === 'INACTIVO'">
                  {{ v.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                </span>
              </div>
              <p class="nombre">{{ v.marca }} <b>{{ v.modelo }}</b></p>
              <p class="tipo">{{ etiqueta(v.tipo) }}</p>
              <app-odometer [valor]="v.kilometrajeActual" />
              <div class="fila">
                @if (alertasDe(v.id).length; as n) {
                  <span class="pill pill-danger">{{ n }} servicio{{ n === 1 ? '' : 's' }} vencido{{ n === 1 ? '' : 's' }}</span>
                } @else {
                  <span class="pill pill-ok">Sin servicios vencidos</span>
                }
                <a class="btn btn-sm btn-primary" [routerLink]="['/vehiculos', v.id]">Abrir ficha <app-icon nombre="flecha" /></a>
              </div>
            </article>

            <div class="rail" role="listbox" aria-label="Elegir vehículo destacado">
              @for (x of store.vehiculos(); track x.id) {
                <button
                  type="button"
                  class="chip"
                  role="option"
                  [class.activo]="x.id === v.id"
                  [attr.aria-selected]="x.id === v.id"
                  [class.inactivo]="x.estado === 'INACTIVO'"
                  (click)="elegido.set(x.id)"
                >
                  {{ x.placa }}
                </button>
              }
            </div>
          </section>
        }

        <!-- Información alrededor -->
        <div class="columna">
          <section class="glass panel reveal" [style.--i]="1" aria-label="Servicios vencidos">
            <div class="panel-title">
              <h3>Servicios vencidos</h3>
              <a class="enlace" routerLink="/alertas">Ver todos <app-icon nombre="flecha" /></a>
            </div>

            <div class="niveles">
              @for (g of niveles; track g) {
                <div class="nivel" [style.--tono]="meta[g].color">
                  <b class="t-data"><app-counter [valor]="conteo()[g]" /></b>
                  <span>{{ meta[g].etiqueta }}</span>
                </div>
              }
            </div>

            @if (principales().length) {
              <div class="alertas">
                @for (a of principales(); track a.vehiculoId + '-' + a.tipoServicioId) {
                  <app-alerta-item [alerta]="a" compacto (registrar)="registro.set($event)" />
                }
              </div>
            } @else {
              <p class="al-dia"><app-icon nombre="ok" /> Ningún servicio vencido en este momento.</p>
            }
          </section>

          <section class="glass panel reveal" [style.--i]="2" aria-label="Composición de la flota">
            <div class="panel-title"><h3>Composición de la flota</h3></div>
            <div class="barra" role="img" [attr.aria-label]="'Distribución por tipo de vehículo'">
              @for (t of store.porTipo(); track t.valor) {
                <i [style.flex]="t.total" [style.background]="t.color" [title]="t.plural + ': ' + t.total"></i>
              }
            </div>
            <ul class="leyenda">
              @for (t of store.porTipo(); track t.valor) {
                <li>
                  <span class="muestra" [style.background]="t.color"></span>
                  {{ t.plural }} <b class="t-data">{{ t.total }}</b>
                </li>
              }
            </ul>
          </section>

          <section class="glass panel reveal" [style.--i]="3" aria-label="Actividad reciente">
            <div class="panel-title">
              <h3>Actividad reciente</h3>
              <a class="enlace" routerLink="/historial">Historial <app-icon nombre="flecha" /></a>
            </div>
            @if (actividad() === null) {
              <div class="skeleton" style="height: 96px"></div>
            } @else if (actividad()!.length === 0) {
              <p class="t-muted vacio">Todavía no hay servicios registrados.</p>
            } @else {
              <ul class="actividad">
                @for (m of actividad()!; track m.id) {
                  <li>
                    <span class="fecha t-data">{{ m.fecha | fecha }}</span>
                    <span class="detalle">
                      <b>{{ m.tipoServicio }}</b>
                      <small><span class="plate mini">{{ m.placa }}</span> {{ m.kilometraje | km }} km</small>
                    </span>
                  </li>
                }
              </ul>
            }
          </section>
        </div>
      </div>
    }

    @if (registro(); as a) {
      <app-mantenimiento-modal
        [vehiculoId]="a.vehiculoId"
        [tipoServicioId]="a.tipoServicioId"
        (guardado)="registro.set(null)"
        (cerrar)="registro.set(null)"
      />
    }
  `,
  styles: [
    `
      .centro {
        display: grid;
        grid-template-columns: minmax(0, 1.9fr) minmax(320px, 1fr);
        gap: var(--sp-5);
        align-items: start;
      }

      /* ── Vehículo protagonista ── */
      .hero {
        position: relative;
        min-height: 620px;
        overflow: hidden;
        background:
          radial-gradient(60% 55% at 50% 62%, color-mix(in srgb, var(--acento) 24%, transparent), transparent 72%),
          var(--glass);
      }
      .hero app-vehicle-stage {
        position: absolute;
        inset: 0;
        min-height: 0;
      }
      .flota {
        position: absolute;
        top: var(--sp-5);
        left: var(--sp-6);
        z-index: 2;
        pointer-events: none;
      }
      .cifra {
        font-size: var(--fs-hero);
        font-weight: 700;
        line-height: 0.95;
        letter-spacing: -0.04em;
        background: linear-gradient(180deg, var(--tx-100), var(--cyan-300));
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
      .desglose {
        display: flex;
        gap: var(--sp-4);
        margin-top: var(--sp-2);
        font-size: var(--fs-sm);
        color: var(--tx-300);
      }
      .desglose li {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .desglose b {
        color: var(--tx-100);
      }
      .dot.apagado {
        background: var(--tx-400);
        color: var(--tx-400);
      }
      .ficha {
        position: absolute;
        z-index: 2;
        left: var(--sp-5);
        bottom: 78px;
        display: grid;
        gap: var(--sp-2);
        width: min(330px, calc(100% - var(--sp-5) * 2));
        padding: var(--sp-4);
        background: linear-gradient(160deg, rgba(20, 36, 66, 0.82), rgba(10, 20, 36, 0.78));
        animation: pop-in 0.6s var(--ease-out) 0.3s both;
      }
      .fila {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--sp-3);
        flex-wrap: wrap;
      }
      .nombre {
        font-size: var(--fs-lg);
        color: var(--tx-200);
      }
      .nombre b {
        font-family: var(--font-display);
        color: var(--tx-100);
      }
      .tipo {
        margin-top: -6px;
        font-size: var(--fs-xs);
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--tx-400);
      }
      .rail {
        position: absolute;
        z-index: 2;
        left: var(--sp-5);
        right: var(--sp-5);
        bottom: var(--sp-4);
        display: flex;
        gap: var(--sp-2);
        padding: var(--sp-2) 0;
        overflow-x: auto;
      }
      .chip {
        flex: none;
        padding: 6px 12px;
        border: 1px solid var(--line);
        border-radius: var(--r-pill);
        background: rgba(7, 17, 31, 0.6);
        font-family: var(--font-data);
        font-size: var(--fs-xs);
        font-weight: 700;
        letter-spacing: 0.1em;
        color: var(--tx-300);
        cursor: pointer;
        transition: color var(--t-fast), border-color var(--t-fast), background var(--t-med), transform var(--t-fast);
      }
      .chip:hover {
        color: var(--tx-100);
        border-color: var(--line-strong);
      }
      .chip:active {
        transform: scale(0.94);
      }
      .chip.activo {
        color: var(--tx-100);
        border-color: var(--cyan-400);
        background: rgba(0, 200, 232, 0.14);
        box-shadow: var(--glow-cyan);
      }
      .chip.inactivo {
        opacity: 0.6;
      }

      /* ── Columna de paneles ── */
      .columna {
        display: grid;
        gap: var(--sp-5);
      }
      .enlace {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: var(--fs-xs);
        font-weight: 700;
        letter-spacing: 0.06em;
        color: var(--cyan-400);
        transition: gap var(--t-med) var(--ease-out);
      }
      .enlace:hover {
        gap: 8px;
      }
      .niveles {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--sp-3);
        margin-bottom: var(--sp-4);
      }
      .nivel {
        display: grid;
        gap: 2px;
        padding: var(--sp-2) var(--sp-3);
        border-left: 2px solid var(--tono);
        background: linear-gradient(90deg, color-mix(in srgb, var(--tono) 10%, transparent), transparent);
      }
      .nivel b {
        font-size: var(--fs-2xl);
        line-height: 1;
        color: var(--tono);
      }
      .nivel span {
        font-size: var(--fs-xs);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--tx-300);
      }
      .alertas {
        display: grid;
        gap: var(--sp-3);
      }
      .al-dia {
        display: flex;
        align-items: center;
        gap: var(--sp-2);
        color: var(--ok);
        font-size: var(--fs-sm);
        font-weight: 600;
      }
      .barra {
        display: flex;
        gap: 3px;
        height: 12px;
        margin-bottom: var(--sp-4);
      }
      .barra i {
        min-width: 6px;
        border-radius: 3px;
        transition: flex var(--t-slow) var(--ease-out);
      }
      .leyenda {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--sp-2) var(--sp-4);
        font-size: var(--fs-sm);
        color: var(--tx-300);
      }
      .leyenda li {
        display: flex;
        align-items: center;
        gap: var(--sp-2);
      }
      .leyenda b {
        margin-left: auto;
        color: var(--tx-100);
      }
      .muestra {
        width: 10px;
        height: 10px;
        border-radius: 3px;
      }
      .actividad {
        display: grid;
        gap: var(--sp-3);
      }
      .actividad li {
        display: grid;
        grid-template-columns: 96px 1fr;
        gap: var(--sp-3);
        align-items: center;
        padding-bottom: var(--sp-3);
        border-bottom: 1px solid var(--line);
      }
      .actividad li:last-child {
        padding-bottom: 0;
        border-bottom: 0;
      }
      .fecha {
        font-size: var(--fs-xs);
        color: var(--tx-400);
      }
      .detalle {
        display: grid;
        gap: 2px;
        font-size: var(--fs-sm);
      }
      .detalle small {
        display: flex;
        align-items: center;
        gap: var(--sp-2);
        font-size: var(--fs-xs);
        color: var(--tx-400);
      }
      .plate.mini {
        padding: 0 6px;
        font-size: 11px;
      }
      .vacio {
        font-size: var(--fs-sm);
      }

      @media (max-width: 1180px) {
        .centro {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 640px) {
        .hero {
          display: flex;
          flex-direction: column;
          min-height: 0;
          padding-bottom: var(--sp-4);
        }
        .hero app-vehicle-stage {
          position: relative;
          inset: auto;
          height: 300px;
          order: 1;
        }
        .flota {
          position: static;
          order: 0;
          padding: var(--sp-4) var(--sp-4) 0;
        }
        .ficha {
          position: relative;
          order: 2;
          inset: auto;
          width: auto;
          margin: 0 var(--sp-4);
        }
        .rail {
          position: static;
          order: 3;
          margin: var(--sp-3) var(--sp-4) 0;
        }
      }
    `,
  ],
})
export class PanelPage {
  protected readonly store = inject(FleetStore);

  protected readonly etiqueta = etiquetaTipo;
  protected readonly color = colorTipo;
  protected readonly meta = GRAVEDAD_META;
  protected readonly niveles: Gravedad[] = ['critica', 'vencida', 'limite'];

  protected readonly elegido = signal<number | null>(null);
  protected readonly registro = signal<Alerta | null>(null);
  protected readonly actividad = signal<Mantenimiento[] | null>(null);

  /** Vehículo destacado: el elegido por el usuario o, por defecto, el primero activo. */
  protected readonly seleccionado = computed(() => {
    const lista = this.store.vehiculos();
    const id = this.elegido();
    return lista.find((v) => v.id === id) ?? lista.find((v) => v.estado === 'ACTIVO') ?? lista[0] ?? null;
  });

  protected readonly conteo = computed(() => {
    const total: Record<Gravedad, number> = { critica: 0, vencida: 0, limite: 0 };
    for (const a of this.store.alertas()) total[gravedadDe(a)]++;
    return total;
  });

  /** Las tres alertas más graves (el backend las entrega ordenadas por criticidad). */
  protected readonly principales = computed(() => this.store.alertas().slice(0, 3));

  constructor() {
    effect(() => {
      if (!this.store.cargado()) return;
      this.store.vehiculos();
      untracked(() => this.store.actividadReciente(5).subscribe((lista) => this.actividad.set(lista)));
    });
  }

  protected alertasDe(vehiculoId: number): Alerta[] {
    return this.store.alertasPorVehiculo().get(vehiculoId) ?? [];
  }
}
