import { HttpErrorResponse } from '@angular/common/http';

/** Traduce cualquier error HTTP en un mensaje legible para el usuario. */
export function mensajeDeError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return 'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución (puerto 8080).';
    }
    const cuerpo = err.error as { errores?: Record<string, string>; detail?: string } | null;
    if (cuerpo && typeof cuerpo === 'object') {
      if (cuerpo.errores && Object.keys(cuerpo.errores).length > 0) {
        return Object.values(cuerpo.errores).join(' · ');
      }
      if (cuerpo.detail) return cuerpo.detail;
    }
    if (err.status === 404) return 'No se encontró el recurso solicitado.';
    return `El servidor respondió con un error (${err.status}).`;
  }
  return 'Ocurrió un error inesperado.';
}
