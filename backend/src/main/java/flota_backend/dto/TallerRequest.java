package flota_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * @param nombre   nombre del taller (único)
 * @param telefono teléfono de contacto (opcional)
 */
public record TallerRequest(

        @NotBlank(message = "El nombre del taller es obligatorio")
        @Size(max = 100, message = "El nombre no puede superar los 100 caracteres")
        String nombre,

        @Size(max = 20, message = "El teléfono no puede superar los 20 caracteres")
        @Pattern(regexp = "^[0-9+\\-() ]*$",
                message = "El teléfono solo puede tener números, espacios y los símbolos + - ( )")
        String telefono) {
}
