
package flota_backend.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import flota_backend.dto.EstadisticaCostoResponse;
import flota_backend.service.EstadisticasService;

@RestController
@RequestMapping("/api/estadisticas/costos")
public class EstadisticasController {

    private final EstadisticasService estadisticasService;

    public EstadisticasController(
            EstadisticasService estadisticasService) {
        this.estadisticasService = estadisticasService;
    }

    @GetMapping
    public List<EstadisticaCostoResponse> listar() {
        return estadisticasService.obtenerEstadisticas();
    }
}
