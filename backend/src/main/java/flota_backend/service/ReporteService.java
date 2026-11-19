package flota_backend.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import flota_backend.dto.FiltroCostos;
import flota_backend.dto.MantenimientoResponse;
import flota_backend.dto.ReporteCostosResponse;
import flota_backend.exception.FiltroInvalidoException;
import flota_backend.exception.RecursoNoEncontradoException;
import flota_backend.model.Mantenimiento;
import flota_backend.repository.MantenimientoRepository;
import flota_backend.repository.TipoServicioRepository;
import flota_backend.repository.VehiculoRepository;

/**
 * Reporte de costos de mantenimiento, filtrable por vehículo, tipo de servicio y rango de fechas.
 * Se puede pedir en JSON (para verlo en pantalla) o en CSV (para descargarlo y abrirlo en Excel).
 * <p>
 * Incluye los mantenimientos de vehículos activos e inactivos: un vehículo dado de baja ya no
 * recibe mantenimientos, pero lo que costó mientras estuvo en la flota sigue contando.
 * Los mantenimientos anulados no se cuentan.
 */
@Service
public class ReporteService {

    /**
     * Separador de columnas del CSV. Se usa punto y coma porque Excel en español (Colombia)
     * espera ese separador; con coma abriría todo en una sola columna.
     */
    static final String SEPARADOR = ";";

    /** Marca (BOM) que le indica a Excel que el archivo está en UTF-8, para que muestre bien las tildes. */
    static final String BOM_UTF8 = "﻿";

    static final String ENCABEZADO = String.join(SEPARADOR,
            "Fecha", "Placa", "Tipo de vehículo", "Tipo de servicio", "Taller", "Kilometraje", "Costo");

    private static final BigDecimal CERO = BigDecimal.ZERO.setScale(2);

    private final MantenimientoRepository mantenimientoRepository;
    private final VehiculoRepository vehiculoRepository;
    private final TipoServicioRepository tipoServicioRepository;

    public ReporteService(MantenimientoRepository mantenimientoRepository,
            VehiculoRepository vehiculoRepository,
            TipoServicioRepository tipoServicioRepository) {
        this.mantenimientoRepository = mantenimientoRepository;
        this.vehiculoRepository = vehiculoRepository;
        this.tipoServicioRepository = tipoServicioRepository;
    }

    /**
     * Reporte con totales y detalle, del mantenimiento más reciente al más antiguo.
     *
     * @throws FiltroInvalidoException      si la fecha inicial es posterior a la final
     * @throws RecursoNoEncontradoException si el vehículo o el tipo de servicio no existen
     */
    @Transactional(readOnly = true)
    public ReporteCostosResponse reporteCostos(FiltroCostos filtro) {
        List<Mantenimiento> mantenimientos = buscar(filtro);
        BigDecimal total = sumarCostos(mantenimientos);
        BigDecimal promedio = mantenimientos.isEmpty()
                ? CERO
                : total.divide(BigDecimal.valueOf(mantenimientos.size()), 2, RoundingMode.HALF_UP);
        return new ReporteCostosResponse(
                filtro,
                mantenimientos.size(),
                total,
                promedio,
                mantenimientos.stream().map(MantenimientoResponse::desde).toList());
    }

    /**
     * El mismo reporte en formato CSV: una fila de encabezado y una fila por mantenimiento.
     * Los costos van con coma decimal (por ejemplo {@code 180000,00}) para que Excel en español
     * los reconozca como números.
     *
     * @throws FiltroInvalidoException      si la fecha inicial es posterior a la final
     * @throws RecursoNoEncontradoException si el vehículo o el tipo de servicio no existen
     */
    @Transactional(readOnly = true)
    public String reporteCostosCsv(FiltroCostos filtro) {
        StringBuilder csv = new StringBuilder(BOM_UTF8).append(ENCABEZADO).append("\r\n");
        for (Mantenimiento m : buscar(filtro)) {
            csv.append(String.join(SEPARADOR,
                    m.getFecha().toString(),
                    celda(m.getVehiculo().getPlaca()),
                    m.getVehiculo().getTipo().name(),
                    celda(m.getTipoServicio().getNombre()),
                    celda(m.getTaller().getNombre()),
                    m.getKilometraje().toString(),
                    formatearCosto(m.getCosto())))
                    .append("\r\n");
        }
        return csv.toString();
    }

    /** Revisa que los filtros tengan sentido y trae de la base los mantenimientos que los cumplen. */
    private List<Mantenimiento> buscar(FiltroCostos filtro) {
        if (filtro.desde() != null && filtro.hasta() != null && filtro.desde().isAfter(filtro.hasta())) {
            throw new FiltroInvalidoException("La fecha inicial (" + filtro.desde()
                    + ") no puede ser posterior a la fecha final (" + filtro.hasta() + ")");
        }
        if (filtro.vehiculoId() != null && !vehiculoRepository.existsById(filtro.vehiculoId())) {
            throw new RecursoNoEncontradoException("No existe un vehículo con id " + filtro.vehiculoId());
        }
        if (filtro.tipoServicioId() != null && !tipoServicioRepository.existsById(filtro.tipoServicioId())) {
            throw new RecursoNoEncontradoException(
                    "No existe un tipo de servicio con id " + filtro.tipoServicioId());
        }
        return mantenimientoRepository.filtrar(
                filtro.vehiculoId(), filtro.tipoServicioId(), filtro.desde(), filtro.hasta());
    }

    private static BigDecimal sumarCostos(List<Mantenimiento> mantenimientos) {
        return mantenimientos.stream()
                .map(Mantenimiento::getCosto)
                .reduce(CERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Si el texto tiene el separador, comillas o saltos de línea, lo encierra entre comillas
     * y duplica las comillas internas (regla estándar de CSV, RFC 4180).
     */
    static String celda(String texto) {
        if (texto == null) {
            return "";
        }
        if (texto.contains(SEPARADOR) || texto.contains("\"") || texto.contains("\n") || texto.contains("\r")) {
            return "\"" + texto.replace("\"", "\"\"") + "\"";
        }
        return texto;
    }

    /** 180000.5 → "180000,50" */
    static String formatearCosto(BigDecimal costo) {
        return costo.setScale(2, RoundingMode.HALF_UP).toPlainString().replace('.', ',');
    }
}
