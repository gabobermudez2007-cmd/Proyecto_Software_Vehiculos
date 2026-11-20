import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApiService } from '../core/api.service';
import { mensajeDeError } from '../core/errors';
import { FleetStore } from '../core/fleet.store';
import { KmPipe, formatFecha, parseFecha } from '../core/formatters';
import { Mantenimiento } from '../core/models';
import { colorTipo, etiquetaTipo } from '../core/vehicle-meta';
import { Hito } from '../shared/hito';
import { Icon } from '../shared/icon';
import { StateView } from '../shared/state-view';

/** Consulta cronológica del historial de cualquier vehículo, con la evolución de su kilometraje. */
@Component({
  selector: 'app-historial-page',
  imports: [RouterLink, Icon, KmPipe, Hito, StateView],
  template: `
    <div class="page">
      <header class="page-head reveal">
        <div>
          <p class="t-eyebrow">Hoja de vida</p>
          <h2 class="t-title">Historial de mantenimientos</h2>
        </div>
      </header>

      @if (store.cargado() && store.vehiculos().length === 0) {
        <app-state-view
          tipo="vacio"
          titulo="No hay vehículos registrados"
          mensaje="Registra un vehículo para empezar a construir su historial de mantenimientos."
        >
          <a class="btn btn-primary" routerLink="/vehiculos" [queryParams]="{ nuevo: 1 }"><app-icon nombre="mas" /> Registrar vehículo</a>
        </app-state-view>
      } @else {
        <div class="disposicion">
          <nav class="selector glass reveal" [style.--i]="1" aria-label="Vehículos">
            <p class="t-eyebrow">Vehículo</p>
            @if (!store.cargado()) {
              <div class="skeleton" style="height: 220px"></div>
            }
            <ul>
              @for (v of store.vehiculos(); track v.id) {
                <li>
                  <button
                    type="button"
                    class="opcion"
                    [class.activo]="v.id === seleccion()"
                    [style.--acento]="color(v.tipo)"
                    [attr.aria-pressed]="v.id === seleccion()"
                    (click)="seleccionar(v.id)"
                  >
                    <span class="plate">{{ v.placa }}</span>
                    <span class="sub">{{ etiqueta(v.tipo) }}@if (v.estado === 'INACTIVO') { · inactivo }</span>
                  </button>
                </li>
              }
            </ul>
          </nav>

          <section class="detalle">
            @if (error()) {
              <app-state-view tipo="error" [mensaje]="error()!" (reintentar)="cargar(seleccion())" />
            } @else if (historial() === null) {
              <app-state-view tipo="cargando" [filas]="[1, 2, 3]" [alto]="84" />
            } @else if (historial()!.length === 0) {
              <app-state-view
                tipo="vacio"
                icono="historial"
                titulo="Sin mantenimientos"
                mensaje="Este vehículo todavía no tiene servicios registrados."
              >
                <a class="btn btn-primary" routerLink="/mantenimientos"><app-icon nombre="llave" /> Registrar servicio</a>
              </app-state-view>
            } @else {
              @if (grafica(); as g) {
                <figure class="glass grafica reveal">
                  <figcaption>
                    <span class="t-eyebrow">Kilometraje en cada servicio</span>
                    <span class="t-muted rango t-data">{{ g.desde }} → {{ g.hasta }}</span>
                  </figcaption>
                  <svg viewBox="0 0 640 170" role="img" aria-label="Evolución del kilometraje en cada servicio" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="area-km" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stop-color="#00c8e8" stop-opacity="0.35" />
                        <stop offset="1" stop-color="#00c8e8" stop-opacity="0" />
                      </linearGradient>
                    </defs>
                    <path [attr.d]="g.area" fill="url(#area-km)" />
                    <path [attr.d]="g.linea" fill="none" stroke="#00c8e8" stroke-width="2" vector-effect="non-scaling-stroke" />
                    @for (p of g.puntos; track p.id) {
                      <circle [attr.cx]="p.x" [attr.cy]="p.y" r="4" fill="#07111f" stroke="#5ee3f7" stroke-width="2" vector-effect="non-scaling-stroke">
                        <title>{{ p.etiqueta }}</title>
                      </circle>
                    }
                  </svg>
                  <div class="ejes t-data">
                    <span>{{ g.kmMin | km }} km</span>
                    <span>{{ g.kmMax | km }} km</span>
                  </div>
                </figure>
              }

              <ol class="timeline">
                @for (m of historial()!; track m.id; let i = $index) {
                  <li class="timeline-item reveal" [style.--i]="i">
                    <app-hito [mantenimiento]="m" />
                  </li>
                }
              </ol>
            }
          </section>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .disposicion {
        display: grid;
        grid-template-columns: 250px minmax(0, 1fr);
        gap: var(--sp-5);
        align-items: start;
      }
      .selector {
        position: sticky;
        top: calc(var(--topbar-h) + var(--sp-4));
        display: grid;
        gap: var(--sp-3);
        padding: var(--sp-4);
        max-height: calc(100dvh - var(--topbar-h) - var(--sp-6));
        overflow-y: auto;
      }
      .selector ul {
        display: grid;
        gap: 4px;
      }
      .opcion {
        position: relative;
        display: grid;
        gap: 2px;
        width: 100%;
        padding: var(--sp-2) var(--sp-3);
        border: 1px solid transparent;
        border-radius: var(--r-md);
        background: transparent;
        text-align: left;
        cursor: pointer;
        transition: background var(--t-med) var(--ease-out), border-color var(--t-fast), transform var(--t-med) var(--ease-out);
      }
      .opcion:hover {
        background: rgba(42, 123, 239, 0.1);
        transform: translateX(3px);
      }
      .opcion.activo {
        border-color: var(--line-strong);
        background: linear-gradient(90deg, rgba(7, 91, 206, 0.4), rgba(0, 200, 232, 0.05));
      }
      .opcion.activo::before {
        content: '';
        position: absolute;
        left: -1px;
        top: 20%;
        bottom: 20%;
        width: 3px;
        border-radius: 3px;
        background: var(--acento);
        box-shadow: 0 0 12px var(--acento);
      }
      .plate {
        width: fit-content;
      }
      .sub {
        font-size: var(--fs-xs);
        color: var(--tx-400);
      }
      .detalle {
        display: grid;
        gap: var(--sp-5);
        min-width: 0;
      }
      .grafica {
        margin: 0;
        padding: var(--sp-4) var(--sp-5);
      }
      .grafica figcaption {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: var(--sp-2);
        margin-bottom: var(--sp-3);
      }
      .rango {
        font-size: var(--fs-xs);
      }
      .grafica svg {
        display: block;
        width: 100%;
        height: 150px;
        overflow: visible;
      }
      .ejes {
        display: flex;
        justify-content: space-between;
        margin-top: var(--sp-2);
        font-size: var(--fs-xs);
        color: var(--tx-400);
      }
      @media (max-width: 900px) {
        .disposicion {
          grid-template-columns: 1fr;
        }
        .selector {
          position: static;
          max-height: none;
        }
        .selector ul {
          grid-auto-flow: column;
          grid-auto-columns: max-content;
          overflow-x: auto;
          padding-bottom: var(--sp-2);
        }
      }
    `,
  ],
})
export class HistorialPage {
  /** Parámetro de consulta ?vehiculo=ID (por ejemplo, al llegar desde la página de mantenimientos). */
  readonly vehiculo = input<string | undefined>();

  protected readonly store = inject(FleetStore);
  private readonly api = inject(ApiService);

  protected readonly etiqueta = etiquetaTipo;
  protected readonly color = colorTipo;

  protected readonly seleccion = signal<number | null>(null);
  protected readonly historial = signal<Mantenimiento[] | null>(null);
  protected readonly error = signal<string | null>(null);

  /** Evolución del kilometraje (solo si hay al menos dos servicios). */
  protected readonly grafica = computed(() => {
    const lista = this.historial();
    if (!lista || lista.length < 2) return null;
    const cronologico = [...lista].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id);
    const kms = cronologico.map((m) => m.kilometraje);
    const kmMin = Math.min(...kms);
    const kmMax = Math.max(...kms);
    const t0 = parseFecha(cronologico[0].fecha).getTime();
    const t1 = parseFecha(cronologico[cronologico.length - 1].fecha).getTime();
    const ancho = 640;
    const alto = 170;
    const margen = 14;
    const puntos = cronologico.map((m, i) => {
      const fx = t1 === t0 ? i / (cronologico.length - 1) : (parseFecha(m.fecha).getTime() - t0) / (t1 - t0);
      const fy = kmMax === kmMin ? 0.5 : (m.kilometraje - kmMin) / (kmMax - kmMin);
      return {
        id: m.id,
        x: margen + fx * (ancho - margen * 2),
        y: alto - margen - fy * (alto - margen * 2),
        etiqueta: `${formatFecha(m.fecha)} · ${m.tipoServicio} · ${m.kilometraje.toLocaleString('es-CO')} km`,
      };
    });
    const linea = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const area = `${linea} L${puntos[puntos.length - 1].x.toFixed(1)} ${alto} L${puntos[0].x.toFixed(1)} ${alto} Z`;
    return {
      puntos,
      linea,
      area,
      kmMin,
      kmMax,
      desde: formatFecha(cronologico[0].fecha),
      hasta: formatFecha(cronologico[cronologico.length - 1].fecha),
    };
  });

  constructor() {
    // Selecciona el vehículo indicado en la URL o, en su defecto, el primero de la flota.
    effect(() => {
      const vehiculos = this.store.vehiculos();
      const solicitado = Number(this.vehiculo());
      untracked(() => {
        if (this.seleccion() !== null || vehiculos.length === 0) return;
        const existe = vehiculos.some((v) => v.id === solicitado);
        this.seleccionar(existe ? solicitado : vehiculos[0].id);
      });
    });
  }

  protected seleccionar(id: number): void {
    this.seleccion.set(id);
    this.cargar(id);
  }

  protected cargar(id: number | null): void {
    if (id === null) return;
    this.error.set(null);
    this.historial.set(null);
    this.api.historial(id).subscribe({
      next: (lista) => {
        if (this.seleccion() === id) this.historial.set(lista);
      },
      error: (e) => this.error.set(mensajeDeError(e)),
    });
  }
}
