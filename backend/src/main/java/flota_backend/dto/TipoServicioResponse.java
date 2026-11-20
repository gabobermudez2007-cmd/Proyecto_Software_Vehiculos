package flota_backend.dto;

import flota_backend.model.TipoServicio;

/**
 * @param id             identificador del tipo de servicio
 * @param nombre         nombre del servicio (por ejemplo, cambio de aceite)
 * @param intervaloKm    kilómetros sugeridos entre un servicio y el siguiente
 * @param intervaloMeses meses sugeridos entre un servicio y el siguiente
 */
public record TipoServicioResponse(Long id, String nombre, Integer intervaloKm, Integer intervaloMeses) {

    public static TipoServicioResponse desde(TipoServicio tipo) {
        return new TipoServicioResponse(tipo.getId(), tipo.getNombre(),
                tipo.getIntervaloKm(), tipo.getIntervaloMeses());
    }
}
