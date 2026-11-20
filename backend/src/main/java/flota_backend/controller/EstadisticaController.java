package flota_backend.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import flota_backend.dto.FrecuenciaServicioResponse;
import flota_backend.model.TipoVehiculo;
import flota_backend.service.EstadisticaService;

@RestController
@RequestMapping("/api/estadisticas")
public class EstadisticaController {

    private final EstadisticaService estadisticaService;

    public EstadisticaController(EstadisticaService estadisticaService) {
        this.estadisticaService = estadisticaService;
    }

    /**
     * Datos del gráfico de los tipos de mantenimiento más frecuentes.
     * Sin {@code vehiculoId} ni {@code placa} es el gráfico de toda la empresa; con uno de los
     * dos es el gráfico personalizado de ese vehículo (404 si no existe). Todos los filtros son
     * opcionales; las fechas van en formato {@code AAAA-MM-DD}
     * (por ejemplo, {@code ?placa=ABC123&desde=2026-01-01&hasta=2026-06-30}).
     */
    @GetMapping("/tipos-servicio")
    public List<FrecuenciaServicioResponse> frecuenciaPorTipoServicio(
            @RequestParam(name = "vehiculoId", required = false) Long vehiculoId,
            @RequestParam(name = "placa", required = false) String placa,
            @RequestParam(name = "tipo", required = false) TipoVehiculo tipo,
            @RequestParam(name = "desde", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(name = "hasta", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return estadisticaService.frecuenciaPorTipoServicio(vehiculoId, placa, tipo, desde, hasta);
    }
}
