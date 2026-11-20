package flota_backend.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import flota_backend.dto.FrecuenciaServicioResponse;
import flota_backend.exception.FiltroInvalidoException;
import flota_backend.exception.RecursoNoEncontradoException;
import flota_backend.model.TipoServicio;
import flota_backend.model.TipoVehiculo;
import flota_backend.repository.ConteoPorTipoServicio;
import flota_backend.repository.MantenimientoRepository;
import flota_backend.repository.TipoServicioRepository;
import flota_backend.repository.VehiculoRepository;

/**
 * Estadísticas de la flota, pensadas para alimentar los gráficos del frontend: el gráfico
 * general de toda la empresa y el gráfico personalizado de un vehículo.
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
    private final VehiculoRepository vehiculoRepository;

    public EstadisticaService(MantenimientoRepository mantenimientoRepository,
            TipoServicioRepository tipoServicioRepository,
            VehiculoRepository vehiculoRepository) {
        this.mantenimientoRepository = mantenimientoRepository;
        this.tipoServicioRepository = tipoServicioRepository;
        this.vehiculoRepository = vehiculoRepository;
    }

    /**
     * Frecuencia de cada tipo de mantenimiento, de toda la empresa o de un solo vehículo.
     * <p>
     * Sin {@code vehiculoId} ni {@code placa} es el gráfico general de la empresa. Con uno de
     * los dos es el gráfico personalizado de ese vehículo: el buscador del frontend puede
     * enviar el id o la placa que escribió el usuario.
     * <p>
     * Cuenta los mantenimientos no anulados, incluidos los de vehículos inactivos: a
     * diferencia de las alertas, aquí interesa lo que ya se hizo, y un vehículo dado de baja
     * también consumió esos servicios. Los tipos de servicio que nunca se han hecho aparecen
     * con cantidad cero, para que el gráfico muestre el catálogo completo.
     *
     * @param vehiculoId identificador del vehículo (puede ser nulo)
     * @param placa      placa del vehículo; se ignoran mayúsculas y espacios (puede ser nula)
     * @param tipo       tipo de vehículo por el que filtrar (puede ser nulo)
     * @param desde      fecha inicial del periodo, incluida (puede ser nula)
     * @param hasta      fecha final del periodo, incluida (puede ser nula)
     * @return un elemento por tipo de servicio, del más frecuente al menos frecuente
     * @throws FiltroInvalidoException      si la fecha inicial es posterior a la final, o si se
     *                                      envían el id y la placa a la vez
     * @throws RecursoNoEncontradoException si no existe un vehículo con ese id o esa placa
     */
    @Transactional(readOnly = true)
    public List<FrecuenciaServicioResponse> frecuenciaPorTipoServicio(Long vehiculoId, String placa,
            TipoVehiculo tipo, LocalDate desde, LocalDate hasta) {
        if (desde != null && hasta != null && desde.isAfter(hasta)) {
            throw new FiltroInvalidoException("La fecha inicial (" + desde
                    + ") no puede ser posterior a la fecha final (" + hasta + ")");
        }
        Long idDelVehiculo = resolverVehiculo(vehiculoId, placa);

        // 1. La base de datos cuenta cuántos mantenimientos hay de cada tipo (GROUP BY)
        Map<Long, Long> cantidadPorTipo = new HashMap<>();
        long total = 0;
        for (ConteoPorTipoServicio conteo : mantenimientoRepository.contarPorTipoServicio(
                idDelVehiculo, tipo, desde, hasta)) {
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

    /**
     * Traduce lo que escribió el usuario en el buscador al id del vehículo que se va a graficar.
     *
     * @return el id del vehículo, o {@code null} si no se pidió ninguno (gráfico de toda la empresa)
     */
    private Long resolverVehiculo(Long vehiculoId, String placa) {
        // "?placa=" vacío o con solo espacios cuenta como si no se hubiera enviado
        boolean hayPlaca = placa != null && !placa.isBlank();

        if (vehiculoId != null && hayPlaca) {
            throw new FiltroInvalidoException("Busque el vehículo por id o por placa, no por los dos a la vez");
        }
        if (vehiculoId != null) {
            if (!vehiculoRepository.existsById(vehiculoId)) {
                throw new RecursoNoEncontradoException("No existe un vehículo con id " + vehiculoId);
            }
            return vehiculoId;
        }
        if (hayPlaca) {
            // Igual que al registrar un vehículo: la placa se guarda sin espacios y en mayúsculas
            String placaNormalizada = placa.trim().toUpperCase(Locale.ROOT);
            return vehiculoRepository.findByPlaca(placaNormalizada)
                    .orElseThrow(() -> new RecursoNoEncontradoException(
                            "No existe un vehículo con placa " + placaNormalizada))
                    .getId();
        }
        return null;
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
