import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

import { FleetStore } from './core/fleet.store';
import { ConfirmDialog } from './shared/confirm-dialog';
import { Icon, NombreIcono } from './shared/icon';
import { Toasts } from './shared/toasts';

interface ItemNav {
  ruta: string;
  etiqueta: string;
  icono: NombreIcono;
}

/** Cascarón de la aplicación: sidebar, barra superior, contenido y capas flotantes. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, Toasts, ConfirmDialog],
  template: `
    <div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>

    <div class="shell">
      <aside class="sidebar" aria-label="Navegación principal">
        <a class="marca" routerLink="/panel" aria-label="FleetCare, ir al centro de control">
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <defs>
              <linearGradient id="marca-g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#00c8e8" />
                <stop offset="1" stop-color="#8155e8" />
              </linearGradient>
            </defs>
            <path d="M8 32a16 16 0 1 1 32 0" fill="none" stroke="url(#marca-g)" stroke-width="4" stroke-linecap="round" />
            <path d="M24 32l7-9" stroke="#eaf2ff" stroke-width="3.2" stroke-linecap="round" />
            <circle cx="24" cy="32" r="3" fill="#00c8e8" />
          </svg>
          <span>
            <b>FleetCare</b>
            <small>Control de flota</small>
          </span>
        </a>

        <nav>
          @for (item of navegacion; track item.ruta; let i = $index) {
            <a class="nav-item reveal" [style.--i]="i" [routerLink]="item.ruta" routerLinkActive="activo">
              <app-icon [nombre]="item.icono" />
              <span>{{ item.etiqueta }}</span>
              @if (item.ruta === '/alertas' && store.alertas().length > 0) {
                <em class="badge">{{ store.alertas().length }}</em>
              }
            </a>
          }
        </nav>

        <div class="estado-api" [title]="store.error() ?? 'Conectado al backend'">
          <span class="dot" [class.ok]="store.conectado()"></span>
          <span>{{ store.conectado() ? 'API conectada' : 'Sin conexión' }}</span>
        </div>
      </aside>

      <div class="principal">
        <header class="superior">
          <div>
            <p class="t-eyebrow">FleetCare</p>
            <h1>{{ titulo() }}</h1>
          </div>
          <div class="acciones">
            <button type="button" class="btn-icon" aria-label="Actualizar datos" (click)="store.refresh()">
              <app-icon nombre="actualizar" [class.girando]="store.cargando()" />
            </button>
            <a class="btn btn-ghost" routerLink="/mantenimientos">
              <app-icon nombre="llave" /> <span class="solo-ancho">Registrar servicio</span>
            </a>
            <a class="btn btn-primary" routerLink="/vehiculos" [queryParams]="{ nuevo: 1 }">
              <app-icon nombre="mas" /> <span class="solo-ancho">Nuevo vehículo</span>
            </a>
          </div>
        </header>

        <main class="contenido">
          <router-outlet />
        </main>
      </div>
    </div>

    <app-toasts />
    <app-confirm-dialog />
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100dvh;
      }

      /* Iluminación ambiental animada */
      .aurora {
        position: fixed;
        inset: 0;
        z-index: 0;
        overflow: hidden;
        pointer-events: none;
      }
      .aurora i {
        position: absolute;
        width: 46vmax;
        height: 46vmax;
        border-radius: 50%;
        filter: blur(90px);
        opacity: 0.32;
        animation: drift 26s ease-in-out infinite;
      }
      .aurora i:nth-child(1) {
        top: -18vmax;
        left: -8vmax;
        background: var(--blue-500);
      }
      .aurora i:nth-child(2) {
        right: -16vmax;
        bottom: -20vmax;
        background: var(--violet-500);
        animation-delay: -9s;
      }
      .aurora i:nth-child(3) {
        top: 35%;
        left: 40%;
        width: 22vmax;
        height: 22vmax;
        background: var(--cyan-400);
        opacity: 0.1;
        animation-delay: -16s;
      }

      .shell {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
        min-height: 100dvh;
      }

      /* ── Sidebar ── */
      .sidebar {
        position: sticky;
        top: 0;
        height: 100dvh;
        display: flex;
        flex-direction: column;
        gap: var(--sp-6);
        padding: var(--sp-5) var(--sp-4);
        border-right: 1px solid var(--line);
        background: linear-gradient(180deg, rgba(10, 22, 38, 0.82), rgba(7, 17, 31, 0.6));
        backdrop-filter: var(--glass-blur);
      }
      .marca {
        display: flex;
        align-items: center;
        gap: var(--sp-3);
        padding: 0 var(--sp-2);
      }
      .marca svg {
        width: 40px;
        height: 40px;
        filter: drop-shadow(0 0 12px rgba(0, 200, 232, 0.45));
      }
      .marca b {
        display: block;
        font-family: var(--font-display);
        font-size: var(--fs-lg);
        letter-spacing: -0.01em;
      }
      .marca small {
        display: block;
        font-family: var(--font-data);
        font-size: 10px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--tx-400);
      }
      nav {
        display: grid;
        gap: 4px;
      }
      .nav-item {
        position: relative;
        display: flex;
        align-items: center;
        gap: var(--sp-3);
        padding: 11px var(--sp-3);
        border-radius: var(--r-md);
        color: var(--tx-300);
        font-size: var(--fs-md);
        font-weight: 600;
        transition: color var(--t-fast), background var(--t-med) var(--ease-out), transform var(--t-med) var(--ease-out);
      }
      .nav-item app-icon {
        font-size: 1.35rem;
      }
      .nav-item:hover {
        color: var(--tx-100);
        background: rgba(42, 123, 239, 0.1);
        transform: translateX(3px);
      }
      .nav-item.activo {
        color: var(--tx-100);
        background: linear-gradient(90deg, rgba(7, 91, 206, 0.45), rgba(0, 200, 232, 0.06));
        box-shadow: inset 0 0 0 1px rgba(106, 163, 255, 0.3);
      }
      .nav-item.activo::before {
        content: '';
        position: absolute;
        left: -16px;
        top: 20%;
        bottom: 20%;
        width: 3px;
        border-radius: 3px;
        background: var(--cyan-400);
        box-shadow: 0 0 14px var(--cyan-400);
      }
      .nav-item .badge {
        margin-left: auto;
      }
      .estado-api {
        display: flex;
        align-items: center;
        gap: var(--sp-2);
        margin-top: auto;
        padding: var(--sp-3);
        border: 1px solid var(--line);
        border-radius: var(--r-md);
        font-family: var(--font-data);
        font-size: var(--fs-xs);
        color: var(--tx-300);
      }

      /* ── Zona principal ── */
      .principal {
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .superior {
        position: sticky;
        top: 0;
        z-index: 20;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--sp-4);
        min-height: var(--topbar-h);
        padding: var(--sp-3) var(--sp-6);
        border-bottom: 1px solid var(--line);
        background: rgba(7, 17, 31, 0.6);
        backdrop-filter: var(--glass-blur);
      }
      .superior h1 {
        font-size: var(--fs-xl);
      }
      .acciones {
        display: flex;
        align-items: center;
        gap: var(--sp-3);
      }
      .girando {
        animation: spin 0.9s linear infinite;
      }
      .contenido {
        flex: 1;
        padding: var(--sp-6);
      }

      /* ── Tableta: sidebar compacto ── */
      @media (max-width: 1100px) {
        .shell {
          grid-template-columns: 76px minmax(0, 1fr);
        }
        .marca span,
        .nav-item span,
        .estado-api span:last-child {
          display: none;
        }
        .nav-item {
          justify-content: center;
        }
        .nav-item .badge {
          position: absolute;
          top: 2px;
          right: 4px;
          min-width: 16px;
          height: 16px;
          font-size: 10px;
        }
        .nav-item.activo::before {
          left: -12px;
        }
        .estado-api {
          justify-content: center;
        }
      }

      /* ── Móvil: navegación inferior ── */
      @media (max-width: 720px) {
        .shell {
          grid-template-columns: 1fr;
        }
        .sidebar {
          position: fixed;
          inset: auto 0 0 0;
          z-index: 40;
          height: auto;
          flex-direction: row;
          padding: 6px var(--sp-3);
          border-right: 0;
          border-top: 1px solid var(--line);
          background: rgba(7, 17, 31, 0.92);
        }
        .marca,
        .estado-api {
          display: none;
        }
        nav {
          grid-auto-flow: column;
          grid-auto-columns: 1fr;
          width: 100%;
        }
        .nav-item.activo::before {
          display: none;
        }
        .nav-item:hover {
          transform: none;
        }
        .superior {
          padding: var(--sp-3) var(--sp-4);
        }
        .solo-ancho {
          display: none;
        }
        .contenido {
          padding: var(--sp-4) var(--sp-4) 92px;
        }
      }
    `,
  ],
})
export class App {
  protected readonly store = inject(FleetStore);
  private readonly router = inject(Router);

  protected readonly navegacion: ItemNav[] = [
    { ruta: '/panel', etiqueta: 'Centro de control', icono: 'panel' },
    { ruta: '/vehiculos', etiqueta: 'Vehículos', icono: 'auto' },
    { ruta: '/mantenimientos', etiqueta: 'Mantenimientos', icono: 'llave' },
    { ruta: '/historial', etiqueta: 'Historial', icono: 'historial' },
    { ruta: '/alertas', etiqueta: 'Alertas', icono: 'campana' },
    { ruta: '/estadisticas', etiqueta: 'Estadísticas', icono: 'grafica' },
    { ruta: '/reportes', etiqueta: 'Reportes', icono: 'reporte' },
  ];

  /** Título de la sección actual, tomado de los datos de la ruta. */
  protected readonly titulo = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => {
        let ruta = this.router.routerState.snapshot.root;
        while (ruta.firstChild) ruta = ruta.firstChild;
        return (ruta.data['titulo'] as string | undefined) ?? '';
      }),
    ),
    { initialValue: '' },
  );

  constructor() {
    this.store.refresh();
  }
}
