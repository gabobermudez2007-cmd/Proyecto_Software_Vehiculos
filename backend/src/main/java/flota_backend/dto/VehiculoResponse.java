package flota_backend.dto;

import flota_backend.model.EstadoVehiculo;
import flota_backend.model.TipoVehiculo;
import flota_backend.model.Vehiculo;

public record VehiculoResponse(
        Long id,
        String placa,
        TipoVehiculo tipo,
        String marca,
        String modelo,
        Integer kilometrajeActual,
        EstadoVehiculo estado) {

    /** Convierte una entidad {@link Vehiculo} en su representación para la API. */
    public static VehiculoResponse desde(Vehiculo vehiculo) {
        return new VehiculoResponse(
                vehiculo.getId(),
                vehiculo.getPlaca(),
                vehiculo.getTipo(),
                vehiculo.getMarca(),
                vehiculo.getModelo(),
                vehiculo.getKilometrajeActual(),
                vehiculo.getEstado());
    }
}
