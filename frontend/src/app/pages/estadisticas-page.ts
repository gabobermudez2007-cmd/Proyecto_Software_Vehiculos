import { Component, computed, effect, inject, signal, untracked } from '@angular/core';

import { ApiService } from '../core/api.service';
import { mensajeDeError } from '../core/errors';
import { FleetStore } from '../core/fleet.store';
import { CopPipe } from '../core/formatters';
import { EstadisticaCosto, FrecuenciaServicio, TipoVehiculo } from '../core/models';
import { TIPOS } from '../core/vehicle-meta';
import { StateView } from '../shared/state-view';

type Vista = 'costos' | 'servicios';

interface MesBarra {
  clave: number;
  etiqueta: string;
  largo: string;
  total: number;
  cantidad: number;
}

const COLORES = ['var(--tipo-1)', 'var(--tipo-2)', 'var(--tipo-3)', 'var(--tipo-4)', 'var(--tipo-5)', 'var(--warn)', 'var(--ok)'];

const mesCorto = new Intl.DateTimeFormat('es-CO', { month: 'short' });
const mesLargo = new Intl.DateTimeFormat('es-CO', { month: 'long' });
const compacto = new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 });
const MAX_MESES_RELLENO = 60;

/**
 * Estadísticas de la flota:
 *  · Costos de mantenimiento por mes (de toda la flota o de un vehículo).
 *  · Frecuencia de cada tipo de servicio (con filtros por vehículo, tipo de vehículo y fechas).
 */
@Component({
  selector: 'app-estadisticas-page',
  imports: [StateView, CopPipe],
  template: `
    <div class="page">
      <header class="page-head reveal">
        <div>
          <p class="t-eyebrow">Análisis</p>
          <h2 class="t-title">Estadísticas de la flota</h2>
        </div>
        <div class="seg" role="tablist" aria-label="Tipo de estadística">
          <button type="button" role="tab" [class.activo]="vista() === 'costos'" [attr.aria-selected]="vista() === 'costos'" (click)="vista.set('costos')">
            Costos por mes
          </button>
          <button type="button" role="tab" [class.activo]="vista() === 'servicios'" [attr.aria-selected]="vista() === 'servicios'" (click)="vista.set('servicios')">
            Servicios más frecuentes
          </button>
        </div>
      </header>

      @if (vista() === 'costos') {
        <!-- ───────── Costos por vehículo y mes ───────── -->
        <div class="filtros glass reveal" [style.--i]="1">
          <div class="field">
            <label for="es-vehiculo">Vehículo</label>
            <select id="es-vehiculo" class="select" [value]="vehiculoCostos() ?? ''" (change)="cambiarVehiculoCostos($any($event.target).value)">
              <option value="">Toda la flota</option>
              @for (v of store.vehiculos(); track v.id) {
                <option [value]="v.id" [selected]="v.id === vehiculoCostos()">{{ v.placa }} · {{ v.marca }} {{ v.modelo }}</option>
              }
            </select>
          </div>
          <p class="t-muted nota">Suma de los costos de los servicios registrados, agrupados por mes.</p>
        </div>

        @if (errorCostos()) {
          <app-state-view tipo="error" [mensaje]="errorCostos()!" (reintentar)="cargarCostos()" />
        } @else if (costos() === null) {
          <app-state-view tipo="cargando" [filas]="[1, 2]" [alto]="180" />
        } @else if (meses().length === 0) {
          <app-state-view
            tipo="vacio"
            icono="grafica"
            titulo="Sin costos registrados"
            [mensaje]="vehiculoCostos() === null ? 'Aún no hay servicios registrados en la flota.' : 'Este vehículo todavía no tiene servicios registrados.'"
          />
        } @else {
          <section class="kpis reveal" [style.--i]="2" aria-label="Resumen de costos">
            <article class="kpi glass">
              <span class="t-eyebrow">Costo total</span>
              <b class="t-data">{{ resumen().total | cop }}</b>
            </article>
            <article class="kpi glass">
              <span class="t-eyebrow">Servicios</span>
              <b class="t-data">{{ resumen().servicios }}</b>
            </article>
            <article class="kpi glass">
              <span class="t-eyebrow">Mes de mayor gasto</span>
              <b class="t-data">{{ resumen().picoEtiqueta }}</b>
              <small class="t-muted t-data">{{ resumen().picoTotal | cop }}</small>
            </article>
          </section>

          <section class="glass panel reveal" [style.--i]="3" aria-label="Gráfico de costos por mes">
            <div class="panel-title">
              <h3>Costo de mantenimiento por mes</h3>
              <span class="t-muted rango">{{ meses()[0].largo }} → {{ meses()[meses().length - 1].largo }}</span>
            </div>
            <div class="desplazable">
              <div class="plot" [style.min-width.px]="meses().length * 52 + 64">
                <div class="zona">
                  @for (t of ticks(); track t.pct) {
                    <i class="linea" [style.bottom.%]="t.pct"></i>
                    <span class="tick t-data" [style.bottom.%]="t.pct">{{ t.etiqueta }}</span>
                  }
                </div>
                <div class="barras" [class.denso]="meses().length > 10">
                  @for (m of meses(); track m.clave; let i = $index) {
                    <div class="col" tabindex="0" [attr.aria-label]="m.largo + ': ' + m.cantidad + ' servicios, ' + m.total + ' pesos'">
                      <div class="area">
                        <i class="barra" [class.pico]="m.clave === resumen().picoClave" [style.height.%]="(m.total / maximo()) * 100" [style.animation-delay.ms]="i * 45">
                          @if (m.total > 0) {
                            <b class="valor t-data">{{ compacto(m.total) }}</b>
                          }
                        </i>
                        <span class="tip t-data">{{ m.largo }}<br />{{ m.total | cop }} · {{ m.cantidad }} serv.</span>
                      </div>
                      <span class="mes">{{ m.etiqueta }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>
          </section>

          <div class="dos">
            <section class="glass panel reveal" [style.--i]="4" aria-label="Detalle por mes">
              <div class="panel-title"><h3>Detalle por mes</h3></div>
              <div class="tabla-wrap">
                <table class="table">
                  <thead>
                    <tr><th>Mes</th><th class="num">Servicios</th><th class="num">Costo total</th><th class="num">% del total</th></tr>
                  </thead>
                  <tbody>
                    @for (m of mesesRecientes(); track m.clave) {
                      <tr>
                        <td class="cap">{{ m.largo }}</td>
                        <td class="num t-data">{{ m.cantidad }}</td>
                        <td class="num t-data">{{ m.total | cop }}</td>
                        <td class="num t-data">{{ resumen().total > 0 ? ((m.total / resumen().total) * 100).toFixed(1) : '0.0' }}%</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>

            @if (vehiculoCostos() === null && porVehiculo().length > 0) {
              <section class="glass panel reveal" [style.--i]="5" aria-label="Costo por vehículo">
                <div class="panel-title"><h3>Costo acumulado por vehículo</h3></div>
                <ul class="ranking">
                  @for (v of porVehiculo(); track v.vehiculoId) {
                    <li>
                      <span class="plate">{{ v.placa }}</span>
                      <span class="pista"><i [style.width.%]="(v.total / porVehiculo()[0].total) * 100"></i></span>
                      <b class="t-data">{{ v.total | cop }}</b>
                    </li>
                  }
                </ul>
              </section>
            }
          </div>
        }
      } @else {
        <!-- ───────── Frecuencia de servicios ───────── -->
        <div class="filtros cuatro glass reveal" [style.--i]="1">
          <div class="field">
            <label for="fr-vehiculo">Vehículo</label>
            <select id="fr-vehiculo" class="select" [value]="frecVehiculo() ?? ''" (change)="cambiarVehiculoFrec($any($event.target).value)">
              <option value="">Toda la empresa</option>
              @for (v of store.vehiculos(); track v.id) {
                <option [value]="v.id" [selected]="v.id === frecVehiculo()">{{ v.placa }} · {{ v.marca }} {{ v.modelo }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label for="fr-tipo">Tipo de vehículo</label>
            <select id="fr-tipo" class="select" [value]="frecTipo()" (change)="frecTipo.set($any($event.target).value)">
              <option value="">Todos</option>
              @for (t of tipos; track t.valor) {
                <option [value]="t.valor" [selected]="t.valor === frecTipo()">{{ t.plural }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label for="fr-desde">Desde</label>
            <input id="fr-desde" class="input" type="date" [value]="frecDesde()" [max]="frecHasta() || null" (change)="frecDesde.set($any($event.target).value)" />
          </div>
          <div class="field">
            <label for="fr-hasta">Hasta</label>
            <input id="fr-hasta" class="input" type="date" [value]="frecHasta()" [min]="frecDesde() || null" (change)="frecHasta.set($any($event.target).value)" />
          </div>
          @if (hayFiltrosFrec()) {
            <button type="button" class="btn btn-ghost limpiar" (click)="limpiarFrec()">Quitar filtros</button>
          }
        </div>

        @if (errorFrec()) {
          <app-state-view tipo="error" [mensaje]="errorFrec()!" (reintentar)="cargarFrecuencia()" />
        } @else if (frec() === null) {
          <app-state-view tipo="cargando" [filas]="[1, 2]" [alto]="180" />
        } @else {
          <section class="glass panel frecuencia reveal" [style.--i]="2" aria-label="Frecuencia de servicios">
            <div class="dona-caja">
              @if (totalFrec() > 0) {
                <div class="dona" role="img" [attr.aria-label]="'Distribución de ' + totalFrec() + ' servicios por tipo'" [style.background]="dona()">
                  <div class="centro">
                    <b class="t-data">{{ totalFrec() }}</b>
                    <small>servicios</small>
                  </div>
                </div>
              } @else {
                <div class="dona vacia">
                  <div class="centro"><b class="t-data">0</b><small>servicios</small></div>
                </div>
              }
            </div>

            <div class="detalle">
              <div class="panel-title">
                <h3>{{ tituloFrec() }}</h3>
              </div>
              @if (totalFrec() === 0) {
                <p class="t-muted vacio">No hay servicios registrados con estos filtros.</p>
              }
              <ul class="frec-lista">
                @for (f of frec()!; track f.tipoServicioId; let i = $index) {
                  <li [class.cero]="f.cantidad === 0">
                    <span class="nombre">
                      <i class="punto" [style.background]="color(i)"></i>
                      {{ f.tipoServicio }}
                      @if (i === 0 && f.cantidad > 0) {
                        <span class="pill pill-info">Más frecuente</span>
                      }
                    </span>
                    <span class="pista"><i [style.width.%]="maxFrec() > 0 ? (f.cantidad / maxFrec()) * 100 : 0" [style.background]="color(i)"></i></span>
                    <span class="cifras t-data"><b>{{ f.cantidad }}</b> <small>{{ f.porcentaje.toFixed(1) }}%</small></span>
                  </li>
                }
              </ul>
            </div>
          </section>
        }
      }
    </div>
  `,
  styles: [
    `
      .filtros {
        display: grid;
        grid-template-columns: minmax(220px, 340px) 1fr;
        gap: var(--sp-4) var(--sp-5);
        align-items: end;
        padding: var(--sp-4) var(--sp-5);
      }
      .filtros.cuatro {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
      .nota {
        font-size: var(--fs-sm);
      }
      .limpiar {
        grid-column: 1 / -1;
        justify-self: start;
      }
      input[type='date'] {
        color-scheme: dark;
      }

      .kpis {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: var(--sp-4);
      }
      .kpi {
        display: grid;
        gap: 4px;
        padding: var(--sp-4) var(--sp-5);
      }
      .kpi b {
        font-size: var(--fs-xl);
        line-height: 1.1;
        text-transform: capitalize;
      }
      .rango {
        font-size: var(--fs-xs);
        text-transform: capitalize;
      }

      /* ── Gráfico de barras ── */
      .desplazable {
        overflow-x: auto;
        padding-bottom: var(--sp-2);
      }
      .plot {
        position: relative;
        height: 304px;
        padding-left: 64px;
      }
      .zona {
        position: absolute;
        left: 64px;
        right: 0;
        top: 36px;
        bottom: 30px;
      }
      .linea {
        position: absolute;
        left: 0;
        right: 0;
        height: 1px;
        background: var(--line);
      }
      .tick {
        position: absolute;
        left: -64px;
        width: 56px;
        transform: translateY(50%);
        text-align: right;
        font-size: 11px;
        color: var(--tx-400);
      }
      .barras {
        position: absolute;
        left: 64px;
        right: 0;
        top: 36px;
        bottom: 0;
        display: flex;
        gap: 8px;
      }
      .col {
        flex: 1 0 44px;
        display: flex;
        flex-direction: column;
        min-width: 0;
        outline-offset: 0;
      }
      .area {
        position: relative;
        flex: 1;
        display: flex;
        align-items: flex-end;
        justify-content: center;
      }
      .barra {
        position: relative;
        display: block;
        width: 62%;
        max-width: 48px;
        min-height: 2px;
        border-radius: 6px 6px 2px 2px;
        background: linear-gradient(180deg, var(--cyan-400), var(--blue-500));
        box-shadow: 0 0 18px rgba(0, 200, 232, 0.22);
        transform-origin: bottom;
        animation: crecer 0.8s var(--ease-out) both;
        transition: filter var(--t-med), box-shadow var(--t-med);
      }
      .barra.pico {
        background: linear-gradient(180deg, var(--violet-400), var(--blue-500));
        box-shadow: 0 0 22px rgba(129, 85, 232, 0.4);
      }
      .col:hover .barra,
      .col:focus-visible .barra {
        filter: brightness(1.25);
      }
      .valor {
        position: absolute;
        bottom: calc(100% + 4px);
        left: 50%;
        transform: translateX(-50%);
        font-size: 11px;
        font-weight: 600;
        white-space: nowrap;
        color: var(--tx-200);
      }
      .denso .valor {
        display: none;
      }
      .mes {
        height: 30px;
        padding-top: 8px;
        text-align: center;
        font-size: var(--fs-xs);
        text-transform: capitalize;
        color: var(--tx-400);
      }
      .tip {
        position: absolute;
        top: 4px;
        left: 50%;
        z-index: 3;
        transform: translateX(-50%);
        padding: 6px 10px;
        border: 1px solid var(--line-strong);
        border-radius: var(--r-sm);
        background: var(--glass-solid);
        font-size: 11px;
        line-height: 1.4;
        white-space: nowrap;
        text-transform: capitalize;
        color: var(--tx-100);
        opacity: 0;
        pointer-events: none;
        transition: opacity var(--t-fast);
      }
      .col:hover .tip,
      .col:focus-visible .tip {
        opacity: 1;
      }
      /* En los extremos el recuadro se alinea al borde para que no se corte */
      .col:first-child .tip {
        left: 0;
        transform: none;
      }
      .col:last-child .tip {
        left: auto;
        right: 0;
        transform: none;
      }
      @keyframes crecer {
        from {
          transform: scaleY(0);
        }
      }

      /* ── Tabla y ranking ── */
      .dos {
        display: grid;
        grid-template-columns: minmax(0, 1.3fr) minmax(280px, 1fr);
        gap: var(--sp-5);
        align-items: start;
      }
      .tabla-wrap {
        overflow-x: auto;
      }
      .num {
        text-align: right;
      }
      .cap {
        text-transform: capitalize;
      }
      .ranking {
        display: grid;
        gap: var(--sp-3);
      }
      .ranking li {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: var(--sp-3);
      }
      .ranking b {
        font-size: var(--fs-sm);
        color: var(--tx-100);
      }
      .pista {
        height: 8px;
        border-radius: var(--r-pill);
        background: rgba(150, 190, 255, 0.1);
        overflow: hidden;
      }
      .pista i {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--blue-500), var(--cyan-400));
        transform-origin: left;
        animation: llenar 0.9s var(--ease-out) both;
      }
      @keyframes llenar {
        from {
          transform: scaleX(0);
        }
      }

      /* ── Frecuencia ── */
      .frecuencia {
        display: grid;
        grid-template-columns: 260px minmax(0, 1fr);
        gap: var(--sp-6);
        align-items: center;
      }
      .dona-caja {
        display: grid;
        place-items: center;
      }
      .dona {
        position: relative;
        width: 220px;
        aspect-ratio: 1;
        border-radius: 50%;
        box-shadow: 0 0 40px rgba(7, 91, 206, 0.25);
        animation: pop-in 0.7s var(--ease-out) both;
      }
      .dona.vacia {
        background: rgba(150, 190, 255, 0.1);
        box-shadow: none;
      }
      .centro {
        position: absolute;
        inset: 24%;
        display: grid;
        place-content: center;
        justify-items: center;
        border-radius: 50%;
        background: var(--glass-solid);
        box-shadow: inset 0 0 0 1px var(--line);
      }
      .centro b {
        font-size: var(--fs-2xl);
        line-height: 1;
      }
      .centro small {
        font-size: var(--fs-xs);
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--tx-400);
      }
      .frec-lista {
        display: grid;
        gap: var(--sp-4);
      }
      .frec-lista li {
        display: grid;
        grid-template-columns: minmax(150px, 1.1fr) minmax(80px, 2fr) 90px;
        align-items: center;
        gap: var(--sp-4);
      }
      .frec-lista li.cero {
        opacity: 0.55;
      }
      .nombre {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--sp-2);
        font-weight: 600;
        color: var(--tx-100);
      }
      .punto {
        width: 10px;
        height: 10px;
        border-radius: 3px;
      }
      .frec-lista .pista i {
        background: currentColor;
      }
      .cifras {
        text-align: right;
        color: var(--tx-100);
      }
      .cifras small {
        margin-left: 6px;
        font-size: var(--fs-xs);
        color: var(--tx-400);
      }
      .vacio {
        margin-bottom: var(--sp-3);
        font-size: var(--fs-sm);
      }

      @media (max-width: 1000px) {
        .dos,
        .frecuencia {
          grid-template-columns: 1fr;
        }
        .filtros.cuatro {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 640px) {
        .filtros,
        .filtros.cuatro,
        .kpis {
          grid-template-columns: 1fr;
        }
        .frec-lista li {
          grid-template-columns: 1fr auto;
        }
        .frec-lista .pista {
          grid-column: 1 / -1;
          order: 3;
        }
      }
    `,
  ],
})
export class EstadisticasPage {
  protected readonly store = inject(FleetStore);
  private readonly api = inject(ApiService);

  protected readonly tipos = TIPOS;
  protected readonly vista = signal<Vista>('costos');

  // ── Costos por mes ──
  protected readonly costos = signal<EstadisticaCosto[] | null>(null);
  protected readonly errorCostos = signal<string | null>(null);
  protected readonly vehiculoCostos = signal<number | null>(null);

  /** Filas del vehículo elegido (o de toda la flota). */
  private readonly filasCostos = computed(() => {
    const todas = this.costos() ?? [];
    const id = this.vehiculoCostos();
    return id === null ? todas : todas.filter((c) => c.vehiculoId === id);
  });

  /** Un elemento por mes, de más antiguo a más reciente, rellenando con cero los meses sin servicios. */
  protected readonly meses = computed<MesBarra[]>(() => {
    const acumulado = new Map<number, { total: number; cantidad: number }>();
    for (const c of this.filasCostos()) {
      const clave = c.anio * 12 + (c.mes - 1);
      const actual = acumulado.get(clave) ?? { total: 0, cantidad: 0 };
      actual.total += c.costoTotal;
      actual.cantidad += c.cantidadMantenimientos;
      acumulado.set(clave, actual);
    }
    if (acumulado.size === 0) return [];
    const claves = [...acumulado.keys()].sort((a, b) => a - b);
    const primera = claves[0];
    const ultima = claves[claves.length - 1];
    const lista = ultima - primera + 1 <= MAX_MESES_RELLENO ? Array.from({ length: ultima - primera + 1 }, (_, i) => primera + i) : claves;
    return lista.map((clave) => {
      const dato = acumulado.get(clave) ?? { total: 0, cantidad: 0 };
      const fecha = new Date(Math.floor(clave / 12), clave % 12, 1);
      return {
        clave,
        etiqueta: `${mesCorto.format(fecha).replace('.', '')} ${String(fecha.getFullYear()).slice(2)}`,
        largo: `${mesLargo.format(fecha)} de ${fecha.getFullYear()}`,
        total: dato.total,
        cantidad: dato.cantidad,
      };
    });
  });

  protected readonly mesesRecientes = computed(() => [...this.meses()].reverse());
  protected readonly maximo = computed(() => Math.max(1, ...this.meses().map((m) => m.total)));

  protected readonly resumen = computed(() => {
    const meses = this.meses();
    const total = meses.reduce((suma, m) => suma + m.total, 0);
    const servicios = meses.reduce((suma, m) => suma + m.cantidad, 0);
    const pico = meses.reduce<MesBarra | null>((mejor, m) => (mejor === null || m.total > mejor.total ? m : mejor), null);
    return {
      total,
      servicios,
      picoClave: pico?.clave ?? -1,
      picoEtiqueta: pico?.largo ?? '—',
      picoTotal: pico?.total ?? 0,
    };
  });

  /** Marcas del eje vertical (0, 25, 50, 75 y 100 % del valor máximo). */
  protected readonly ticks = computed(() =>
    [0, 25, 50, 75, 100].map((pct) => ({ pct, etiqueta: pct === 0 ? '$0' : '$' + compacto.format((this.maximo() * pct) / 100) })),
  );

  /** Costo acumulado por vehículo (solo en la vista de toda la flota). */
  protected readonly porVehiculo = computed(() => {
    const mapa = new Map<number, { vehiculoId: number; placa: string; total: number }>();
    for (const c of this.costos() ?? []) {
      const actual = mapa.get(c.vehiculoId) ?? { vehiculoId: c.vehiculoId, placa: c.placa, total: 0 };
      actual.total += c.costoTotal;
      mapa.set(c.vehiculoId, actual);
    }
    return [...mapa.values()].sort((a, b) => b.total - a.total);
  });

  // ── Frecuencia de servicios ──
  protected readonly frec = signal<FrecuenciaServicio[] | null>(null);
  protected readonly errorFrec = signal<string | null>(null);
  protected readonly frecVehiculo = signal<number | null>(null);
  protected readonly frecTipo = signal<TipoVehiculo | ''>('');
  protected readonly frecDesde = signal('');
  protected readonly frecHasta = signal('');
  private peticionFrec = 0;

  protected readonly totalFrec = computed(() => (this.frec() ?? []).reduce((suma, f) => suma + f.cantidad, 0));
  protected readonly maxFrec = computed(() => Math.max(0, ...(this.frec() ?? []).map((f) => f.cantidad)));
  protected readonly hayFiltrosFrec = computed(
    () => this.frecVehiculo() !== null || this.frecTipo() !== '' || this.frecDesde() !== '' || this.frecHasta() !== '',
  );

  protected readonly tituloFrec = computed(() => {
    const id = this.frecVehiculo();
    const placa = this.store.vehiculos().find((v) => v.id === id)?.placa;
    return placa ? `Servicios del vehículo ${placa}` : 'Servicios de toda la empresa';
  });

  /** Fondo cónico del gráfico de dona, con un tramo por tipo de servicio que tenga servicios. */
  protected readonly dona = computed(() => {
    const total = this.totalFrec();
    if (total === 0) return '';
    let acumulado = 0;
    const tramos: string[] = [];
    (this.frec() ?? []).forEach((f, i) => {
      if (f.cantidad === 0) return;
      const desde = acumulado;
      acumulado += (f.cantidad / total) * 100;
      tramos.push(`${this.color(i)} ${desde}% ${acumulado}%`);
    });
    return `conic-gradient(from -90deg, ${tramos.join(', ')})`;
  });

  protected readonly compacto = (n: number): string => '$' + compacto.format(n);

  constructor() {
    this.cargarCostos();
    // Cada cambio de filtro vuelve a consultar el gráfico de frecuencias.
    effect(() => {
      this.frecVehiculo();
      this.frecTipo();
      this.frecDesde();
      this.frecHasta();
      untracked(() => this.cargarFrecuencia());
    });
  }

  protected color(indice: number): string {
    return COLORES[indice % COLORES.length];
  }

  protected cargarCostos(): void {
    this.errorCostos.set(null);
    this.costos.set(null);
    this.api.estadisticasCostos().subscribe({
      next: (lista) => this.costos.set(lista),
      error: (e) => this.errorCostos.set(mensajeDeError(e)),
    });
  }

  protected cambiarVehiculoCostos(valor: string): void {
    this.vehiculoCostos.set(valor ? Number(valor) : null);
  }

  protected cambiarVehiculoFrec(valor: string): void {
    this.frecVehiculo.set(valor ? Number(valor) : null);
  }

  protected limpiarFrec(): void {
    this.frecVehiculo.set(null);
    this.frecTipo.set('');
    this.frecDesde.set('');
    this.frecHasta.set('');
  }

  protected cargarFrecuencia(): void {
    const desde = this.frecDesde();
    const hasta = this.frecHasta();
    if (desde && hasta && desde > hasta) {
      this.errorFrec.set('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }
    this.errorFrec.set(null);
    const numero = ++this.peticionFrec;
    this.api
      .frecuenciaServicios({ vehiculoId: this.frecVehiculo(), tipo: this.frecTipo(), desde, hasta })
      .subscribe({
        next: (lista) => {
          if (numero === this.peticionFrec) this.frec.set(lista);
        },
        error: (e) => {
          if (numero === this.peticionFrec) this.errorFrec.set(mensajeDeError(e));
        },
      });
  }
}
