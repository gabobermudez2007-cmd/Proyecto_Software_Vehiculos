import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, mergeMap, throwError } from 'rxjs';

import { API_URL } from './config';
import {
  Alerta,
  EstadisticaCosto,
  FiltrosFrecuencia,
  FiltrosReporte,
  FiltrosVehiculo,
  FrecuenciaServicio,
  Mantenimiento,
  MantenimientoRequest,
  ReporteCostos,
  ResultadoEliminacion,
  Taller,
  TipoServicio,
  TipoVehiculo,
  Vehiculo,
  VehiculoRequest,
} from './models';

/** Único punto de acceso a la API REST del backend. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  // ── Vehículos ──
  vehiculos(filtros: FiltrosVehiculo = {}): Observable<Vehiculo[]> {
    let params = new HttpParams();
    if (filtros.placa?.trim()) params = params.set('placa', filtros.placa.trim());
    if (filtros.tipo) params = params.set('tipo', filtros.tipo);
    if (filtros.estado) params = params.set('estado', filtros.estado);
    return this.http.get<Vehiculo[]>(`${API_URL}/vehiculos`, { params });
  }

  vehiculo(id: number): Observable<Vehiculo> {
    return this.http.get<Vehiculo>(`${API_URL}/vehiculos/${id}`);
  }

  crearVehiculo(cuerpo: VehiculoRequest): Observable<Vehiculo> {
    return this.http.post<Vehiculo>(`${API_URL}/vehiculos`, cuerpo);
  }

  actualizarVehiculo(id: number, cuerpo: VehiculoRequest): Observable<Vehiculo> {
    return this.http.put<Vehiculo>(`${API_URL}/vehiculos/${id}`, cuerpo);
  }

  eliminarVehiculo(id: number): Observable<ResultadoEliminacion> {
    return this.http.delete<ResultadoEliminacion>(`${API_URL}/vehiculos/${id}`);
  }

  // ── Mantenimientos ──
  historial(vehiculoId: number): Observable<Mantenimiento[]> {
    return this.http.get<Mantenimiento[]>(`${API_URL}/mantenimientos/vehiculo/${vehiculoId}`);
  }

  registrarMantenimiento(cuerpo: MantenimientoRequest): Observable<Mantenimiento> {
    return this.http.post<Mantenimiento>(`${API_URL}/mantenimientos`, cuerpo);
  }

  // ── Catálogos ──
  tiposServicio(): Observable<TipoServicio[]> {
    return this.http.get<TipoServicio[]>(`${API_URL}/tipos-servicio`);
  }

  talleres(): Observable<Taller[]> {
    return this.http.get<Taller[]>(`${API_URL}/talleres`);
  }

  // ── Alertas ──
  alertas(tipo?: TipoVehiculo | ''): Observable<Alerta[]> {
    let params = new HttpParams();
    if (tipo) params = params.set('tipo', tipo);
    return this.http.get<Alerta[]>(`${API_URL}/alertas`, { params });
  }

  // ── Estadísticas ──
  /** Costos de mantenimiento agrupados por vehículo y mes (toda la flota). */
  estadisticasCostos(): Observable<EstadisticaCosto[]> {
    return this.http.get<EstadisticaCosto[]>(`${API_URL}/estadisticas/costos`);
  }

  /** Frecuencia de cada tipo de servicio; todos los filtros son opcionales. */
  frecuenciaServicios(filtros: FiltrosFrecuencia = {}): Observable<FrecuenciaServicio[]> {
    const params = parametros({
      vehiculoId: filtros.vehiculoId,
      tipo: filtros.tipo,
      desde: filtros.desde,
      hasta: filtros.hasta,
    });
    return this.http.get<FrecuenciaServicio[]>(`${API_URL}/estadisticas/tipos-servicio`, { params });
  }

  // ── Reportes ──
  reporteCostos(filtros: FiltrosReporte = {}): Observable<ReporteCostos> {
    return this.http.get<ReporteCostos>(`${API_URL}/reportes/costos`, { params: parametrosReporte(filtros) });
  }

  /** El mismo reporte como archivo CSV. Los errores del servidor se devuelven ya interpretados (JSON). */
  descargarCsv(filtros: FiltrosReporte = {}): Observable<Blob> {
    return this.http
      .get(`${API_URL}/reportes/costos/csv`, { params: parametrosReporte(filtros), responseType: 'blob' })
      .pipe(
        catchError((e: HttpErrorResponse) => {
          if (!(e.error instanceof Blob)) return throwError(() => e);
          // Con responseType 'blob' el cuerpo del error también llega como Blob: se lee como texto.
          return from(e.error.text()).pipe(
            mergeMap((texto) => {
              let cuerpo: unknown = null;
              try {
                cuerpo = JSON.parse(texto);
              } catch {
                /* el cuerpo no era JSON */
              }
              return throwError(
                () => new HttpErrorResponse({ error: cuerpo, status: e.status, statusText: e.statusText, url: e.url ?? undefined }),
              );
            }),
          );
        }),
      );
  }
}

/** Arma HttpParams omitiendo los valores vacíos. */
function parametros(valores: Record<string, string | number | null | undefined>): HttpParams {
  let params = new HttpParams();
  for (const [clave, valor] of Object.entries(valores)) {
    if (valor !== null && valor !== undefined && valor !== '') params = params.set(clave, String(valor));
  }
  return params;
}

function parametrosReporte(f: FiltrosReporte): HttpParams {
  return parametros({ vehiculoId: f.vehiculoId, tipoServicioId: f.tipoServicioId, desde: f.desde, hasta: f.hasta });
}
