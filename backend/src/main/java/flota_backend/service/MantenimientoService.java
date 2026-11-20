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

    /**
     * Corrige un mantenimiento ya registrado (tipo de servicio, taller, fecha, kilometraje o costo).
     * El vehículo no se puede cambiar: si se registró en el vehículo equivocado, se elimina y se
     * vuelve a registrar.
     * <p>
     * El kilometraje debe quedar entre el del mantenimiento anterior y el del siguiente del mismo
     * vehículo (en el orden en que se registraron), para que el historial siga siendo coherente.
     *
     * @throws RecursoNoEncontradoException si el mantenimiento, el tipo de servicio o el taller no existen
     * @throws ReglaNegocioException        si se intenta cambiar de vehículo, el mantenimiento está anulado
     *                                      o el kilometraje rompe el orden del historial
     */
    @Transactional
    public MantenimientoResponse actualizar(Long id, MantenimientoRequest solicitud) {
        Mantenimiento mantenimiento = buscarPorId(id);
        Vehiculo vehiculo = mantenimiento.getVehiculo();

        if (mantenimiento.isAnulado()) {
            throw new ReglaNegocioException("El mantenimiento está anulado y no se puede modificar");
        }
        if (!vehiculo.getId().equals(solicitud.vehiculoId())) {
            throw new ReglaNegocioException(
                    "No se puede cambiar el vehículo de un mantenimiento: elimínelo y regístrelo de nuevo");
        }
        TipoServicio tipoServicio = tipoServicioRepository.findById(solicitud.tipoServicioId())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe un tipo de servicio con id " + solicitud.tipoServicioId()));
        Taller taller = tallerRepository.findById(solicitud.tallerId())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe un taller con id " + solicitud.tallerId()));

        Integer kilometrajeAnterior = null;
        Integer kilometrajeSiguiente = null;
        for (Mantenimiento otro : mantenimientoRepository
                .findByVehiculoIdAndAnuladoFalseOrderByIdAsc(vehiculo.getId())) {
            if (otro.getId().equals(id)) {
                continue;
            }
            if (otro.getId() < id) {
                kilometrajeAnterior = otro.getKilometraje();
            } else if (kilometrajeSiguiente == null) {
                kilometrajeSiguiente = otro.getKilometraje();
            }
        }
        if (kilometrajeAnterior != null && solicitud.kilometraje() < kilometrajeAnterior) {
            throw new ReglaNegocioException("El kilometraje (" + solicitud.kilometraje()
                    + ") no puede ser menor al del mantenimiento anterior (" + kilometrajeAnterior + ")");
        }
        if (kilometrajeSiguiente != null && solicitud.kilometraje() > kilometrajeSiguiente) {
            throw new ReglaNegocioException("El kilometraje (" + solicitud.kilometraje()
                    + ") no puede ser mayor al del mantenimiento siguiente (" + kilometrajeSiguiente + ")");
        }

        mantenimiento.setTipoServicio(tipoServicio);
        mantenimiento.setTaller(taller);
        mantenimiento.setFecha(solicitud.fecha());
        mantenimiento.setKilometraje(solicitud.kilometraje());
        mantenimiento.setCosto(solicitud.costo());
        Mantenimiento guardado = mantenimientoRepository.save(mantenimiento);

        if (solicitud.kilometraje() > vehiculo.getKilometrajeActual()) {
            vehiculo.setKilometrajeActual(solicitud.kilometraje());
            vehiculoRepository.save(vehiculo);
        }
        return MantenimientoResponse.desde(guardado);
    }

    /**
     * Elimina un mantenimiento registrado por error o que se canceló. El kilometraje actual del
     * vehículo no cambia: el odómetro no retrocede aunque se borre un servicio.
     *
     * @throws RecursoNoEncontradoException si el mantenimiento no existe
     */
    @Transactional
    public void eliminar(Long id) {
        mantenimientoRepository.delete(buscarPorId(id));
    }

    private Mantenimiento buscarPorId(Long id) {
        return mantenimientoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe un mantenimiento con id " + id));
    }
}
