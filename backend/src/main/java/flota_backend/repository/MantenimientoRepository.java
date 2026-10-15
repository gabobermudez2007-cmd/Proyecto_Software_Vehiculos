package flota_backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import flota_backend.model.Mantenimiento;

/**
 * Acceso a datos de los mantenimientos.
 */
public interface MantenimientoRepository extends JpaRepository<Mantenimiento, Long> {

    /** Historial de un vehículo, del mantenimiento más reciente al más antiguo. */
    List<Mantenimiento> findByVehiculoIdOrderByFechaDescIdDesc(Long vehiculoId);

    /** Indica si el vehículo tiene mantenimientos (para decidir entre borrar o inactivar). */
    boolean existsByVehiculoId(Long vehiculoId);
}
