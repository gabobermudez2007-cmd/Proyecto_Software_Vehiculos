package flota_backend.dto;

import java.time.LocalDate;

import flota_backend.model.TipoVehiculo;

/**
 * @param vehiculoId                 identificador del vehículo
 * @param placa                      placa del vehículo
 * @param tipoVehiculo               tipo de vehículo
 * @param kilometrajeActual          kilometraje actual del vehículo
 * @param tipoServicioId             identificador del tipo de servicio vencido
 * @param tipoServicio               nombre del tipo de servicio vencido
 * @param fechaUltimoServicio        fecha del último mantenimiento de ese tipo
 * @param kilometrajeUltimoServicio  kilometraje registrado en ese último mantenimiento
 * @param fechaProximoServicio       fecha prevista para el próximo mantenimiento
 * @param kilometrajeProximoServicio kilometraje previsto para el próximo mantenimiento
 * @param vencidoPorKilometraje      {@code true} si el vehículo alcanzó o superó el kilometraje previsto
 * @param vencidoPorTiempo           {@code true} si ya llegó o pasó la fecha prevista
 * @param kilometrosExcedidos        kilómetros recorridos por encima del previsto (0 si no se superó)
 * @param diasVencido                días transcurridos desde la fecha prevista (0 si no se superó)
 */
public record AlertaResponse(
        Long vehiculoId,
        String placa,
        TipoVehiculo tipoVehiculo,
        Integer kilometrajeActual,
        Long tipoServicioId,
        String tipoServicio,
        LocalDate fechaUltimoServicio,
        Integer kilometrajeUltimoServicio,
        LocalDate fechaProximoServicio,
        Integer kilometrajeProximoServicio,
        boolean vencidoPorKilometraje,
        boolean vencidoPorTiempo,
        int kilometrosExcedidos,
        long diasVencido) {
}
