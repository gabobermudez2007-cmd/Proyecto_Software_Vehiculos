package flota_backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.PositiveOrZero;

/**
 * @param vehiculoId     identificador del vehículo al que se le hizo el servicio
 * @param tipoServicioId identificador del tipo de servicio realizado
 * @param tallerId       identificador del taller que lo realizó
 * @param fecha          fecha del servicio (no puede ser futura)
 * @param kilometraje    kilometraje del vehículo al momento del servicio
 * @param costo          costo del servicio, mayor o igual a cero
 */
public record MantenimientoRequest(

        @NotNull(message = "El vehículo es obligatorio")
        Long vehiculoId,

        @NotNull(message = "El tipo de servicio es obligatorio")
        Long tipoServicioId,

        @NotNull(message = "El taller es obligatorio")
        Long tallerId,

        @NotNull(message = "La fecha es obligatoria")
        @PastOrPresent(message = "La fecha del mantenimiento no puede ser futura")
        LocalDate fecha,

        @NotNull(message = "El kilometraje es obligatorio")
        @PositiveOrZero(message = "El kilometraje no puede ser negativo")
        Integer kilometraje,

        @NotNull(message = "El costo es obligatorio")
        @PositiveOrZero(message = "El costo no puede ser negativo")
        @Digits(integer = 10, fraction = 2,
                message = "El costo admite hasta 10 dígitos enteros y 2 decimales")
        BigDecimal costo) {
}
