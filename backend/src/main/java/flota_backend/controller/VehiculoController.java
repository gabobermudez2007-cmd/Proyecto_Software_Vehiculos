package flota_backend.controller;

import java.net.URI;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import flota_backend.dto.ResultadoEliminacion;
import flota_backend.dto.VehiculoRequest;
import flota_backend.dto.VehiculoResponse;
import flota_backend.model.EstadoVehiculo;
import flota_backend.model.TipoVehiculo;
import flota_backend.service.VehiculoService;
import jakarta.validation.Valid;

/**
 * Endpoints REST para gestionar los vehículos de la flota.
 */
@RestController
@RequestMapping("/api/vehiculos")
public class VehiculoController {

    private final VehiculoService vehiculoService;

    public VehiculoController(VehiculoService vehiculoService) {
        this.vehiculoService = vehiculoService;
    }

    /** Registra un vehículo nuevo y responde 201 con su ubicación. */
    @PostMapping
    public ResponseEntity<VehiculoResponse> crear(@Valid @RequestBody VehiculoRequest solicitud) {
        VehiculoResponse creado = vehiculoService.crear(solicitud);
        URI ubicacion = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(creado.id())
                .toUri();
        return ResponseEntity.created(ubicacion).body(creado);
    }

    /** Lista los vehículos; los tres filtros (placa, tipo, estado) son opcionales. */
    @GetMapping
    public List<VehiculoResponse> listar(
            @RequestParam(name = "placa", required = false) String placa,
            @RequestParam(name = "tipo", required = false) TipoVehiculo tipo,
            @RequestParam(name = "estado", required = false) EstadoVehiculo estado) {
        return vehiculoService.listar(placa, tipo, estado);
    }

    /** Consulta un vehículo por id (404 si no existe). */
    @GetMapping("/{id}")
    public VehiculoResponse obtener(@PathVariable("id") Long id) {
        return vehiculoService.obtener(id);
    }

    /** Edita un vehículo existente. */
    @PutMapping("/{id}")
    public VehiculoResponse actualizar(@PathVariable("id") Long id,
            @Valid @RequestBody VehiculoRequest solicitud) {
        return vehiculoService.actualizar(id, solicitud);
    }

    /** Elimina el vehículo (definitivo si no tiene mantenimientos, lógico si los tiene). */
    @DeleteMapping("/{id}")
    public ResultadoEliminacion eliminar(@PathVariable("id") Long id) {
        return vehiculoService.eliminar(id);
    }
}
