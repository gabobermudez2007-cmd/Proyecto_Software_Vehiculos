package flota_backend.dto;

/**
 * @param eliminadoDefinitivamente {@code true} si el registro se borró; {@code false} si quedó inactivo
 * @param mensaje                  explicación legible de lo que ocurrió
 */
public record ResultadoEliminacion(boolean eliminadoDefinitivamente, String mensaje) {
}
