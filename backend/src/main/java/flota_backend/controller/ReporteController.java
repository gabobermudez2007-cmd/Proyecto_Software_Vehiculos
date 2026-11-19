package flota_backend.controller;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import flota_backend.dto.FiltroCostos;
import flota_backend.dto.ReporteCostosResponse;
import flota_backend.service.ReporteService;

/**
 * Reporte de costos filtrable por vehículo, tipo de servicio y rango de fechas.
 * Todos los filtros son opcionales; las fechas van en formato {@code AAAA-MM-DD}.
 */
@RestController
@RequestMapping("/api/reportes/costos")
public class ReporteController {

    private static final MediaType TEXT_CSV = new MediaType("text", "csv", StandardCharsets.UTF_8);

    private final ReporteService reporteService;

    public ReporteController(ReporteService reporteService) {
        this.reporteService = reporteService;
    }

    /** El reporte en JSON, para mostrarlo en la tabla del frontend. */
    @GetMapping
    public ReporteCostosResponse reporte(
            @RequestParam(name = "vehiculoId", required = false) Long vehiculoId,
            @RequestParam(name = "tipoServicioId", required = false) Long tipoServicioId,
            @RequestParam(name = "desde", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(name = "hasta", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return reporteService.reporteCostos(new FiltroCostos(vehiculoId, tipoServicioId, desde, hasta));
    }

    /** El mismo reporte como archivo CSV descargable ({@code reporte-costos-AAAA-MM-DD.csv}). */
    @GetMapping("/csv")
    public ResponseEntity<byte[]> csv(
            @RequestParam(name = "vehiculoId", required = false) Long vehiculoId,
            @RequestParam(name = "tipoServicioId", required = false) Long tipoServicioId,
            @RequestParam(name = "desde", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(name = "hasta", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        String csv = reporteService.reporteCostosCsv(new FiltroCostos(vehiculoId, tipoServicioId, desde, hasta));
        String nombreArchivo = "reporte-costos-" + LocalDate.now() + ".csv";
        return ResponseEntity.ok()
                .contentType(TEXT_CSV)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(nombreArchivo).build().toString())
                .body(csv.getBytes(StandardCharsets.UTF_8));
    }
}
