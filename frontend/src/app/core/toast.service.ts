import { Injectable, signal } from '@angular/core';

export type TipoToast = 'exito' | 'error' | 'info';

export interface Toast {
  id: number;
  tipo: TipoToast;
  mensaje: string;
}

/** Notificaciones breves tras ejecutar una acción. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private siguiente = 1;
  readonly toasts = signal<Toast[]>([]);

  exito(mensaje: string): void {
    this.mostrar('exito', mensaje, 4500);
  }

  error(mensaje: string): void {
    this.mostrar('error', mensaje, 8000);
  }

  info(mensaje: string): void {
    this.mostrar('info', mensaje, 4500);
  }

  cerrar(id: number): void {
    this.toasts.update((lista) => lista.filter((t) => t.id !== id));
  }

  private mostrar(tipo: TipoToast, mensaje: string, duracion: number): void {
    const id = this.siguiente++;
    this.toasts.update((lista) => [...lista, { id, tipo, mensaje }]);
    setTimeout(() => this.cerrar(id), duracion);
  }
}
