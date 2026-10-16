package flota_backend.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import flota_backend.dto.AlertaResponse;
import flota_backend.model.TipoVehiculo;
import flota_backend.service.AlertaService;

/**
 * Endpoints REST para consultar las alertas de mantenimiento preventivo de la flota.
 */
@RestController
@RequestMapping("/api/alertas")
public class AlertaController {

    private final AlertaService alertaService;

    public AlertaController(AlertaService alertaService) {
        this.alertaService = alertaService;
    }

    /** Lista los vehículos con mantenimientos vencidos; el filtro por tipo de vehículo es opcional. */
    @GetMapping
    public List<AlertaResponse> listar(@RequestParam(name = "tipo", required = false) TipoVehiculo tipo) {
        return alertaService.listar(tipo);
    }
}
