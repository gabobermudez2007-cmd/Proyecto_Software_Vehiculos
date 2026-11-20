import { Component, computed, effect, inject, signal, untracked } from '@angular/core';

import { ApiService } from '../core/api.service';
import { mensajeDeError } from '../core/errors';
import { FleetStore } from '../core/fleet.store';
import { Alerta, TipoVehiculo } from '../core/models';
import { GRAVEDAD_META, Gravedad, TIPOS, gravedadDe } from '../core/vehicle-meta';
import { AlertaItem } from '../shared/alerta-item';
import { Counter } from '../shared/counter';
import { StateView } from '../shared/state-view';
import { MantenimientoModal } from './mantenimiento-form';

interface Grupo {
  gravedad: Gravedad;
  etiqueta: string;
  descripcion: string;
  items: Alerta[];
}

const DESCRIPCIONES: Record<Gravedad, string> = {
  critica: 'Vencidos por kilometraje y por tiempo a la vez. Requieren atención inmediata.',
  vencida: 'Superaron el kilometraje o el tiempo previsto para su próximo servicio.',
  limite: 'Alcanzaron justo el límite previsto: el servicio toca ahora.',
};

/** Alertas jerarquizadas por gravedad: crítica, vencida y en el límite. */
@Component({
  selector: 'app-alertas-page',
  imports: [Counter, StateView, AlertaItem, MantenimientoModal],
  template: `
    <div class="page">
      <header class="page-head reveal">
        <div>
          <p class="t-eyebrow">Mantenimiento preventivo</p>
          <h2 class="t-title">Alertas de mantenimiento</h2>
        </div>
        <div class="seg" role="group" aria-label="Filtrar por tipo de vehículo">
          <button type="button" [class.activo]="tipo() === ''" (click)="cambiarTipo('')">Todos</button>
          @for (t of tipos; track t.valor) {
            <button type="button" [class.activo]="tipo() === t.valor" (click)="cambiarTipo(t.valor)">{{ t.plural }}</button>
          }
        </div>
      </header>

      <!-- Indicadores de gravedad: también filtran la lista -->
      <section class="termometro reveal" [style.--i]="1" aria-label="Resumen por gravedad">
        @for (g of niveles; track g) {
          <button
            type="button"
            class="nivel"
            [class.activo]="gravedad() === g"
            [style.--tono]="meta[g].color"
            [attr.aria-pressed]="gravedad() === g"
            (click)="alternarGravedad(g)"
          >
            <span class="cifra t-data"><app-counter [valor]="conteo()[g]" /></span>
            <span class="etiqueta">{{ meta[g].etiqueta }}</span>
          </button>
        }
      </section>

      @if (error()) {
        <app-state-view tipo="error" [mensaje]="error()!" (reintentar)="cargar()" />
      } @else if (lista() === null) {
        <app-state-view tipo="cargando" [filas]="[1, 2, 3]" [alto]="104" />
      } @else if (grupos().length === 0) {
        <app-state-view
          tipo="vacio"
          icono="ok"
          [titulo]="lista()!.length === 0 ? 'Flota al día' : 'Sin alertas en este filtro'"
          [mensaje]="
            lista()!.length === 0
              ? 'Ningún vehículo activo tiene servicios vencidos por kilometraje o por tiempo.'
              : 'No hay alertas de la gravedad seleccionada.'
          "
        />
      } @else {
        @for (g of grupos(); track g.gravedad; let gi = $index) {
          <section class="grupo reveal" [style.--i]="gi + 2" [style.--tono]="meta[g.gravedad].color">
            <header>
              <h3>{{ g.etiqueta }} <span class="t-data cuenta">{{ g.items.length }}</span></h3>
              <p>{{ g.descripcion }}</p>
            </header>
            <div class="lista">
              @for (a of g.items; track a.vehiculoId + '-' + a.tipoServicioId) {
                <app-alerta-item [alerta]="a" (registrar)="abrirRegistro($event)" />
              }
            </div>
          </section>
        }
      }
    </div>

    @if (registro(); as a) {
      <app-mantenimiento-modal
        [vehiculoId]="a.vehiculoId"
        [tipoServicioId]="a.tipoServicioId"
        (guardado)="alRegistrar()"
        (cerrar)="registro.set(null)"
      />
    }
  `,
  styles: [
    `
      .termometro {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: var(--sp-4);
      }
      .nivel {
        position: relative;
        display: flex;
        align-items: baseline;
        gap: var(--sp-3);
        padding: var(--sp-4) var(--sp-5);
        border: 1px solid var(--line);
        border-radius: var(--r-md);
        background: linear-gradient(180deg, color-mix(in srgb, var(--tono) 10%, transparent), transparent 80%);
        text-align: left;
        cursor: pointer;
        overflow: hidden;
        transition: transform var(--t-med) var(--ease-out), border-color var(--t-med), box-shadow var(--t-med);
      }
      .nivel::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 2px;
        background: var(--tono);
        box-shadow: 0 0 18px var(--tono);
        opacity: 0.6;
        transition: opacity var(--t-med);
      }
      .nivel:hover {
        transform: translateY(-3px);
      }
      .nivel.activo {
        border-color: var(--tono);
        box-shadow: 0 0 30px color-mix(in srgb, var(--tono) 25%, transparent);
      }
      .nivel.activo::after,
      .nivel:hover::after {
        opacity: 1;
      }
      .cifra {
        font-size: var(--fs-hero);
        font-weight: 700;
        line-height: 0.9;
        color: var(--tono);
      }
      .etiqueta {
        font-size: var(--fs-sm);
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--tx-200);
      }
      .grupo {
        display: grid;
        gap: var(--sp-3);
      }
      .grupo header {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: var(--sp-2) var(--sp-4);
        padding-bottom: var(--sp-2);
        border-bottom: 1px solid var(--line);
      }
      .grupo h3 {
        font-size: var(--fs-lg);
        color: var(--tono);
      }
      .cuenta {
        margin-left: 6px;
        padding: 1px 8px;
        border: 1px solid currentColor;
        border-radius: var(--r-pill);
        font-size: var(--fs-xs);
      }
      .grupo header p {
        font-size: var(--fs-sm);
        color: var(--tx-300);
      }
      .lista {
        display: grid;
        gap: var(--sp-3);
      }
      @media (max-width: 720px) {
        .termometro {
          grid-template-columns: 1fr;
        }
        .cifra {
          font-size: var(--fs-2xl);
        }
      }
    `,
  ],
})
export class AlertasPage {
  private readonly api = inject(ApiService);
  private readonly store = inject(FleetStore);

  protected readonly tipos = TIPOS;
  protected readonly meta = GRAVEDAD_META;
  protected readonly niveles: Gravedad[] = ['critica', 'vencida', 'limite'];

  protected readonly lista = signal<Alerta[] | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly tipo = signal<TipoVehiculo | ''>('');
  protected readonly gravedad = signal<Gravedad | ''>('');
  protected readonly registro = signal<Alerta | null>(null);

  protected readonly conteo = computed(() => {
    const total: Record<Gravedad, number> = { critica: 0, vencida: 0, limite: 0 };
    for (const a of this.lista() ?? []) total[gravedadDe(a)]++;
    return total;
  });

  /** Alertas agrupadas por gravedad (el backend ya las entrega ordenadas por criticidad). */
  protected readonly grupos = computed<Grupo[]>(() => {
    const lista = this.lista() ?? [];
    const filtro = this.gravedad();
    return this.niveles
      .filter((g) => !filtro || filtro === g)
      .map((g) => ({
        gravedad: g,
        etiqueta: GRAVEDAD_META[g].etiqueta,
        descripcion: DESCRIPCIONES[g],
        items: lista.filter((a) => gravedadDe(a) === g),
      }))
      .filter((grupo) => grupo.items.length > 0);
  });

  constructor() {
    effect(() => {
      this.tipo();
      untracked(() => this.cargar());
    });
  }

  protected cargar(): void {
    this.error.set(null);
    this.api.alertas(this.tipo()).subscribe({
      next: (lista) => this.lista.set(lista),
      error: (e) => this.error.set(mensajeDeError(e)),
    });
  }

  protected cambiarTipo(tipo: TipoVehiculo | ''): void {
    this.lista.set(null);
    this.tipo.set(tipo);
  }

  protected alternarGravedad(g: Gravedad): void {
    this.gravedad.update((actual) => (actual === g ? '' : g));
  }

  protected abrirRegistro(alerta: Alerta): void {
    this.registro.set(alerta);
  }

  protected alRegistrar(): void {
    this.registro.set(null);
    this.cargar();
    this.store.refresh();
  }
}
