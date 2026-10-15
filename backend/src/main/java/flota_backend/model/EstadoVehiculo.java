package flota_backend.model;

/**
 * Estado de un vehículo dentro de la flota. Un vehículo dado de baja queda
 * INACTIVO en lugar de borrarse, para conservar su historial de mantenimientos.
 */
public enum EstadoVehiculo {
    ACTIVO,
    INACTIVO
}
