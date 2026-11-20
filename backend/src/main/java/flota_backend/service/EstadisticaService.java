package flota_backend.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import flota_backend.dto.FrecuenciaServicioResponse;
import flota_backend.exception.FiltroInvalidoException;
import flota_backend.model.TipoServicio;
import flota_backend.model.TipoVehiculo;
import flota_backend.repository.ConteoPorTipoServicio;
import flota_backend.repository.MantenimientoRepository;
import flota_backend.repository.TipoServicioRepository;

/**
 * Estadísticas generales de la flota, pensadas para alimentar los gráficos del frontend.
 */
@Service
public class EstadisticaService {

    /** Del más frecuente al menos frecuente; si empatan, por nombre para que el orden sea estable. */
    private static final Comparator<FrecuenciaServicioResponse> MAS_FRECUENTE_PRIMERO = Comparator
            .comparingLong(FrecuenciaServicioResponse::cantidad).reversed()
            .thenComparing(FrecuenciaServicioResponse::tipoServicio);

    private static final BigDecimal CIEN = BigDecimal.valueOf(100);

    private final MantenimientoRepository mantenimientoRepository;
    private final TipoServicioRepository tipoServicioRepository;

    public EstadisticaService(MantenimientoRepository mantenimientoRepository,
            TipoServicioRepository tipoServicioRepository) {
        this.mantenimientoRepository = mantenimientoRepository;
        this.tipoServicioRepository = tipoServicioRepository;
    }

    /**
     * Frecuencia de cada tipo de mantenimiento en toda la empresa.
     * <p>
     * Cuenta los mantenimientos no anulados de todos los vehículos, incluidos los inactivos:
     * a diferencia de las alertas, aquí interesa lo que la empresa ya hizo, y un vehículo dado
     * de baja también consumió esos servicios. Los tipos de servicio que nunca se han hecho
     * aparecen con cantidad cero, para que el gráfico muestre el catálogo completo.
     *
     * @param tipo  tipo de vehículo por el que filtrar (puede ser nulo)
     * @param desde fecha inicial del periodo, incluida (puede ser nula)
     * @param hasta fecha final del periodo, incluida (puede ser nula)
     * @return un elemento por tipo de servicio, del más frecuente al menos frecuente
     * @throws FiltroInvalidoException si la fecha inicial es posterior a la final
     */
    @Transactional(readOnly = true)
    public List<FrecuenciaServicioResponse> frecuenciaPorTipoServicio(TipoVehiculo tipo,
            LocalDate desde, LocalDate hasta) {
        if (desde != null && hasta != null && desde.isAfter(hasta)) {
            throw new FiltroInvalidoException("La fecha inicial (" + desde
                    + ") no puede ser posterior a la fecha final (" + hasta + ")");
        }

        // 1. La base de datos cuenta cuántos mantenimientos hay de cada tipo (GROUP BY)
        Map<Long, Long> cantidadPorTipo = new HashMap<>();
        long total = 0;
        for (ConteoPorTipoServicio conteo : mantenimientoRepository.contarPorTipoServicio(tipo, desde, hasta)) {
            cantidadPorTipo.put(conteo.tipoServicioId(), conteo.cantidad());
            total += conteo.cantidad();
        }

        // 2. Se recorre el catálogo completo para que los tipos sin mantenimientos salgan en cero
        List<FrecuenciaServicioResponse> frecuencias = new ArrayList<>();
        for (TipoServicio tipoServicio : tipoServicioRepository.findAll()) {
            long cantidad = cantidadPorTipo.getOrDefault(tipoServicio.getId(), 0L);
            frecuencias.add(new FrecuenciaServicioResponse(
                    tipoServicio.getId(),
                    tipoServicio.getNombre(),
                    cantidad,
                    porcentaje(cantidad, total)));
        }

        // 3. El primero de la lista es el tipo de mantenimiento más frecuente
        frecuencias.sort(MAS_FRECUENTE_PRIMERO);
        return frecuencias;
    }

    /** {@code cantidad} sobre {@code total}, en porcentaje con dos decimales; 0 si no hay mantenimientos. */
    private BigDecimal porcentaje(long cantidad, long total) {
        if (total == 0) {
            return BigDecimal.ZERO.setScale(2);
        }
        return BigDecimal.valueOf(cantidad)
                .multiply(CIEN)
                .divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP);
    }
}
