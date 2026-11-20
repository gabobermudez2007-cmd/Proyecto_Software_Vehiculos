import { Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';

/** Número que se anima de forma progresiva hasta su valor (indicadores del panel). */
@Component({
  selector: 'app-counter',
  template: `{{ mostrado() }}`,
})
export class Counter {
  readonly valor = input.required<number>();
  readonly duracion = input(900);

  protected readonly mostrado = signal(0);
  private raf = 0;

  constructor() {
    effect(() => {
      const destino = this.valor();
      untracked(() => this.animar(destino));
    });
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.raf));
  }

  private animar(destino: number): void {
    cancelAnimationFrame(this.raf);
    const inicio = this.mostrado();
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duracion = reducido ? 0 : this.duracion();
    const t0 = performance.now();
    const paso = (t: number) => {
      const k = duracion === 0 ? 1 : Math.min(1, (t - t0) / duracion);
      const suave = 1 - Math.pow(1 - k, 3);
      this.mostrado.set(Math.round(inicio + (destino - inicio) * suave));
      if (k < 1) this.raf = requestAnimationFrame(paso);
    };
    this.raf = requestAnimationFrame(paso);
  }
}
