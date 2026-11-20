package flota_backend.service;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import flota_backend.dto.TallerRequest;
import flota_backend.dto.TallerResponse;
import flota_backend.dto.TipoServicioRequest;
import flota_backend.dto.TipoServicioResponse;
import flota_backend.exception.NombreDuplicadoException;
import flota_backend.exception.RecursoEnUsoException;
import flota_backend.exception.RecursoNoEncontradoException;
import flota_backend.model.Taller;
import flota_backend.model.TipoServicio;
import flota_backend.repository.MantenimientoRepository;
import flota_backend.repository.TallerRepository;
import flota_backend.repository.TipoServicioRepository;

/**
 * Gestión de los catálogos que usan los mantenimientos: tipos de servicio y talleres
 * (consulta, alta, edición y eliminación).
 */
@Service
public class CatalogoService {

    private final TipoServicioRepository tipoServicioRepository;
    private final TallerRepository tallerRepository;
    private final MantenimientoRepository mantenimientoRepository;

    public CatalogoService(TipoServicioRepository tipoServicioRepository,
                           TallerRepository tallerRepository,
                           MantenimientoRepository mantenimientoRepository) {
        this.tipoServicioRepository = tipoServicioRepository;
        this.tallerRepository = tallerRepository;
        this.mantenimientoRepository = mantenimientoRepository;
    }

    // ── Tipos de servicio ──

    /** Devuelve todos los tipos de servicio ordenados por nombre. */
    @Transactional(readOnly = true)
    public List<TipoServicioResponse> listarTiposServicio() {
        return tipoServicioRepository.findAll(Sort.by("nombre")).stream()
                .map(TipoServicioResponse::desde)
                .toList();
    }

    /**
     * @throws NombreDuplicadoException si ya existe un tipo de servicio con ese nombre
     */
    @Transactional
    public TipoServicioResponse crearTipoServicio(TipoServicioRequest solicitud) {
        String nombre = solicitud.nombre().trim();
        if (tipoServicioRepository.existsByNombreIgnoreCase(nombre)) {
            throw new NombreDuplicadoException("Ya existe un tipo de servicio llamado " + nombre);
        }
        TipoServicio tipo = new TipoServicio(nombre, solicitud.intervaloKm(), solicitud.intervaloMeses());
        return TipoServicioResponse.desde(tipoServicioRepository.save(tipo));
    }

    /**
     * @throws RecursoNoEncontradoException si el tipo de servicio no existe
     * @throws NombreDuplicadoException     si el nombre ya pertenece a otro tipo de servicio
     */
    @Transactional
    public TipoServicioResponse actualizarTipoServicio(Long id, TipoServicioRequest solicitud) {
        TipoServicio tipo = buscarTipoServicio(id);
        String nombre = solicitud.nombre().trim();
        tipoServicioRepository.findByNombreIgnoreCase(nombre)
                .filter(otro -> !otro.getId().equals(id))
                .ifPresent(otro -> {
                    throw new NombreDuplicadoException("Ya existe un tipo de servicio llamado " + nombre);
                });
        tipo.setNombre(nombre);
        tipo.setIntervaloKm(solicitud.intervaloKm());
        tipo.setIntervaloMeses(solicitud.intervaloMeses());
        return TipoServicioResponse.desde(tipoServicioRepository.save(tipo));
    }

    /**
     * @throws RecursoNoEncontradoException si el tipo de servicio no existe
     * @throws RecursoEnUsoException        si ya hay mantenimientos registrados con ese servicio
     */
    @Transactional
    public void eliminarTipoServicio(Long id) {
        TipoServicio tipo = buscarTipoServicio(id);
        long usos = mantenimientoRepository.countByTipoServicioId(id);
        if (usos > 0) {
            throw new RecursoEnUsoException("No se puede eliminar el servicio " + tipo.getNombre()
                    + ": tiene " + usos + " mantenimiento(s) registrado(s)");
        }
        tipoServicioRepository.delete(tipo);
    }

    // ── Talleres ──

    /** Devuelve todos los talleres ordenados por nombre. */
    @Transactional(readOnly = true)
    public List<TallerResponse> listarTalleres() {
        return tallerRepository.findAll(Sort.by("nombre")).stream()
                .map(TallerResponse::desde)
                .toList();
    }

    /**
     * @throws NombreDuplicadoException si ya existe un taller con ese nombre
     */
    @Transactional
    public TallerResponse crearTaller(TallerRequest solicitud) {
        String nombre = solicitud.nombre().trim();
        if (tallerRepository.existsByNombreIgnoreCase(nombre)) {
            throw new NombreDuplicadoException("Ya existe un taller llamado " + nombre);
        }
        Taller taller = new Taller(nombre, limpiarTelefono(solicitud.telefono()));
        return TallerResponse.desde(tallerRepository.save(taller));
    }

    /**
     * @throws RecursoNoEncontradoException si el taller no existe
     * @throws NombreDuplicadoException     si el nombre ya pertenece a otro taller
     */
    @Transactional
    public TallerResponse actualizarTaller(Long id, TallerRequest solicitud) {
        Taller taller = buscarTaller(id);
        String nombre = solicitud.nombre().trim();
        tallerRepository.findByNombreIgnoreCase(nombre)
                .filter(otro -> !otro.getId().equals(id))
                .ifPresent(otro -> {
                    throw new NombreDuplicadoException("Ya existe un taller llamado " + nombre);
                });
        taller.setNombre(nombre);
        taller.setTelefono(limpiarTelefono(solicitud.telefono()));
        return TallerResponse.desde(tallerRepository.save(taller));
    }

    /**
     * @throws RecursoNoEncontradoException si el taller no existe
     * @throws RecursoEnUsoException        si ya hay mantenimientos registrados en ese taller
     */
    @Transactional
    public void eliminarTaller(Long id) {
        Taller taller = buscarTaller(id);
        long usos = mantenimientoRepository.countByTallerId(id);
        if (usos > 0) {
            throw new RecursoEnUsoException("No se puede eliminar el taller " + taller.getNombre()
                    + ": tiene " + usos + " mantenimiento(s) registrado(s)");
        }
        tallerRepository.delete(taller);
    }

    private TipoServicio buscarTipoServicio(Long id) {
        return tipoServicioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe un tipo de servicio con id " + id));
    }

    private Taller buscarTaller(Long id) {
        return tallerRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe un taller con id " + id));
    }

    /** Un teléfono vacío o con solo espacios se guarda como nulo. */
    private String limpiarTelefono(String telefono) {
        return (telefono == null || telefono.isBlank()) ? null : telefono.trim();
    }
}
