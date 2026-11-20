// Modelos que reflejan exactamente los DTO del backend (paquete flota_backend.dto).

export type TipoVehiculo = 'AUTOMOVIL' | 'CAMIONETA' | 'CAMION' | 'BUS' | 'MOTOCICLETA';
export type EstadoVehiculo = 'ACTIVO' | 'INACTIVO';

export interface Vehiculo {
  id: number;
  placa: string;
  tipo: TipoVehiculo;
  marca: string;
  modelo: string;
  kilometrajeActual: number;
  estado: EstadoVehiculo;
}

export interface VehiculoRequest {
  placa: string;
  tipo: TipoVehiculo;
  marca: string;
  modelo: string;
  kilometrajeActual: number;
}

export interface FiltrosVehiculo {
  placa?: string;
  tipo?: TipoVehiculo | '';
  estado?: EstadoVehiculo | '';
}

export interface ResultadoEliminacion {
  eliminadoDefinitivamente: boolean;
  mensaje: string;
}

export interface Mantenimiento {
  id: number;
  vehiculoId: number;
  placa: string;
  tipoServicioId: number;
  tipoServicio: string;
  tallerId: number;
  taller: string;
  /** Fecha ISO (AAAA-MM-DD). */
  fecha: string;
  kilometraje: number;
  costo: number;
}

export interface MantenimientoRequest {
  vehiculoId: number;
  tipoServicioId: number;
  tallerId: number;
  fecha: string;
  kilometraje: number;
  costo: number;
}

export interface TipoServicio {
  id: number;
  nombre: string;
  intervaloKm: number;
  intervaloMeses: number;
}

export interface Taller {
  id: number;
  nombre: string;
  telefono: string | null;
}

export interface Alerta {
  vehiculoId: number;
  placa: string;
  tipoVehiculo: TipoVehiculo;
  kilometrajeActual: number;
  tipoServicioId: number;
  tipoServicio: string;
  fechaUltimoServicio: string;
  kilometrajeUltimoServicio: number;
  fechaProximoServicio: string;
  kilometrajeProximoServicio: number;
  vencidoPorKilometraje: boolean;
  vencidoPorTiempo: boolean;
  kilometrosExcedidos: number;
  diasVencido: number;
}

// ── Datos: estadísticas y reportes ──────────────────────────

/** Una fila de /api/estadisticas/costos: costos de un vehículo en un mes. */
export interface EstadisticaCosto {
  vehiculoId: number;
  placa: string;
  anio: number;
  /** Mes del 1 al 12. */
  mes: number;
  cantidadMantenimientos: number;
  costoTotal: number;
}

/** Una barra del gráfico de /api/estadisticas/tipos-servicio. */
export interface FrecuenciaServicio {
  tipoServicioId: number;
  tipoServicio: string;
  cantidad: number;
  /** Participación sobre el total, de 0 a 100. */
  porcentaje: number;
}

export interface FiltrosFrecuencia {
  vehiculoId?: number | null;
  tipo?: TipoVehiculo | '';
  /** AAAA-MM-DD */
  desde?: string;
  /** AAAA-MM-DD */
  hasta?: string;
}

export interface FiltrosReporte {
  vehiculoId?: number | null;
  tipoServicioId?: number | null;
  /** AAAA-MM-DD */
  desde?: string;
  /** AAAA-MM-DD */
  hasta?: string;
}

export interface ReporteCostos {
  filtros: FiltrosReporte;
  cantidadMantenimientos: number;
  costoTotal: number;
  costoPromedio: number;
  /** Del más reciente al más antiguo. */
  mantenimientos: Mantenimiento[];
}
