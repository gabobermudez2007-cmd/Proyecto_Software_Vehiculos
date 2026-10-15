package flota_backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
}
