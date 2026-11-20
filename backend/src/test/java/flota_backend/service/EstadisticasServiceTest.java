
package flota_backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import flota_backend.dto.EstadisticaCostoResponse;
import flota_backend.model.Mantenimiento;
import flota_backend.model.Vehiculo;
import flota_backend.model.TipoVehiculo;
import flota_backend.repository.MantenimientoRepository;

@ExtendWith(MockitoExtension.class)
class EstadisticasServiceTest {

    @Mock
    private MantenimientoRepository mantenimientoRepository;

    @InjectMocks
    private EstadisticasService estadisticasService;

    @Test
    void sumaDosMantenimientosDelMismoMes() {

        Vehiculo vehiculo = new Vehiculo(
                "ABC123", TipoVehiculo.AUTOMOVIL,
                "Toyota", "Corolla", 50000);

        

        Mantenimiento primero = new Mantenimiento();
        primero.setVehiculo(vehiculo);
        primero.setFecha(LocalDate.of(2026, 8, 15));
        primero.setCosto(new BigDecimal("180000.00"));

        Mantenimiento segundo = new Mantenimiento();
        segundo.setVehiculo(vehiculo);
        segundo.setFecha(LocalDate.of(2026, 8, 20));
        segundo.setCosto(new BigDecimal("100000.00"));

        when(mantenimientoRepository.filtrar(
                null, null, null, null))
                .thenReturn(List.of(primero, segundo));

        List<EstadisticaCostoResponse> resultado =
                estadisticasService.obtenerEstadisticas();

        assertEquals(1, resultado.size());
        assertEquals(2, resultado.get(0).cantidadMantenimientos());
        assertEquals(0, new BigDecimal("280000.00")
                .compareTo(resultado.get(0).costoTotal()));
    }

@Test
void separaMantenimientosDeMesesDiferentes() {

    Vehiculo vehiculo = new Vehiculo(
            "ABC123", TipoVehiculo.AUTOMOVIL,
            "Toyota", "Corolla", 50000);
    // Asignamos un ID al vehículo simulado.
        org.springframework.test.util.ReflectionTestUtils.setField(
        vehiculo, "id", 1L);
        assertEquals(1L, vehiculo.getId());

    Mantenimiento mayo = new Mantenimiento();
    mayo.setVehiculo(vehiculo);
    mayo.setFecha(LocalDate.of(2026, 5, 15));
    mayo.setCosto(new BigDecimal("350000.00"));

    Mantenimiento agosto = new Mantenimiento();
    agosto.setVehiculo(vehiculo);
    agosto.setFecha(LocalDate.of(2026, 8, 15));
    agosto.setCosto(new BigDecimal("180000.00"));

    when(mantenimientoRepository.filtrar(
            null, null, null, null))
            .thenReturn(List.of(mayo, agosto));

    List<EstadisticaCostoResponse> resultado =
            estadisticasService.obtenerEstadisticas();

    assertEquals(2, resultado.size());

    assertEquals(5, resultado.get(0).mes());
    assertEquals(0, new BigDecimal("350000.00")
            .compareTo(resultado.get(0).costoTotal()));

    assertEquals(8, resultado.get(1).mes());
    assertEquals(0, new BigDecimal("180000.00")
            .compareTo(resultado.get(1).costoTotal()));
}
 

@Test
void noIncluyeMantenimientosAnulados() {

    Vehiculo vehiculo = new Vehiculo(
            "ABC123", TipoVehiculo.AUTOMOVIL,
            "Toyota", "Corolla", 50000);

    org.springframework.test.util.ReflectionTestUtils.setField(
            vehiculo, "id", 1L);

    Mantenimiento vigente = new Mantenimiento();
    vigente.setVehiculo(vehiculo);
    vigente.setFecha(LocalDate.of(2026, 8, 15));
    vigente.setCosto(new BigDecimal("180000.00"));

    // El repositorio solo devuelve mantenimientos vigentes.
    when(mantenimientoRepository.filtrar(
            null, null, null, null))
            .thenReturn(List.of(vigente));

    List<EstadisticaCostoResponse> resultado =
            estadisticasService.obtenerEstadisticas();

    assertEquals(1, resultado.size());
    assertEquals(1, resultado.get(0).cantidadMantenimientos());
    assertEquals(0, new BigDecimal("180000.00")
            .compareTo(resultado.get(0).costoTotal()));
}


@Test
void noGeneraEstadisticasSinMantenimientos() {

    // Simulamos una consulta sin registros.
    when(mantenimientoRepository.filtrar(
            null, null, null, null))
            .thenReturn(List.of());

    List<EstadisticaCostoResponse> resultado =
            estadisticasService.obtenerEstadisticas();

    // No debe generar estadísticas inexistentes.
    assertEquals(0, resultado.size());
}


}
