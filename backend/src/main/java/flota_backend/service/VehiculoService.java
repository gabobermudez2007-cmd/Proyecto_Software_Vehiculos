package flota_backend.service;

import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import flota_backend.dto.VehiculoRequest;
import flota_backend.dto.VehiculoResponse;
import flota_backend.exception.PlacaDuplicadaException;
import flota_backend.model.Vehiculo;
import flota_backend.repository.VehiculoRepository;

/**
 * Reglas de negocio para la gestión de vehículos.
 */
@Service
public class VehiculoService {

    private final VehiculoRepository vehiculoRepository;

    public VehiculoService(VehiculoRepository vehiculoRepository) {
        this.vehiculoRepository = vehiculoRepository;
    }

    /**
     * Registra un vehículo nuevo. La placa se guarda en mayúsculas y no puede repetirse.
     *
     * @param solicitud datos del vehículo
     * @return el vehículo registrado
     * @throws PlacaDuplicadaException si ya existe un vehículo con esa placa
     */
    @Transactional
    public VehiculoResponse crear(VehiculoRequest solicitud) {
        String placa = normalizarPlaca(solicitud.placa());
        if (vehiculoRepository.existsByPlaca(placa)) {
            throw new PlacaDuplicadaException(placa);
        }
        Vehiculo vehiculo = new Vehiculo(
                placa,
                solicitud.tipo(),
                solicitud.marca().trim(),
                solicitud.modelo().trim(),
                solicitud.kilometrajeActual());
        return VehiculoResponse.desde(vehiculoRepository.save(vehiculo));
    }

    private String normalizarPlaca(String placa) {
        return placa.trim().toUpperCase(Locale.ROOT);
    }
}
