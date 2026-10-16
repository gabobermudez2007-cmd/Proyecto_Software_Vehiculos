package flota_backend.integracion;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import flota_backend.model.EstadoVehiculo;
import flota_backend.model.TipoServicio;
import flota_backend.model.TipoVehiculo;
import flota_backend.model.Vehiculo;

/**
 * Pruebas de integración de la gestión de vehículos (RF-01 a RF-04):
 * POST, GET, GET por id, PUT y DELETE de /api/vehiculos contra MySQL en Docker.
 */
@DisplayName("Vehículos · /api/vehiculos")
class VehiculoIntegrationTests extends PruebaIntegracionBase {

    private static String json(String placa, String tipo, int kilometraje) {
        return """
                {"placa": "%s", "tipo": "%s", "marca": "Toyota", "modelo": "Hilux", "kilometrajeActual": %d}
                """.formatted(placa, tipo, kilometraje);
    }

    @Test
    @DisplayName("POST registra un vehículo: 201, Location y placa guardada en mayúsculas")
    void registrarVehiculo() throws Exception {
        mockMvc.perform(post("/api/vehiculos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("abc123", "CAMIONETA", 15000)))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.placa").value("ABC123"))
                .andExpect(jsonPath("$.estado").value("ACTIVO"));

        assertTrue(vehiculoRepository.existsByPlaca("ABC123"), "El vehículo debe quedar guardado en MySQL");
    }

    @Test
    @DisplayName("POST con una placa que ya existe: 409 Conflict")
    void registrarConPlacaDuplicada() throws Exception {
        crearVehiculo("ABC123", TipoVehiculo.AUTOMOVIL, 1000);

        mockMvc.perform(post("/api/vehiculos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("abc123", "AUTOMOVIL", 500)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(containsString("ABC123")));
    }

    @Test
    @DisplayName("POST con placa de formato inválido y kilometraje negativo: 400 con el error de cada campo")
    void registrarConDatosInvalidos() throws Exception {
        mockMvc.perform(post("/api/vehiculos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("12", "AUTOMOVIL", -5)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("placa")))
                .andExpect(content().string(containsString("kilometrajeActual")));

        assertEquals(0, vehiculoRepository.count(), "No debe guardarse nada");
    }

    @Test
    @DisplayName("POST con un tipo de vehículo que no existe: 400")
    void registrarConTipoInexistente() throws Exception {
        mockMvc.perform(post("/api/vehiculos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("ABC123", "AVION", 1000)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET lista la flota y aplica los filtros de tipo, estado y placa")
    void listarConFiltros() throws Exception {
        crearVehiculo("ABC123", TipoVehiculo.AUTOMOVIL, 1000);
        crearVehiculo("DEF456", TipoVehiculo.CAMION, 2000);
        crearVehiculoInactivo("GHI789", 3000);

        mockMvc.perform(get("/api/vehiculos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)));

        mockMvc.perform(get("/api/vehiculos").param("tipo", "CAMION"))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].placa").value("DEF456"));

        mockMvc.perform(get("/api/vehiculos").param("estado", "INACTIVO"))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].placa").value("GHI789"));

        mockMvc.perform(get("/api/vehiculos").param("placa", "abc"))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].placa").value("ABC123"));
    }

    @Test
    @DisplayName("GET por id de un vehículo existente: 200 con sus datos")
    void consultarPorId() throws Exception {
        Vehiculo vehiculo = crearVehiculo("ABC123", TipoVehiculo.AUTOMOVIL, 1000);

        mockMvc.perform(get("/api/vehiculos/{id}", vehiculo.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.placa").value("ABC123"))
                .andExpect(jsonPath("$.kilometrajeActual").value(1000));
    }

    @Test
    @DisplayName("GET por id de un vehículo que no existe: 404 en formato ProblemDetail")
    void consultarInexistente() throws Exception {
        mockMvc.perform(get("/api/vehiculos/{id}", 999999))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.detail").value(containsString("999999")));
    }

    @Test
    @DisplayName("GET con un id que no es un número: 400")
    void consultarConIdInvalido() throws Exception {
        mockMvc.perform(get("/api/vehiculos/{id}", "abc"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("PUT edita un vehículo: 200 y los cambios quedan guardados")
    void editarVehiculo() throws Exception {
        Vehiculo vehiculo = crearVehiculo("ABC123", TipoVehiculo.AUTOMOVIL, 1000);

        mockMvc.perform(put("/api/vehiculos/{id}", vehiculo.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("ABC123", "AUTOMOVIL", 5000)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.kilometrajeActual").value(5000));

        assertEquals(5000, vehiculoRepository.findById(vehiculo.getId()).orElseThrow().getKilometrajeActual());
    }

    @Test
    @DisplayName("PUT con la placa de otro vehículo: 409 Conflict")
    void editarConPlacaDeOtroVehiculo() throws Exception {
        crearVehiculo("ABC123", TipoVehiculo.AUTOMOVIL, 1000);
        Vehiculo otro = crearVehiculo("DEF456", TipoVehiculo.AUTOMOVIL, 1000);

        mockMvc.perform(put("/api/vehiculos/{id}", otro.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("ABC123", "AUTOMOVIL", 1000)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("PUT con kilometraje menor al del último mantenimiento: 422")
    void editarConKilometrajeMenorAlUltimoMantenimiento() throws Exception {
        Vehiculo vehiculo = crearVehiculo("ABC123", TipoVehiculo.AUTOMOVIL, 50000);
        TipoServicio aceite = crearCambioDeAceite();
        crearMantenimiento(vehiculo, aceite, crearTaller(), HOY.minusDays(10), 48000);

        mockMvc.perform(put("/api/vehiculos/{id}", vehiculo.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("ABC123", "AUTOMOVIL", 40000)))
                .andExpect(status().is(422))
                .andExpect(jsonPath("$.detail").value(containsString("48000")));
    }

    @Test
    @DisplayName("DELETE de un vehículo sin mantenimientos: se elimina definitivamente")
    void eliminarSinMantenimientos() throws Exception {
        Vehiculo vehiculo = crearVehiculo("ABC123", TipoVehiculo.AUTOMOVIL, 1000);

        mockMvc.perform(delete("/api/vehiculos/{id}", vehiculo.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eliminadoDefinitivamente").value(true));

        assertTrue(vehiculoRepository.findById(vehiculo.getId()).isEmpty(), "Ya no debe existir en MySQL");
    }

    @Test
    @DisplayName("DELETE de un vehículo con mantenimientos: queda INACTIVO y conserva su historial")
    void eliminarConMantenimientos() throws Exception {
        Vehiculo vehiculo = crearVehiculo("ABC123", TipoVehiculo.AUTOMOVIL, 50000);
        crearMantenimiento(vehiculo, crearCambioDeAceite(), crearTaller(), HOY.minusDays(10), 48000);

        mockMvc.perform(delete("/api/vehiculos/{id}", vehiculo.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eliminadoDefinitivamente").value(false));

        assertEquals(EstadoVehiculo.INACTIVO,
                vehiculoRepository.findById(vehiculo.getId()).orElseThrow().getEstado());
        assertEquals(1, mantenimientoRepository.count(), "El mantenimiento se conserva");
    }
}
