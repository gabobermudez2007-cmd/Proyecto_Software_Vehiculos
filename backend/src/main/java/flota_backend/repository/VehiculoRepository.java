package flota_backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import flota_backend.model.EstadoVehiculo;
import flota_backend.model.TipoVehiculo;
import flota_backend.model.Vehiculo;

/**
 * Acceso a datos de los vehículos.
 */
public interface VehiculoRepository extends JpaRepository<Vehiculo, Long> {

    boolean existsByPlaca(String placa);

    Optional<Vehiculo> findByPlaca(String placa);

    /**
     * Busca vehículos combinando filtros opcionales. La placa se busca por coincidencia
     * parcial (un texto vacío no filtra); el tipo y el estado, si son nulos, no filtran.
     */
    @Query("""
            SELECT v FROM Vehiculo v
            WHERE v.placa LIKE CONCAT('%', :placa, '%')
              AND (:tipo IS NULL OR v.tipo = :tipo)
              AND (:estado IS NULL OR v.estado = :estado)
            ORDER BY v.placa
            """)
    List<Vehiculo> buscar(@Param("placa") String placa,
            @Param("tipo") TipoVehiculo tipo,
            @Param("estado") EstadoVehiculo estado);
}
