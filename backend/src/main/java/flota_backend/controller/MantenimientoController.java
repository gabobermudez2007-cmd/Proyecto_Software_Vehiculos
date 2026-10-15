package flota_backend.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import flota_backend.dto.MantenimientoRequest;
import flota_backend.dto.MantenimientoResponse;
import flota_backend.service.MantenimientoService;
import jakarta.validation.Valid;

/**
 * Endpoints REST para registrar los mantenimientos de los vehículos.
 */
@RestController
@RequestMapping("/api/mantenimientos")
public class MantenimientoController {

    private final MantenimientoService mantenimientoService;

    public MantenimientoController(MantenimientoService mantenimientoService) {
        this.mantenimientoService = mantenimientoService;
    }

    /** Registra un mantenimiento y responde 201 con el registro creado. */
    @PostMapping
    public ResponseEntity<MantenimientoResponse> registrar(@Valid @RequestBody MantenimientoRequest solicitud) {
        return ResponseEntity.status(HttpStatus.CREATED).body(mantenimientoService.registrar(solicitud));
    }
}
