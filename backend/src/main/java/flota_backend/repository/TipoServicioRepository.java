package flota_backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import flota_backend.model.TipoServicio;


public interface TipoServicioRepository extends JpaRepository<TipoServicio, Long> {

    Optional<TipoServicio> findByNombre(String nombre);
}
