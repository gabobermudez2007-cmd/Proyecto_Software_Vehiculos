package flota_backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import flota_backend.model.EstadoVehiculo;
import flota_backend.model.Mantenimiento;

/**
 * Acceso a datos de los mantenimientos.
 */
public interface MantenimientoRepository extends JpaRepository<Mantenimiento, Long> {

    /** Historial de un vehículo, del mantenimiento más reciente al más antiguo. */
    List<Mantenimiento> findByVehiculoIdOrderByFechaDescIdDesc(Long vehiculoId);

    /** Indica si el vehículo tiene mantenimientos (para decidir entre borrar o inactivar). */
    boolean existsByVehiculoId(Long vehiculoId);

    /**
     * Mayor kilometraje entre los mantenimientos vigentes (no anulados) de un vehículo.
     *
     * @return el kilometraje, o {@code null} si el vehículo no tiene mantenimientos
     */
    @Query("""
            SELECT MAX(m.kilometraje) FROM Mantenimiento m
            WHERE m.vehiculo.id = :vehiculoId AND m.anulado = false
            """)
    Integer kilometrajeMaximoDelVehiculo(@Param("vehiculoId") Long vehiculoId);

    /**
     * Mantenimientos vigentes (no anulados) de los vehículos que están en el estado indicado.
     * Trae el vehículo y el tipo de servicio en la misma consulta (JOIN FETCH), porque el
     * cálculo de las alertas los necesita para cada mantenimiento.
     */
    @Query("""
            SELECT m FROM Mantenimiento m
            JOIN FETCH m.vehiculo v
            JOIN FETCH m.tipoServicio
            WHERE m.anulado = false AND v.estado = :estado
            """)
    List<Mantenimiento> vigentesDeVehiculosEnEstado(@Param("estado") EstadoVehiculo estado);
}
