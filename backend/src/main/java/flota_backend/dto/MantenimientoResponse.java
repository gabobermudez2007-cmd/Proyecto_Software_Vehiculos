package flota_backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import flota_backend.model.Mantenimiento;

public record MantenimientoResponse(
        Long id,
        Long vehiculoId,
        String placa,
        Long tipoServicioId,
        String tipoServicio,
        Long tallerId,
        String taller,
        LocalDate fecha,
        Integer kilometraje,
        BigDecimal costo) {

    /** {@link Mantenimiento} */
    public static MantenimientoResponse desde(Mantenimiento mantenimiento) {
        return new MantenimientoResponse(
                mantenimiento.getId(),
                mantenimiento.getVehiculo().getId(),
                mantenimiento.getVehiculo().getPlaca(),
                mantenimiento.getTipoServicio().getId(),
                mantenimiento.getTipoServicio().getNombre(),
                mantenimiento.getTaller().getId(),
                mantenimiento.getTaller().getNombre(),
                mantenimiento.getFecha(),
                mantenimiento.getKilometraje(),
                mantenimiento.getCosto());
    }
}
