package flota_backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import flota_backend.model.TipoServicio;

/**
 * Acceso a datos de los tipos de servicio.
 */
public interface TipoServicioRepository extends JpaRepository<TipoServicio, Long> {

    Optional<TipoServicio> findByNombre(String nombre);
}
