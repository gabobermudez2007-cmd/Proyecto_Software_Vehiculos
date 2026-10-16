package flota_backend.integracion;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import flota_backend.model.Taller;
import flota_backend.model.TipoServicio;
import flota_backend.model.TipoVehiculo;
import flota_backend.model.Vehiculo;

/**
 * Pruebas de integración del registro de mantenimientos (RF-05):
 * POST /api/mantenimientos contra MySQL en Docker.
 */
@DisplayName("Mantenimientos · POST /api/mantenimientos")
class MantenimientoIntegrationTests extends PruebaIntegracionBase {

    private Vehiculo vehiculo;
    private TipoServicio aceite;
    private Taller taller;

    /** Cada prueba parte de un vehículo con 10.000 km, un tipo de servicio y un taller. */
    @BeforeEach
    void prepararDatos() {
        vehiculo = crearVehiculo("ABC123", TipoVehiculo.AUTOMOVIL, 10000);
        aceite = crearCambioDeAceite();
        taller = crearTaller();
    }

    private static String json(Long vehiculoId, Long tipoServicioId, Long tallerId,
            LocalDate fecha, int kilometraje, String costo) {
        return """
                {"vehiculoId": %d, "tipoServicioId": %d, "tallerId": %d,
                 "fecha": "%s", "kilometraje": %d, "costo": %s}
                """.formatted(vehiculoId, tipoServicioId, tallerId, fecha, kilometraje, costo);
    }

    private String jsonValido(LocalDate fecha, int kilometraje, String costo) {
        return json(vehiculo.getId(), aceite.getId(), taller.getId(), fecha, kilometraje, costo);
    }

    @Test
    @DisplayName("Registra un mantenimiento: 201 y actualiza el kilometraje del vehículo")
    void registrarMantenimiento() throws Exception {
        mockMvc.perform(post("/api/mantenimientos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonValido(HOY.minusDays(1), 12000, "150000.50")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.placa").value("ABC123"))
                .andExpect(jsonPath("$.tipoServicio").value("Cambio de aceite"))
                .andExpect(jsonPath("$.taller").value("Taller Central"))
                .andExpect(jsonPath("$.kilometraje").value(12000));

        assertEquals(1, mantenimientoRepository.count());
        assertEquals(12000, vehiculoRepository.findById(vehiculo.getId()).orElseThrow().getKilometrajeActual(),
                "El vehículo debe quedar con el kilometraje del mantenimiento");
    }

    @Test
    @DisplayName("Kilometraje menor al del último mantenimiento: 422 y no se guarda")
    void registrarConKilometrajeMenorAlUltimo() throws Exception {
        crearMantenimiento(vehiculo, aceite, taller, HOY.minusDays(30), 15000);

        mockMvc.perform(post("/api/mantenimientos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonValido(HOY, 14000, "100000")))
                .andExpect(status().is(422))
                .andExpect(jsonPath("$.detail").value(containsString("15000")));

        assertEquals(1, mantenimientoRepository.count(), "Solo debe existir el mantenimiento anterior");
    }

    @Test
    @DisplayName("Vehículo inactivo: 422, no se le pueden registrar mantenimientos")
    void registrarAVehiculoInactivo() throws Exception {
        Vehiculo inactivo = crearVehiculoInactivo("DEF456", 5000);

        mockMvc.perform(post("/api/mantenimientos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(inactivo.getId(), aceite.getId(), taller.getId(), HOY, 6000, "100000")))
                .andExpect(status().is(422))
                .andExpect(jsonPath("$.detail").value(containsString("inactivo")));

        assertEquals(0, mantenimientoRepository.count());
    }

    @Test
    @DisplayName("Fecha futura: 400 con el error en el campo fecha")
    void registrarConFechaFutura() throws Exception {
        mockMvc.perform(post("/api/mantenimientos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonValido(HOY.plusDays(1), 12000, "100000")))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("fecha")));
    }

    @Test
    @DisplayName("Costo negativo: 400 con el error en el campo costo")
    void registrarConCostoNegativo() throws Exception {
        mockMvc.perform(post("/api/mantenimientos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonValido(HOY, 12000, "-1")))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("costo")));
    }

    @Test
    @DisplayName("Costo con más de 2 decimales: 400 con el error en el campo costo")
    void registrarConCostoConTresDecimales() throws Exception {
        mockMvc.perform(post("/api/mantenimientos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonValido(HOY, 12000, "100.123")))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("costo")));
    }

    @Test
    @DisplayName("Cuerpo sin los campos obligatorios: 400 con el error de cada campo")
    void registrarSinCamposObligatorios() throws Exception {
        mockMvc.perform(post("/api/mantenimientos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("vehiculoId")))
                .andExpect(content().string(containsString("tallerId")))
                .andExpect(content().string(containsString("fecha")));
    }

    @Test
    @DisplayName("Vehículo que no existe: 404")
    void registrarAVehiculoInexistente() throws Exception {
        mockMvc.perform(post("/api/mantenimientos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(999999L, aceite.getId(), taller.getId(), HOY, 12000, "100000")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value(containsString("999999")));
    }

    @Test
    @DisplayName("Taller que no existe: 404")
    void registrarConTallerInexistente() throws Exception {
        mockMvc.perform(post("/api/mantenimientos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(vehiculo.getId(), aceite.getId(), 999999L, HOY, 12000, "100000")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value(containsString("taller")));
    }
}
