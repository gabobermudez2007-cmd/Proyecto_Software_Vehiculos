package flota_backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import flota_backend.dto.MantenimientoRequest;
import flota_backend.dto.MantenimientoResponse;
import flota_backend.service.MantenimientoService;
import jakarta.validation.Valid;

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

    /** Historial de mantenimientos de un vehículo, del más reciente al más antiguo (404 si no existe). */
    @GetMapping("/vehiculo/{vehiculoId}")
    public List<MantenimientoResponse> historial(@PathVariable("vehiculoId") Long vehiculoId) {
        return mantenimientoService.historial(vehiculoId);
    }
}
