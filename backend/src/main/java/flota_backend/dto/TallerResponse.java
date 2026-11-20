package flota_backend.dto;

import flota_backend.model.Taller;

/**
 * @param id       identificador del taller
 * @param nombre   nombre del taller
 * @param telefono teléfono de contacto (puede ser nulo)
 */
public record TallerResponse(Long id, String nombre, String telefono) {

    public static TallerResponse desde(Taller taller) {
        return new TallerResponse(taller.getId(), taller.getNombre(), taller.getTelefono());
    }
}
