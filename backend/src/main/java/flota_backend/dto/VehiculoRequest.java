package flota_backend.dto;

import flota_backend.model.TipoVehiculo;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * Datos que envía el cliente para registrar o editar un vehículo.
 *
 * @param placa             placa con formato ABC123 (carro) o ABC12D (moto)
 * @param tipo              tipo de vehículo
 * @param marca             marca del vehículo
 * @param modelo            modelo del vehículo
 * @param kilometrajeActual kilometraje actual, mayor o igual a cero
 */
public record VehiculoRequest(

        @NotBlank(message = "La placa es obligatoria")
        @Pattern(regexp = "^[A-Za-z]{3}\\d{2}[A-Za-z0-9]$",
                message = "La placa debe tener el formato ABC123 o ABC12D")
        String placa,

        @NotNull(message = "El tipo de vehículo es obligatorio")
        TipoVehiculo tipo,

        @NotBlank(message = "La marca es obligatoria")
        @Size(max = 50, message = "La marca no puede superar los 50 caracteres")
        String marca,

        @NotBlank(message = "El modelo es obligatorio")
        @Size(max = 50, message = "El modelo no puede superar los 50 caracteres")
        String modelo,

        @NotNull(message = "El kilometraje actual es obligatorio")
        @PositiveOrZero(message = "El kilometraje no puede ser negativo")
        Integer kilometrajeActual) {
}
