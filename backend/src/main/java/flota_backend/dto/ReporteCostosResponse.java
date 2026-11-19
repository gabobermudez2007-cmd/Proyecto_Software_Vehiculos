package flota_backend.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Reporte de costos con los filtros aplicados: los totales y el detalle de cada mantenimiento.
 *
 * @param filtros                los filtros con los que se generó el reporte
 * @param cantidadMantenimientos número de mantenimientos del reporte
 * @param costoTotal             suma de los costos
 * @param costoPromedio          costo promedio por mantenimiento (0 si no hay ninguno)
 * @param mantenimientos         detalle, del más reciente al más antiguo
 */
public record ReporteCostosResponse(
        FiltroCostos filtros,
        long cantidadMantenimientos,
        BigDecimal costoTotal,
        BigDecimal costoPromedio,
        List<MantenimientoResponse> mantenimientos) {
}
