package flota_backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import flota_backend.model.EstadoVehiculo;
import flota_backend.model.Mantenimiento;


public interface MantenimientoRepository extends JpaRepository<Mantenimiento, Long> {

    List<Mantenimiento> findByVehiculoIdOrderByFechaDescIdDesc(Long vehiculoId);

    boolean existsByVehiculoId(Long vehiculoId);

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
}
