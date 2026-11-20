package flota_backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import flota_backend.dto.TallerRequest;
import flota_backend.dto.TallerResponse;
import flota_backend.dto.TipoServicioRequest;
import flota_backend.dto.TipoServicioResponse;
import flota_backend.service.CatalogoService;
import jakarta.validation.Valid;

/** Catálogos de tipos de servicio y talleres: consulta y gestión desde el frontend. */
@RestController
@RequestMapping("/api")
public class CatalogoController {

    private final CatalogoService catalogoService;

    public CatalogoController(CatalogoService catalogoService) {
        this.catalogoService = catalogoService;
    }

    // ── Tipos de servicio ──

    /** Lista los tipos de servicio disponibles. */
    @GetMapping("/tipos-servicio")
    public List<TipoServicioResponse> tiposServicio() {
        return catalogoService.listarTiposServicio();
    }

    /** Crea un tipo de servicio (201; 409 si el nombre ya existe). */
    @PostMapping("/tipos-servicio")
    public ResponseEntity<TipoServicioResponse> crearTipoServicio(
            @Valid @RequestBody TipoServicioRequest solicitud) {
        return ResponseEntity.status(HttpStatus.CREATED).body(catalogoService.crearTipoServicio(solicitud));
    }

    /** Edita un tipo de servicio (404 si no existe, 409 si el nombre ya existe). */
    @PutMapping("/tipos-servicio/{id}")
    public TipoServicioResponse actualizarTipoServicio(@PathVariable("id") Long id,
            @Valid @RequestBody TipoServicioRequest solicitud) {
        return catalogoService.actualizarTipoServicio(id, solicitud);
    }

    /** Elimina un tipo de servicio (204; 409 si ya tiene mantenimientos). */
    @DeleteMapping("/tipos-servicio/{id}")
    public ResponseEntity<Void> eliminarTipoServicio(@PathVariable("id") Long id) {
        catalogoService.eliminarTipoServicio(id);
        return ResponseEntity.noContent().build();
    }

    // ── Talleres ──

    /** Lista los talleres registrados. */
    @GetMapping("/talleres")
    public List<TallerResponse> talleres() {
        return catalogoService.listarTalleres();
    }

    /** Crea un taller (201; 409 si el nombre ya existe). */
    @PostMapping("/talleres")
    public ResponseEntity<TallerResponse> crearTaller(@Valid @RequestBody TallerRequest solicitud) {
        return ResponseEntity.status(HttpStatus.CREATED).body(catalogoService.crearTaller(solicitud));
    }

    /** Edita un taller (404 si no existe, 409 si el nombre ya existe). */
    @PutMapping("/talleres/{id}")
    public TallerResponse actualizarTaller(@PathVariable("id") Long id,
            @Valid @RequestBody TallerRequest solicitud) {
        return catalogoService.actualizarTaller(id, solicitud);
    }

    /** Elimina un taller (204; 409 si ya tiene mantenimientos). */
    @DeleteMapping("/talleres/{id}")
    public ResponseEntity<Void> eliminarTaller(@PathVariable("id") Long id) {
        catalogoService.eliminarTaller(id);
        return ResponseEntity.noContent().build();
    }
}
