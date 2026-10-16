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

/**
 * Reglas de negocio para las alertas de mantenimiento preventivo.
 * <p>
 * Para cada vehículo activo y cada tipo de servicio que ha recibido, toma su último
 * mantenimiento vigente y calcula el próximo servicio previsto sumándole el intervalo
 * del tipo de servicio (en kilómetros y en meses). El vehículo queda en alerta si su
 * kilometraje actual alcanzó el previsto o si ya llegó la fecha prevista.
 */
@Service
public class AlertaService {

    /**
     * Orden de criticidad: primero los vencidos por kilometraje y por tiempo a la vez,
     * luego los de más días de atraso, luego los de más kilómetros excedidos y, a igual
     * criticidad, por placa.
     */
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
     * Lista los vehículos activos que superaron el kilometraje o el tiempo previsto para
     * el próximo mantenimiento de algún tipo de servicio, ordenados por criticidad.
     * <p>
     * Un vehículo puede aparecer varias veces si tiene vencidos varios tipos de servicio.
     * Los vehículos inactivos y los que no tienen mantenimientos registrados no generan alertas.
     *
     * @param tipo tipo de vehículo por el que filtrar (puede ser nulo)
     * @return las alertas; la lista viene vacía si toda la flota está al día
     */
    @Transactional(readOnly = true)
    public List<AlertaResponse> listar(TipoVehiculo tipo) {
        LocalDate hoy = LocalDate.now();

        // 1. Último mantenimiento vigente de cada par (vehículo, tipo de servicio)
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

        // 2. Calcular el próximo servicio de cada uno y quedarse solo con los vencidos
        List<AlertaResponse> alertas = new ArrayList<>();
        for (Mantenimiento ultimo : ultimos.values()) {
            AlertaResponse alerta = evaluar(ultimo, hoy);
            if (alerta.vencidoPorKilometraje() || alerta.vencidoPorTiempo()) {
                alertas.add(alerta);
            }
        }

        // 3. Ordenar por criticidad
        alertas.sort(POR_CRITICIDAD);
        return alertas;
    }

    /**
     * Calcula el próximo servicio a partir del último mantenimiento de un tipo y lo compara
     * con el kilometraje actual del vehículo y con la fecha de hoy.
     */
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

    /** Indica si {@code a} es posterior a {@code b}: por fecha y, a igual fecha, por id (el último registrado). */
    private boolean esMasReciente(Mantenimiento a, Mantenimiento b) {
        int comparacion = a.getFecha().compareTo(b.getFecha());
        return comparacion > 0 || (comparacion == 0 && a.getId() > b.getId());
    }

    /** Cuántos criterios (kilometraje, tiempo) tiene vencidos una alerta: 1 o 2. */
    private static int criteriosVencidos(AlertaResponse alerta) {
        return (alerta.vencidoPorKilometraje() ? 1 : 0) + (alerta.vencidoPorTiempo() ? 1 : 0);
    }

    /** Identifica un servicio de un vehículo: el par (vehículo, tipo de servicio). */
    private record ClaveServicio(Long vehiculoId, Long tipoServicioId) {
    }
}
