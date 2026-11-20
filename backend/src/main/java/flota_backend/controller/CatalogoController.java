package flota_backend.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import flota_backend.dto.TallerResponse;
import flota_backend.dto.TipoServicioResponse;
import flota_backend.service.CatalogoService;

/** Expone los catálogos de solo lectura usados por los formularios del frontend. */
@RestController
@RequestMapping("/api")
public class CatalogoController {

    private final CatalogoService catalogoService;

    public CatalogoController(CatalogoService catalogoService) {
        this.catalogoService = catalogoService;
    }

    /** Lista los tipos de servicio disponibles. */
    @GetMapping("/tipos-servicio")
    public List<TipoServicioResponse> tiposServicio() {
        return catalogoService.listarTiposServicio();
    }

    /** Lista los talleres registrados. */
    @GetMapping("/talleres")
    public List<TallerResponse> talleres() {
        return catalogoService.listarTalleres();
    }
}
