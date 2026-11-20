import { Component, computed, input } from '@angular/core';

/** Kilometraje al estilo de un cuadro de instrumentos: una celda por dígito. */
@Component({
  selector: 'app-odometer',
  template: `
    <span class="odo" role="img" [attr.aria-label]="valor() + ' kilómetros'">
      @for (c of celdas(); track $index) {
        <b class="celda" [class.cero]="c.cero" [class.grupo]="c.grupo">{{ c.digito }}</b>
      }
      <small>km</small>
    </span>
  `,
  styles: [
    `
      .odo {
        display: inline-flex;
        align-items: stretch;
        gap: 3px;
        font-family: var(--font-data);
      }
      .celda {
        display: grid;
        place-items: center;
        min-width: 1.35em;
        padding: 0.28em 0.18em;
        border-radius: var(--r-sm);
        border: 1px solid var(--line-strong);
        background: linear-gradient(180deg, rgba(7, 17, 31, 0.95), rgba(23, 43, 74, 0.7));
        color: var(--tx-100);
        font-size: var(--odo-size, 1.5rem);
        font-weight: 700;
        line-height: 1;
        box-shadow: inset 0 -8px 12px -10px rgba(0, 200, 232, 0.45);
      }
      .celda.cero {
        color: var(--tx-400);
        opacity: 0.55;
      }
      .celda.grupo {
        margin-left: 6px;
      }
      small {
        align-self: flex-end;
        margin-left: 6px;
        padding-bottom: 0.2em;
        font-size: 0.75rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--cyan-400);
      }
    `,
  ],
})
export class Odometer {
  readonly valor = input.required<number>();
  /** Cantidad mínima de dígitos (se rellena con ceros atenuados). */
  readonly digitos = input(6);

  protected readonly celdas = computed(() => {
    const texto = String(Math.max(0, Math.trunc(this.valor())));
    const total = Math.max(this.digitos(), texto.length);
    const relleno = total - texto.length;
    const completo = texto.padStart(total, '0');
    return completo.split('').map((digito, i) => ({
      digito,
      cero: i < relleno,
      grupo: i > 0 && (total - i) % 3 === 0,
    }));
  });
}
