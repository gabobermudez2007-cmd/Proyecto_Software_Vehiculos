import { Component, computed, input } from '@angular/core';

/** Biblioteca de iconos de trazo (rejilla 24×24). Para añadir uno, basta con agregarlo aquí. */
const ICONOS = {
  panel: ['M3 3h8v8H3z', 'M13 3h8v5h-8z', 'M13 11h8v10h-8z', 'M3 14h8v7H3z'],
  auto: [
    'M5 16l1.6-5.2A2 2 0 0 1 8.5 9.4h7a2 2 0 0 1 1.9 1.4L19 16',
    'M3 16h18v3.2a.8.8 0 0 1-.8.8h-1.9a.8.8 0 0 1-.8-.8V18H6.5v1.2a.8.8 0 0 1-.8.8H3.8a.8.8 0 0 1-.8-.8z',
    'M7.5 13.2h.01',
    'M16.5 13.2h.01',
  ],
  llave: ['M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z'],
  historial: ['M3 12a9 9 0 1 0 3-6.7L3 8', 'M3 3v5h5', 'M12 7.5V12l3 2'],
  campana: ['M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8', 'M10 20a2 2 0 0 0 4 0'],
  mas: ['M12 5v14', 'M5 12h14'],
  buscar: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M21 21l-4.3-4.3'],
  editar: ['M4 20h4L19 9l-4-4L4 16z', 'M13.5 6.5l4 4'],
  papelera: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13', 'M10 11v6', 'M14 11v6'],
  cerrar: ['M6 6l12 12', 'M18 6L6 18'],
  ok: ['M5 12.5l4.5 4.5L19 7.5'],
  aviso: ['M12 3.5l10 17.5H2z', 'M12 10v4.5', 'M12 17.8h.01'],
  flecha: ['M5 12h14', 'M13 6l6 6-6 6'],
  atras: ['M19 12H5', 'M11 6l-6 6 6 6'],
  tablero: ['M4.5 17a8.5 8.5 0 1 1 15 0', 'M12 13l4-4', 'M12 13h.01'],
  calendario: ['M4 6h16v14H4z', 'M4 10h16', 'M8 3v4', 'M16 3v4'],
  taller: ['M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z', 'M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'],
  moneda: [
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
    'M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1 0-2-.5-2.5-1.5',
    'M12 6.5V8',
    'M12 16v1.5',
  ],
  actualizar: ['M20 11a8 8 0 0 0-14.5-4', 'M4 4v4h4', 'M4 13a8 8 0 0 0 14.5 4', 'M20 20v-4h-4'],
  info: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 11v5', 'M12 8h.01'],
  estructura: ['M12 3l8 4.5v9L12 21l-8-4.5v-9z', 'M12 12l8-4.5', 'M12 12v9', 'M12 12L4 7.5'],
  solido: ['M12 3l8 4.5v9L12 21l-8-4.5v-9z', 'M12 12l8-4.5', 'M12 12v9', 'M12 12L4 7.5'],
  grafica: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M22 20H2'],
  reporte: ['M6 3h9l4 4v14H6z', 'M15 3v4h4', 'M9 12h7', 'M9 16h7'],
  descargar: ['M12 4v11', 'M7 10.5l5 5 5-5', 'M5 20h14'],
  ajustes: ['M4 7h9', 'M17 7h3', 'M13 5v4h4V5z', 'M4 17h3', 'M11 17h9', 'M7 15v4h4v-4z'],
  cuadricula: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
} as const;

export type NombreIcono = keyof typeof ICONOS;

@Component({
  selector: 'app-icon',
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    @for (d of trazos(); track $index) {
      <path [attr.d]="d" />
    }
  </svg>`,
  styles: [
    `
      :host {
        display: inline-flex;
        width: 1.25em;
        height: 1.25em;
        flex: none;
      }
      svg {
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class Icon {
  readonly nombre = input.required<NombreIcono>();
  protected readonly trazos = computed(() => ICONOS[this.nombre()] as readonly string[]);
}
