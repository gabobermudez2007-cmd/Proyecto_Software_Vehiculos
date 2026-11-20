import {
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import type * as ThreeNS from 'three';

import { TipoVehiculo } from '../core/models';
import { Icon } from './icon';
import {
  Three,
  Vehiculo3D,
  construirPlataforma,
  construirVehiculo,
  encuadrar,
  liberar,
  prepararEscena,
} from './vehicle-model';

/**
 * Escenario 3D interactivo: el vehículo gira sobre una plataforma iluminada.
 * Arrastra para rotarlo. Three.js se descarga solo cuando este componente aparece.
 */
@Component({
  selector: 'app-vehicle-stage',
  imports: [Icon],
  template: `
    <div #contenedor class="escenario" aria-hidden="true"></div>
    @if (cargando()) {
      <div class="aviso"><span class="giro"></span><small>Preparando vista 3D</small></div>
    }
    @if (fallo()) {
      <div class="aviso">
        <app-icon nombre="auto" />
        <small>La vista 3D no está disponible en este navegador.</small>
      </div>
    }
  `,
  styles: [
    `
      :host {
        position: relative;
        display: block;
        width: 100%;
        height: 100%;
        min-height: 260px;
      }
      .escenario {
        position: absolute;
        inset: 0;
        cursor: grab;
        touch-action: pan-y;
      }
      .escenario:active {
        cursor: grabbing;
      }
      .escenario :is(canvas) {
        display: block;
        width: 100%;
        height: 100%;
      }
      .aviso {
        position: absolute;
        inset: 0;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: var(--sp-3);
        color: var(--tx-300);
        pointer-events: none;
      }
      .aviso app-icon {
        font-size: 2.4rem;
        color: var(--tx-400);
      }
      .giro {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        border: 2px solid var(--line-strong);
        border-top-color: var(--cyan-400);
        animation: spin 0.9s linear infinite;
      }
    `,
  ],
})
export class VehicleStage {
  readonly tipo = input.required<TipoVehiculo>();
  readonly inactivo = input(false);
  readonly modo = input<'solido' | 'estructura'>('solido');

  protected readonly cargando = signal(true);
  protected readonly fallo = signal(false);

  private readonly contenedor = viewChild.required<ElementRef<HTMLDivElement>>('contenedor');
  private readonly zona = inject(NgZone);

  private T!: Three;
  private renderer!: ThreeNS.WebGLRenderer;
  private escena!: ThreeNS.Scene;
  private camara!: ThreeNS.PerspectiveCamera;
  private vehiculo: Vehiculo3D | null = null;
  private plataforma: ThreeNS.Group | null = null;
  private listo = false;
  private destruido = false;
  private raf = 0;
  private rotObjetivo = -0.55;
  private rotActual = -0.55;
  private entrada = 1;
  private arrastrando = false;
  private ultimoX = 0;
  private visible = true;
  private observadorTamano?: ResizeObserver;
  private observadorVisible?: IntersectionObserver;
  private readonly reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor() {
    afterNextRender(() => {
      this.zona.runOutsideAngular(() => void this.iniciar());
    });

    // Cambia el vehículo mostrado al seleccionar otro tipo.
    effect(() => {
      const tipo = this.tipo();
      if (this.listo) this.zona.runOutsideAngular(() => this.cambiarModelo(tipo));
    });

    // Modo sólido / estructura y vehículos inactivos.
    effect(() => {
      this.modo();
      this.inactivo();
      if (this.listo) this.aplicarApariencia();
    });

    inject(DestroyRef).onDestroy(() => this.destruir());
  }

  private async iniciar(): Promise<void> {
    try {
      const [T, sala] = await Promise.all([
        import('three'),
        import('three/examples/jsm/environments/RoomEnvironment.js'),
      ]);
      if (this.destruido) return;
      this.T = T;

      const contenedor = this.contenedor().nativeElement;
      this.renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.toneMapping = T.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.1;
      contenedor.appendChild(this.renderer.domElement);

      this.escena = prepararEscena(T, this.renderer, sala.RoomEnvironment);
      this.camara = new T.PerspectiveCamera(30, 1, 0.1, 100);

      const canvas = this.renderer.domElement;
      canvas.addEventListener('pointerdown', (e) => {
        this.arrastrando = true;
        this.ultimoX = e.clientX;
        canvas.setPointerCapture(e.pointerId);
      });
      canvas.addEventListener('pointermove', (e) => {
        if (!this.arrastrando) return;
        this.rotObjetivo += (e.clientX - this.ultimoX) * 0.012;
        this.ultimoX = e.clientX;
      });
      const soltar = () => (this.arrastrando = false);
      canvas.addEventListener('pointerup', soltar);
      canvas.addEventListener('pointercancel', soltar);

      this.observadorTamano = new ResizeObserver(() => this.ajustarTamano());
      this.observadorTamano.observe(contenedor);
      this.observadorVisible = new IntersectionObserver(([entrada]) => (this.visible = entrada.isIntersecting));
      this.observadorVisible.observe(contenedor);

      this.listo = true;
      this.ajustarTamano();
      this.cambiarModelo(this.tipo());
      this.cargando.set(false);
      this.bucle();
    } catch {
      this.zona.run(() => {
        this.cargando.set(false);
        this.fallo.set(true);
      });
    }
  }

  private ajustarTamano(): void {
    const el = this.contenedor().nativeElement;
    const ancho = el.clientWidth;
    const alto = el.clientHeight;
    if (ancho === 0 || alto === 0) return;
    this.renderer.setSize(ancho, alto, false);
    this.camara.aspect = ancho / alto;
    this.camara.updateProjectionMatrix();
    this.reencuadrar();
  }

  private reencuadrar(): void {
    if (!this.vehiculo) return;
    encuadrar(this.T, this.camara, this.vehiculo.grupo, this.vehiculo.semiLargo + 0.9);
  }

  private cambiarModelo(tipo: TipoVehiculo): void {
    const T = this.T;
    if (this.vehiculo) {
      this.escena.remove(this.vehiculo.grupo);
      liberar(this.vehiculo.grupo);
    }
    if (this.plataforma) {
      this.escena.remove(this.plataforma);
      liberar(this.plataforma);
    }
    this.vehiculo = construirVehiculo(T, tipo);
    this.plataforma = construirPlataforma(T, this.vehiculo.semiLargo + 0.9);
    this.escena.add(this.plataforma, this.vehiculo.grupo);
    this.vehiculo.grupo.rotation.y = this.rotActual;
    this.entrada = 0;
    this.aplicarApariencia();
    this.reencuadrar();
  }

  private aplicarApariencia(): void {
    const v = this.vehiculo;
    if (!v) return;
    const estructura = this.modo() === 'estructura';
    const inactivo = this.inactivo();
    v.materialCuerpo.wireframe = estructura;
    v.materialCuerpo.color.set(inactivo ? 0x2a3447 : 0x12305f);
    v.materialVidrio.visible = !estructura;
    v.materialesBorde.forEach((m, i) => m.color.set(inactivo ? 0x7488a8 : i % 2 === 0 ? 0x00c8e8 : 0x9cc4ff));
  }

  private readonly bucle = (): void => {
    this.raf = requestAnimationFrame(this.bucle);
    if (!this.visible || document.hidden || !this.vehiculo) return;

    if (!this.arrastrando && !this.reducido) this.rotObjetivo += 0.0035;
    this.rotActual += (this.rotObjetivo - this.rotActual) * 0.08;

    this.entrada = Math.min(1, this.entrada + 0.035);
    const suave = 1 - Math.pow(1 - this.entrada, 3);
    this.vehiculo.grupo.rotation.y = this.rotActual;
    this.vehiculo.grupo.scale.setScalar(0.88 + 0.12 * suave);
    if (this.plataforma && !this.reducido) this.plataforma.rotation.y -= 0.0008;

    this.renderer.render(this.escena, this.camara);
  };

  private destruir(): void {
    this.destruido = true;
    cancelAnimationFrame(this.raf);
    this.observadorTamano?.disconnect();
    this.observadorVisible?.disconnect();
    if (!this.listo) return;
    if (this.vehiculo) liberar(this.vehiculo.grupo);
    if (this.plataforma) liberar(this.plataforma);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
