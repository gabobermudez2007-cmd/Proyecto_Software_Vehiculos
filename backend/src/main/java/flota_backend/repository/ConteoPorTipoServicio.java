package flota_backend.repository;

/**
 * Fila del conteo de mantenimientos agrupados por tipo de servicio.
 * <p>
 * No es una entidad ni sale por la API: es el resultado intermedio de la consulta
 * {@link MantenimientoRepository#contarPorTipoServicio}, que lo construye directamente en
 * el {@code SELECT new ...}. Así la base de datos hace el conteo ({@code GROUP BY}) y la
 * aplicación no tiene que cargar todos los mantenimientos en memoria para contarlos.
 *
 * @param tipoServicioId identificador del tipo de servicio
 * @param cantidad       número de mantenimientos de ese tipo que cumplen los filtros
 */
public record ConteoPorTipoServicio(Long tipoServicioId, Long cantidad) {
}
