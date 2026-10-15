package flota_backend.service;

import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import flota_backend.dto.ResultadoEliminacion;
import flota_backend.dto.VehiculoRequest;
import flota_backend.dto.VehiculoResponse;
import flota_backend.exception.PlacaDuplicadaException;
import flota_backend.exception.RecursoNoEncontradoException;
import flota_backend.exception.ReglaNegocioException;
import flota_backend.model.EstadoVehiculo;
import flota_backend.model.TipoVehiculo;
import flota_backend.model.Vehiculo;
import flota_backend.repository.MantenimientoRepository;
import flota_backend.repository.VehiculoRepository;

/**
 * Reglas de negocio para la gestión de vehículos.
 */
@Service
public class VehiculoService {

    private final VehiculoRepository vehiculoRepository;
    private final MantenimientoRepository mantenimientoRepository;

    public VehiculoService(VehiculoRepository vehiculoRepository,
            MantenimientoRepository mantenimientoRepository) {
        this.vehiculoRepository = vehiculoRepository;
        this.mantenimientoRepository = mantenimientoRepository;
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

    /**
     * Lista los vehículos aplicando filtros opcionales.
     *
     * @param placa  texto contenido en la placa (puede ser nulo o vacío)
     * @param tipo   tipo de vehículo (puede ser nulo)
     * @param estado estado del vehículo (puede ser nulo)
     * @return los vehículos que cumplen los filtros, ordenados por placa
     */
    @Transactional(readOnly = true)
    public List<VehiculoResponse> listar(String placa, TipoVehiculo tipo, EstadoVehiculo estado) {
        String textoPlaca = (placa == null) ? "" : normalizarPlaca(placa);
        return vehiculoRepository.buscar(textoPlaca, tipo, estado).stream()
                .map(VehiculoResponse::desde)
                .toList();
    }

    /**
     * Consulta un vehículo por su identificador.
     *
     * @throws RecursoNoEncontradoException si no existe
     */
    @Transactional(readOnly = true)
    public VehiculoResponse obtener(Long id) {
        return VehiculoResponse.desde(buscarPorId(id));
    }

    /**
     * Edita los datos de un vehículo. No se permite que la placa coincida con la de otro
     * vehículo ni que el kilometraje quede por debajo del último mantenimiento registrado.
     *
     * @throws RecursoNoEncontradoException si el vehículo no existe
     * @throws PlacaDuplicadaException      si la placa ya pertenece a otro vehículo
     * @throws ReglaNegocioException        si el kilometraje es menor al del último mantenimiento
     */
    @Transactional
    public VehiculoResponse actualizar(Long id, VehiculoRequest solicitud) {
        Vehiculo vehiculo = buscarPorId(id);

        String placa = normalizarPlaca(solicitud.placa());
        vehiculoRepository.findByPlaca(placa)
                .filter(otro -> !otro.getId().equals(id))
                .ifPresent(otro -> {
                    throw new PlacaDuplicadaException(placa);
                });

        Integer kilometrajeMaximo = mantenimientoRepository.kilometrajeMaximoDelVehiculo(id);
        if (kilometrajeMaximo != null && solicitud.kilometrajeActual() < kilometrajeMaximo) {
            throw new ReglaNegocioException("El kilometraje actual (" + solicitud.kilometrajeActual()
                    + ") no puede ser menor al del último mantenimiento registrado ("
                    + kilometrajeMaximo + ")");
        }

        vehiculo.setPlaca(placa);
        vehiculo.setTipo(solicitud.tipo());
        vehiculo.setMarca(solicitud.marca().trim());
        vehiculo.setModelo(solicitud.modelo().trim());
        vehiculo.setKilometrajeActual(solicitud.kilometrajeActual());
        return VehiculoResponse.desde(vehiculoRepository.save(vehiculo));
    }

    /**
     * Elimina un vehículo. Si no tiene mantenimientos se borra definitivamente;
     * si los tiene, se inactiva (eliminación lógica) para conservar su historial.
     *
     * @throws RecursoNoEncontradoException si el vehículo no existe
     */
    @Transactional
    public ResultadoEliminacion eliminar(Long id) {
        Vehiculo vehiculo = buscarPorId(id);
        if (mantenimientoRepository.existsByVehiculoId(id)) {
            vehiculo.setEstado(EstadoVehiculo.INACTIVO);
            vehiculoRepository.save(vehiculo);
            return new ResultadoEliminacion(false,
                    "El vehículo tiene mantenimientos registrados, por lo que se marcó como INACTIVO");
        }
        vehiculoRepository.delete(vehiculo);
        return new ResultadoEliminacion(true, "El vehículo se eliminó definitivamente");
    }

    private Vehiculo buscarPorId(Long id) {
        return vehiculoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe un vehículo con id " + id));
    }

    private String normalizarPlaca(String placa) {
        return placa.trim().toUpperCase(Locale.ROOT);
    }
}
