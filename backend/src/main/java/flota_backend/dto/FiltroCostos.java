package flota_backend.dto;

import java.time.LocalDate;

/**
 * Filtros opcionales del reporte de costos.
 * Cualquiera puede venir en {@code null}, y entonces no se aplica.
 *
 * @param vehiculoId     solo los mantenimientos de este vehículo
 * @param tipoServicioId solo los mantenimientos de este tipo de servicio
 * @param desde          fecha inicial (incluida)
 * @param hasta          fecha final (incluida)
 */
public record FiltroCostos(Long vehiculoId, Long tipoServicioId, LocalDate desde, LocalDate hasta) {
}
