package flota_backend.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import flota_backend.model.EstadoVehiculo;
import flota_backend.model.Mantenimiento;
import flota_backend.model.TipoVehiculo;


public interface MantenimientoRepository extends JpaRepository<Mantenimiento, Long> {

    List<Mantenimiento> findByVehiculoIdOrderByFechaDescIdDesc(Long vehiculoId);

    boolean existsByVehiculoId(Long vehiculoId);

    /** Mantenimientos vigentes de un vehículo en el orden en que se registraron (por id). */
    List<Mantenimiento> findByVehiculoIdAndAnuladoFalseOrderByIdAsc(Long vehiculoId);

    /** Cuántos mantenimientos (vigentes o anulados) se hicieron en un taller. */
    long countByTallerId(Long tallerId);

    /** Cuántos mantenimientos (vigentes o anulados) son de un tipo de servicio. */
    long countByTipoServicioId(Long tipoServicioId);

    /**
     * @return el kilometraje, o {@code null} si el vehículo no tiene mantenimientos
     */
    @Query("""
            SELECT MAX(m.kilometraje) FROM Mantenimiento m
            WHERE m.vehiculo.id = :vehiculoId AND m.anulado = false
            """)
    Integer kilometrajeMaximoDelVehiculo(@Param("vehiculoId") Long vehiculoId);

    @Query("""
            SELECT m FROM Mantenimiento m
            JOIN FETCH m.vehiculo v
            JOIN FETCH m.tipoServicio
            WHERE m.anulado = false AND v.estado = :estado
            """)
    List<Mantenimiento> vigentesDeVehiculosEnEstado(@Param("estado") EstadoVehiculo estado);

    /**
     * Mantenimientos vigentes (no anulados) que cumplen los filtros; cada filtro es opcional
     * (si llega {@code null} no se aplica). Base del reporte de costos.
     *
     * @return del más reciente al más antiguo
     */
    @Query("""
            SELECT m FROM Mantenimiento m
            JOIN FETCH m.vehiculo v
            JOIN FETCH m.tipoServicio t
            JOIN FETCH m.taller
            WHERE m.anulado = false
              AND (:vehiculoId IS NULL OR v.id = :vehiculoId)
              AND (:tipoServicioId IS NULL OR t.id = :tipoServicioId)
              AND (:desde IS NULL OR m.fecha >= :desde)
              AND (:hasta IS NULL OR m.fecha <= :hasta)
            ORDER BY m.fecha DESC, m.id DESC
            """)
    List<Mantenimiento> filtrar(@Param("vehiculoId") Long vehiculoId,
            @Param("tipoServicioId") Long tipoServicioId,
            @Param("desde") LocalDate desde,
            @Param("hasta") LocalDate hasta);

    /**
     * Cuenta los mantenimientos vigentes (no anulados) de cada tipo de servicio.
     * <p>
     * Cada filtro es opcional: si llega {@code null}, la condición {@code :x IS NULL} se
     * cumple y ese filtro no se aplica (el mismo patrón que {@link VehiculoRepository#buscar}).
     * Solo aparecen los tipos de servicio que tienen al menos un mantenimiento; los que no
     * tienen ninguno los completa {@code EstadisticaService} con cantidad cero.
     *
     * @param vehiculoId solo los mantenimientos de este vehículo (puede ser nulo: toda la flota)
     * @param tipo       tipo de vehículo (puede ser nulo)
     * @param desde      fecha inicial, incluida (puede ser nula)
     * @param hasta      fecha final, incluida (puede ser nula)
     * @return una fila por tipo de servicio con mantenimientos, sin un orden particular
     */
    @Query("""
            SELECT new flota_backend.repository.ConteoPorTipoServicio(m.tipoServicio.id, COUNT(m))
            FROM Mantenimiento m
            WHERE m.anulado = false
              AND (:vehiculoId IS NULL OR m.vehiculo.id = :vehiculoId)
              AND (:tipo IS NULL OR m.vehiculo.tipo = :tipo)
              AND (:desde IS NULL OR m.fecha >= :desde)
              AND (:hasta IS NULL OR m.fecha <= :hasta)
            GROUP BY m.tipoServicio.id
            """)
    List<ConteoPorTipoServicio> contarPorTipoServicio(@Param("vehiculoId") Long vehiculoId,
            @Param("tipo") TipoVehiculo tipo,
            @Param("desde") LocalDate desde,
            @Param("hasta") LocalDate hasta);
}
