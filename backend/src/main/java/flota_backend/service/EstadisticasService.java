
package flota_backend.service;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import flota_backend.dto.EstadisticaCostoResponse;
import flota_backend.model.Mantenimiento;
import flota_backend.repository.MantenimientoRepository;

@Service
public class EstadisticasService {

    private final MantenimientoRepository mantenimientoRepository;

    public EstadisticasService(
            MantenimientoRepository mantenimientoRepository) {
        this.mantenimientoRepository = mantenimientoRepository;
    }

    @Transactional(readOnly = true)
    public List<EstadisticaCostoResponse> obtenerEstadisticas() {

        // Consultamos los mantenimientos no anulados.
        List<Mantenimiento> mantenimientos =
                mantenimientoRepository.filtrar(null, null, null, null);

        // Agrupamos por vehículo, año y mes.
        Map<ClaveEstadistica, List<Mantenimiento>> grupos =
                mantenimientos.stream()
                        .collect(Collectors.groupingBy(m ->
                                new ClaveEstadistica(
                                        m.getVehiculo().getId(),
                                        m.getVehiculo().getPlaca(),
                                        m.getFecha().getYear(),
                                        m.getFecha().getMonthValue()
                                )
                        ));

        // Calculamos las estadísticas de cada grupo.
        return grupos.entrySet().stream()
                .map(entrada -> {

                    ClaveEstadistica clave = entrada.getKey();
                    List<Mantenimiento> registros = entrada.getValue();

                    BigDecimal total = registros.stream()
                            .map(Mantenimiento::getCosto)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    return new EstadisticaCostoResponse(
                            clave.vehiculoId(),
                            clave.placa(),
                            clave.anio(),
                            clave.mes(),
                            registros.size(),
                            total
                    );
                })
                .sorted(Comparator
                        .comparing(EstadisticaCostoResponse::vehiculoId)
                        .thenComparing(EstadisticaCostoResponse::anio)
                        .thenComparing(EstadisticaCostoResponse::mes))
                .toList();
    }

    private record ClaveEstadistica(
            Long vehiculoId,
            String placa,
            int anio,
            int mes
    ) {
    }
}
