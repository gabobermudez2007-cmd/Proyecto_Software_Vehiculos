package flota_backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import flota_backend.model.Taller;


public interface TallerRepository extends JpaRepository<Taller, Long> {

    Optional<Taller> findByNombre(String nombre);
}
