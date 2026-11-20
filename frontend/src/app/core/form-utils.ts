import { AbstractControl } from '@angular/forms';

/** Un campo se marca como inválido solo después de tocarlo o enviar el formulario. */
export function esInvalido(control: AbstractControl | null): boolean {
  return !!control && control.invalid && (control.touched || control.dirty);
}

/** Mensaje de validación en español para los errores más comunes. */
export function textoError(control: AbstractControl | null, personalizados: Record<string, string> = {}): string {
  const errores = control?.errors;
  if (!errores) return '';
  for (const clave of Object.keys(errores)) {
    if (personalizados[clave]) return personalizados[clave];
  }
  if (errores['required']) return 'Este campo es obligatorio.';
  if (errores['pattern']) return 'El valor ingresado no es válido.';
  if (errores['min']) return 'No puede ser negativo.';
  if (errores['max']) return 'El valor supera el máximo permitido.';
  if (errores['maxlength']) return `Máximo ${errores['maxlength'].requiredLength} caracteres.`;
  return 'Valor inválido.';
}
