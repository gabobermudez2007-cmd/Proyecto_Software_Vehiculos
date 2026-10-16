package flota_backend.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import flota_backend.dto.MantenimientoRequest;
import flota_backend.dto.MantenimientoResponse;
import flota_backend.exception.RecursoNoEncontradoException;
import flota_backend.exception.ReglaNegocioException;
import flota_backend.model.EstadoVehiculo;
import flota_backend.model.Mantenimiento;
import flota_backend.model.Taller;
import flota_backend.model.TipoServicio;
import flota_backend.model.Vehiculo;
import flota_backend.repository.MantenimientoRepository;
import flota_backend.repository.TallerRepository;
import flota_backend.repository.TipoServicioRepository;
import flota_backend.repository.VehiculoRepository;


@Service
public class MantenimientoService {

    private final MantenimientoRepository mantenimientoRepository;
    private final VehiculoRepository vehiculoRepository;
    private final TipoServicioRepository tipoServicioRepository;
    private final TallerRepository tallerRepository;

    public MantenimientoService(MantenimientoRepository mantenimientoRepository,
            VehiculoRepository vehiculoRepository,
            TipoServicioRepository tipoServicioRepository,
            TallerRepository tallerRepository) {
        this.mantenimientoRepository = mantenimientoRepository;
        this.vehiculoRepository = vehiculoRepository;
        this.tipoServicioRepository = tipoServicioRepository;
        this.tallerRepository = tallerRepository;
    }

    /**
     * @param solicitud datos del mantenimiento
     * @return el mantenimiento registrado
     * @throws RecursoNoEncontradoException si el vehículo, el tipo de servicio o el taller no existen
     * @throws ReglaNegocioException        si el vehículo está inactivo o el kilometraje es menor al último registrado
     */
    @Transactional
    public MantenimientoResponse registrar(MantenimientoRequest solicitud) {
        Vehiculo vehiculo = vehiculoRepository.findById(solicitud.vehiculoId())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe un vehículo con id " + solicitud.vehiculoId()));
        TipoServicio tipoServicio = tipoServicioRepository.findById(solicitud.tipoServicioId())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe un tipo de servicio con id " + solicitud.tipoServicioId()));
        Taller taller = tallerRepository.findById(solicitud.tallerId())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe un taller con id " + solicitud.tallerId()));

        if (vehiculo.getEstado() == EstadoVehiculo.INACTIVO) {
            throw new ReglaNegocioException(
                    "No se pueden registrar mantenimientos a un vehículo inactivo (" + vehiculo.getPlaca() + ")");
        }

        Integer kilometrajeUltimo = mantenimientoRepository.kilometrajeMaximoDelVehiculo(vehiculo.getId());
        if (kilometrajeUltimo != null && solicitud.kilometraje() < kilometrajeUltimo) {
            throw new ReglaNegocioException("El kilometraje (" + solicitud.kilometraje()
                    + ") no puede ser menor al del último mantenimiento registrado (" + kilometrajeUltimo + ")");
        }

        Mantenimiento mantenimiento = new Mantenimiento(vehiculo, tipoServicio, taller,
                solicitud.fecha(), solicitud.kilometraje(), solicitud.costo());
        Mantenimiento guardado = mantenimientoRepository.save(mantenimiento);

        if (solicitud.kilometraje() > vehiculo.getKilometrajeActual()) {
            vehiculo.setKilometrajeActual(solicitud.kilometraje());
            vehiculoRepository.save(vehiculo);
        }
        return MantenimientoResponse.desde(guardado);
    }

    /**
     * @param vehiculoId identificador del vehículo
     * @return los mantenimientos del vehículo; lista vacía si no tiene ninguno
     * @throws RecursoNoEncontradoException si el vehículo no existe
     */
    @Transactional(readOnly = true)
    public List<MantenimientoResponse> historial(Long vehiculoId) {
        if (!vehiculoRepository.existsById(vehiculoId)) {
            throw new RecursoNoEncontradoException("No existe un vehículo con id " + vehiculoId);
        }
        return mantenimientoRepository.findByVehiculoIdOrderByFechaDescIdDesc(vehiculoId).stream()
                .map(MantenimientoResponse::desde)
                .toList();
    }
}
