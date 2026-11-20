import { Injectable, signal } from '@angular/core';

export interface OpcionesConfirmacion {
  titulo: string;
  mensaje: string;
  confirmar?: string;
  cancelar?: string;
  /** Pinta el botón de confirmación en rojo (acciones destructivas). */
  peligro?: boolean;
}

interface Pendiente extends OpcionesConfirmacion {
  resolver: (aceptado: boolean) => void;
}

/** Diálogo de confirmación reutilizable (por ejemplo, antes de eliminar). */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly actual = signal<Pendiente | null>(null);

  confirmar(opciones: OpcionesConfirmacion): Promise<boolean> {
    return new Promise<boolean>((resolver) => {
      this.actual.set({ ...opciones, resolver });
    });
  }

  responder(aceptado: boolean): void {
    const pendiente = this.actual();
    this.actual.set(null);
    pendiente?.resolver(aceptado);
  }
}
