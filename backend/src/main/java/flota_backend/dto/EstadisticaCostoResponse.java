
package flota_backend.dto;

import java.math.BigDecimal;

/**
 * Estadísticas mensuales de costos de mantenimiento
 * correspondientes a un vehículo.
 */
public record EstadisticaCostoResponse(
        Long vehiculoId,
        String placa,
        int anio,
        int mes,
        long cantidadMantenimientos,
        BigDecimal costoTotal
) {
}
