import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from './config';
import {
  Alerta,
  FiltrosVehiculo,
  Mantenimiento,
  MantenimientoRequest,
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
}
