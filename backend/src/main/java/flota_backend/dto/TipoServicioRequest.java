package flota_backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * @param nombre         nombre del tipo de servicio (único)
 * @param intervaloKm    cada cuántos kilómetros se repite el servicio
 * @param intervaloMeses cada cuántos meses se repite el servicio
 */
public record TipoServicioRequest(

        @NotBlank(message = "El nombre del servicio es obligatorio")
        @Size(max = 80, message = "El nombre no puede superar los 80 caracteres")
        String nombre,

        @NotNull(message = "El intervalo en kilómetros es obligatorio")
        @Positive(message = "El intervalo en kilómetros debe ser mayor a cero")
        @Max(value = 1000000, message = "El intervalo en kilómetros no puede superar 1.000.000")
        Integer intervaloKm,

        @NotNull(message = "El intervalo en meses es obligatorio")
        @Positive(message = "El intervalo en meses debe ser mayor a cero")
        @Max(value = 240, message = "El intervalo en meses no puede superar 240")
        Integer intervaloMeses) {
}
