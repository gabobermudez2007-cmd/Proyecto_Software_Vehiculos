package flota_backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import flota_backend.model.Vehiculo;

/**
 * Acceso a datos de los vehículos.
 */
public interface VehiculoRepository extends JpaRepository<Vehiculo, Long> {

    boolean existsByPlaca(String placa);

    Optional<Vehiculo> findByPlaca(String placa);
}
