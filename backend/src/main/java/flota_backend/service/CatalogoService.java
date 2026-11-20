package flota_backend.service;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import flota_backend.dto.TallerResponse;
import flota_backend.dto.TipoServicioResponse;
import flota_backend.repository.TallerRepository;
import flota_backend.repository.TipoServicioRepository;

/**
 * Consulta de los catálogos que el frontend necesita para llenar listas
 * desplegables: tipos de servicio y talleres.
 */
@Service
public class CatalogoService {

    private final TipoServicioRepository tipoServicioRepository;
    private final TallerRepository tallerRepository;

    public CatalogoService(TipoServicioRepository tipoServicioRepository,
                           TallerRepository tallerRepository) {
        this.tipoServicioRepository = tipoServicioRepository;
        this.tallerRepository = tallerRepository;
    }

    /** Devuelve todos los tipos de servicio ordenados por nombre. */
    @Transactional(readOnly = true)
    public List<TipoServicioResponse> listarTiposServicio() {
        return tipoServicioRepository.findAll(Sort.by("nombre")).stream()
                .map(TipoServicioResponse::desde)
                .toList();
    }

    /** Devuelve todos los talleres ordenados por nombre. */
    @Transactional(readOnly = true)
    public List<TallerResponse> listarTalleres() {
        return tallerRepository.findAll(Sort.by("nombre")).stream()
                .map(TallerResponse::desde)
                .toList();
    }
}
