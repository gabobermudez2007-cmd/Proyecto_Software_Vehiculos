package flota_backend.service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import flota_backend.dto.AlertaResponse;
import flota_backend.model.EstadoVehiculo;
import flota_backend.model.Mantenimiento;
import flota_backend.model.TipoServicio;
import flota_backend.model.TipoVehiculo;
import flota_backend.model.Vehiculo;
import flota_backend.repository.MantenimientoRepository;

@Service
public class AlertaService {


    private static final Comparator<AlertaResponse> POR_CRITICIDAD = Comparator
            .comparingInt(AlertaService::criteriosVencidos).reversed()
            .thenComparing(Comparator.comparingLong(AlertaResponse::diasVencido).reversed())
            .thenComparing(Comparator.comparingInt(AlertaResponse::kilometrosExcedidos).reversed())
            .thenComparing(AlertaResponse::placa);

    private final MantenimientoRepository mantenimientoRepository;

    public AlertaService(MantenimientoRepository mantenimientoRepository) {
        this.mantenimientoRepository = mantenimientoRepository;
    }

    /**
     * @param tipo tipo de vehículo por el que filtrar (puede ser nulo)
     * @return las alertas; la lista viene vacía si toda la flota está al día
     */
    @Transactional(readOnly = true)
    public List<AlertaResponse> listar(TipoVehiculo tipo) {
        LocalDate hoy = LocalDate.now();

        Map<ClaveServicio, Mantenimiento> ultimos = new HashMap<>();
        for (Mantenimiento mantenimiento : mantenimientoRepository.vigentesDeVehiculosEnEstado(EstadoVehiculo.ACTIVO)) {
            if (tipo != null && mantenimiento.getVehiculo().getTipo() != tipo) {
                continue;
            }
            ClaveServicio clave = new ClaveServicio(
                    mantenimiento.getVehiculo().getId(), mantenimiento.getTipoServicio().getId());
            Mantenimiento ultimo = ultimos.get(clave);
            if (ultimo == null || esMasReciente(mantenimiento, ultimo)) {
                ultimos.put(clave, mantenimiento);
            }
        }
        List<AlertaResponse> alertas = new ArrayList<>();
        for (Mantenimiento ultimo : ultimos.values()) {
            AlertaResponse alerta = evaluar(ultimo, hoy);
            if (alerta.vencidoPorKilometraje() || alerta.vencidoPorTiempo()) {
                alertas.add(alerta);
            }
        }

        alertas.sort(POR_CRITICIDAD);
        return alertas;
    }


    private AlertaResponse evaluar(Mantenimiento ultimo, LocalDate hoy) {
        Vehiculo vehiculo = ultimo.getVehiculo();
        TipoServicio tipoServicio = ultimo.getTipoServicio();

        int kilometrajeProximo = ultimo.getKilometraje() + tipoServicio.getIntervaloKm();
        LocalDate fechaProxima = ultimo.getFecha().plusMonths(tipoServicio.getIntervaloMeses());

        boolean vencidoPorKilometraje = vehiculo.getKilometrajeActual() >= kilometrajeProximo;
        boolean vencidoPorTiempo = !hoy.isBefore(fechaProxima);

        int kilometrosExcedidos = Math.max(0, vehiculo.getKilometrajeActual() - kilometrajeProximo);
        long diasVencido = Math.max(0, ChronoUnit.DAYS.between(fechaProxima, hoy));

        return new AlertaResponse(
                vehiculo.getId(),
                vehiculo.getPlaca(),
                vehiculo.getTipo(),
                vehiculo.getKilometrajeActual(),
                tipoServicio.getId(),
                tipoServicio.getNombre(),
                ultimo.getFecha(),
                ultimo.getKilometraje(),
                fechaProxima,
                kilometrajeProximo,
                vencidoPorKilometraje,
                vencidoPorTiempo,
                kilometrosExcedidos,
                diasVencido);
    }

    /** {@code a} es posterior a {@code b}: */
    private boolean esMasReciente(Mantenimiento a, Mantenimiento b) {
        int comparacion = a.getFecha().compareTo(b.getFecha());
        return comparacion > 0 || (comparacion == 0 && a.getId() > b.getId());
    }

    private static int criteriosVencidos(AlertaResponse alerta) {
        return (alerta.vencidoPorKilometraje() ? 1 : 0) + (alerta.vencidoPorTiempo() ? 1 : 0);
    }

    private record ClaveServicio(Long vehiculoId, Long tipoServicioId) {
    }
}
