import { Injectable, signal } from '@angular/core';

import { TipoVehiculo } from '../core/models';
import { TIPOS } from '../core/vehicle-meta';
import { construirVehiculo, encuadrar, liberar, prepararEscena } from './vehicle-model';

/**
 * Genera una vez un render 3D (imagen PNG transparente) por cada tipo de vehículo.
 * Las tarjetas de la galería usan estas imágenes en lugar de abrir un contexto WebGL por tarjeta,
 * lo que mantiene el rendimiento aunque la flota sea grande.
 */
@Injectable({ providedIn: 'root' })
export class VehicleRenderService {
  readonly miniaturas = signal<Partial<Record<TipoVehiculo, string>>>({});
  readonly fallo = signal(false);

  private iniciado = false;

  solicitar(): void {
    if (this.iniciado) return;
    this.iniciado = true;
    this.generar().catch(() => this.fallo.set(true));
  }

  private async generar(): Promise<void> {
    const [T, sala] = await Promise.all([
      import('three'),
      import('three/examples/jsm/environments/RoomEnvironment.js'),
    ]);

    const ancho = 720;
    const alto = 400;
    const canvas = document.createElement('canvas');
    const renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(ancho, alto, false);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const escena = prepararEscena(T, renderer, sala.RoomEnvironment);
    const camara = new T.PerspectiveCamera(28, ancho / alto, 0.1, 100);

    for (const tipo of TIPOS) {
      // Cede el hilo entre renders para no bloquear la interfaz.
      await new Promise((resolver) => setTimeout(resolver, 30));
      const vehiculo = construirVehiculo(T, tipo.valor);
      vehiculo.grupo.rotation.y = -0.6;
      escena.add(vehiculo.grupo);
      encuadrar(T, camara, vehiculo.grupo, 0, 0.2);
      renderer.render(escena, camara);
      const url = canvas.toDataURL('image/png');
      this.miniaturas.update((m) => ({ ...m, [tipo.valor]: url }));
      escena.remove(vehiculo.grupo);
      liberar(vehiculo.grupo);
    }

    renderer.dispose();
    renderer.forceContextLoss();
  }
}
