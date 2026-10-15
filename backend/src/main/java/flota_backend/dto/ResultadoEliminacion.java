package flota_backend.dto;

/**
 * Resultado de eliminar un vehículo: indica si se borró definitivamente o si,
 * por tener mantenimientos, solo se inactivó.
 *
 * @param eliminadoDefinitivamente {@code true} si el registro se borró; {@code false} si quedó inactivo
 * @param mensaje                  explicación legible de lo que ocurrió
 */
public record ResultadoEliminacion(boolean eliminadoDefinitivamente, String mensaje) {
}
