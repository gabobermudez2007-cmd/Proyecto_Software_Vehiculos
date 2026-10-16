package flota_backend.integracion;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import flota_backend.model.Mantenimiento;
import flota_backend.model.Taller;
import flota_backend.model.TipoServicio;
import flota_backend.model.TipoVehiculo;
import flota_backend.model.Vehiculo;

/**
 * Pruebas de integración del historial de mantenimientos (RF-06, PDS-62):
 * GET /api/mantenimientos/vehiculo/{vehiculoId} contra MySQL en Docker.
 */
@DisplayName("Historial · GET /api/mantenimientos/vehiculo/{id}")
class HistorialIntegrationTests extends PruebaIntegracionBase {

    private static final String URL = "/api/mantenimientos/vehiculo/{vehiculoId}";

    @Test
    @DisplayName("Devuelve todos los mantenimientos del más reciente al más antiguo")
    void historialOrdenadoPorFecha() throws Exception {
        Vehiculo vehiculo = crearVehiculo("ABC123", TipoVehiculo.AUTOMOVIL, 30000);
        TipoServicio aceite = crearCambioDeAceite();
        TipoServicio frenos = crearRevisionDeFrenos();
        Taller taller = crearTaller();
        // Se guardan desordenados a propósito
        crearMantenimiento(vehiculo, aceite, taller, HOY.minusDays(30), 20000);
        crearMantenimiento(vehiculo, frenos, taller, HOY.minusDays(5), 25000);
        crearMantenimiento(vehiculo, aceite, taller, HOY.minusDays(100), 10000);

        mockMvc.perform(get(URL, vehiculo.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].fecha").value(HOY.minusDays(5).toString()))
                .andExpect(jsonPath("$[0].tipoServicioId").value(frenos.getId().intValue()))
                .andExpect(jsonPath("$[1].fecha").value(HOY.minusDays(30).toString()))
                .andExpect(jsonPath("$[2].fecha").value(HOY.minusDays(100).toString()))
                .andExpect(jsonPath("$[2].placa").value("ABC123"))
                .andExpect(jsonPath("$[2].taller").value("Taller Central"));
    }

    @Test
    @DisplayName("Con dos mantenimientos el mismo día, primero aparece el último registrado")
    void historialConFechasIguales() throws Exception {
        Vehiculo vehiculo = crearVehiculo("ABC123", TipoVehiculo.AUTOMOVIL, 30000);
        TipoServicio aceite = crearCambioDeAceite();
        Taller taller = crearTaller();
        Mantenimiento primero = crearMantenimiento(vehiculo, aceite, taller, HOY.minusDays(10), 20000);
        Mantenimiento segundo = crearMantenimiento(vehiculo, crearRevisionDeFrenos(), taller, HOY.minusDays(10), 20000);

        mockMvc.perform(get(URL, vehiculo.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(segundo.getId().intValue()))
                .andExpect(jsonPath("$[1].id").value(primero.getId().intValue()));
    }

    @Test
    @DisplayName("Solo trae los mantenimientos del vehículo consultado")
    void historialSoloDelVehiculo() throws Exception {
        Vehiculo vehiculo = crearVehiculo("ABC123", TipoVehiculo.AUTOMOVIL, 30000);
        Vehiculo otro = crearVehiculo("DEF456", TipoVehiculo.CAMION, 30000);
        TipoServicio aceite = crearCambioDeAceite();
        Taller taller = crearTaller();
        crearMantenimiento(vehiculo, aceite, taller, HOY.minusDays(10), 20000);
        crearMantenimiento(otro, aceite, taller, HOY.minusDays(3), 25000);

        mockMvc.perform(get(URL, vehiculo.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].placa").value("ABC123"));
    }

    @Test
    @DisplayName("Vehículo sin mantenimientos: 200 con una lista vacía")
    void historialVacio() throws Exception {
        Vehiculo vehiculo = crearVehiculo("ABC123", TipoVehiculo.AUTOMOVIL, 1000);

        mockMvc.perform(get(URL, vehiculo.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("Un vehículo inactivo conserva y muestra su historial")
    void historialDeVehiculoInactivo() throws Exception {
        Vehiculo inactivo = crearVehiculoInactivo("ABC123", 30000);
        crearMantenimiento(inactivo, crearCambioDeAceite(), crearTaller(), HOY.minusDays(10), 20000);

        mockMvc.perform(get(URL, inactivo.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    @DisplayName("Vehículo que no existe: 404")
    void historialDeVehiculoInexistente() throws Exception {
        mockMvc.perform(get(URL, 999999))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    @DisplayName("Id que no es un número: 400")
    void historialConIdInvalido() throws Exception {
        mockMvc.perform(get(URL, "abc"))
                .andExpect(status().isBadRequest());
    }
}
