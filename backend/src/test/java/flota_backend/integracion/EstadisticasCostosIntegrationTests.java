
package flota_backend.integracion;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.junit.jupiter.api.Test;

import flota_backend.model.Mantenimiento;
import flota_backend.model.Taller;
import flota_backend.model.TipoServicio;
import flota_backend.model.TipoVehiculo;
import flota_backend.model.Vehiculo;

class EstadisticasCostosIntegrationTests extends PruebaIntegracionBase {

    @Test
    void sumaMantenimientosDelMismoMes() throws Exception {

        Vehiculo vehiculo = crearVehiculo(
                "ABC123", TipoVehiculo.AUTOMOVIL, 50000);

        TipoServicio tipo = crearCambioDeAceite();
        Taller taller = crearTaller();

        crearMantenimiento(
                vehiculo, tipo, taller,
                LocalDate.of(2026, 8, 15), 50000);

        Mantenimiento segundo = new Mantenimiento(
                vehiculo, tipo, taller,
                LocalDate.of(2026, 8, 20),
                55000, new BigDecimal("100000.00"));

        mantenimientoRepository.save(segundo);

        mockMvc.perform(get("/api/estadisticas/costos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].placa").value("ABC123"))
                .andExpect(jsonPath("$[0].mes").value(8))
                .andExpect(jsonPath("$[0].cantidadMantenimientos").value(2))
                .andExpect(jsonPath("$[0].costoTotal").value(250000.00));
    }

    @Test
    void excluyeMantenimientosAnulados() throws Exception {

        Vehiculo vehiculo = crearVehiculo(
                "DEF456", TipoVehiculo.AUTOMOVIL, 50000);

        TipoServicio tipo = crearCambioDeAceite();
        Taller taller = crearTaller();

        Mantenimiento vigente = crearMantenimiento(
                vehiculo, tipo, taller,
                LocalDate.of(2026, 8, 15), 50000);

        Mantenimiento anulado = new Mantenimiento(
                vehiculo, tipo, taller,
                LocalDate.of(2026, 8, 20),
                55000, new BigDecimal("350000.00"));

        anulado.setAnulado(true);
        mantenimientoRepository.save(anulado);

        mockMvc.perform(get("/api/estadisticas/costos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].cantidadMantenimientos").value(1))
                .andExpect(jsonPath("$[0].costoTotal").value(150000.00));
    }
}
