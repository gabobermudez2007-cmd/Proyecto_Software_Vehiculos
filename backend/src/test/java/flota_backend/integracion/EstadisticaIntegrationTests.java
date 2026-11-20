package flota_backend.integracion;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import flota_backend.model.Mantenimiento;
import flota_backend.model.Taller;
import flota_backend.model.TipoServicio;
import flota_backend.model.TipoVehiculo;
import flota_backend.model.Vehiculo;

/**
 * Pruebas de integración del gráfico de los tipos de mantenimiento más frecuentes:
 * GET /api/estadisticas/tipos-servicio contra MySQL en Docker.
 * <p>
 * Cada prueba parte de los mismos tres tipos de servicio (aceite, frenos y llantas) y
 * crea solo los mantenimientos que necesita, de modo que los conteos esperados se pueden
 * calcular a mano leyendo la prueba.
 */
@DisplayName("Estadísticas · GET /api/estadisticas/tipos-servicio")
class EstadisticaIntegrationTests extends PruebaIntegracionBase {

    private static final String URL = "/api/estadisticas/tipos-servicio";

    private TipoServicio aceite;
    private TipoServicio frenos;
    private TipoServicio llantas;
    private Taller taller;

    @BeforeEach
    void prepararCatalogos() {
        aceite = crearCambioDeAceite();
        frenos = crearRevisionDeFrenos();
        llantas = tipoServicioRepository.save(new TipoServicio("Rotación de llantas", 10000, 6));
        taller = crearTaller();
    }

    @Test
    @DisplayName("Cuenta los mantenimientos por tipo y los ordena del más frecuente al menos frecuente")
    void ordenaDelMasFrecuenteAlMenosFrecuente() throws Exception {
        Vehiculo camion = crearVehiculo("ABC123", TipoVehiculo.CAMION, 60000);
        Vehiculo bus = crearVehiculo("DEF456", TipoVehiculo.BUS, 90000);
        crearMantenimiento(camion, aceite, taller, HOY.minusMonths(6), 40000);
        crearMantenimiento(camion, aceite, taller, HOY.minusMonths(1), 50000);
        crearMantenimiento(bus, aceite, taller, HOY.minusMonths(2), 80000);
        crearMantenimiento(bus, llantas, taller, HOY.minusMonths(1), 85000);

        // 3 de aceite y 1 de llantas sobre un total de 4: 75 % y 25 %
        mockMvc.perform(get(URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].tipoServicio").value("Cambio de aceite"))
                .andExpect(jsonPath("$[0].tipoServicioId").value(aceite.getId()))
                .andExpect(jsonPath("$[0].cantidad").value(3))
                .andExpect(jsonPath("$[0].porcentaje").value(75.0))
                .andExpect(jsonPath("$[1].tipoServicio").value("Rotación de llantas"))
                .andExpect(jsonPath("$[1].cantidad").value(1))
                .andExpect(jsonPath("$[1].porcentaje").value(25.0));
    }

    @Test
    @DisplayName("Los tipos de servicio que nunca se han hecho aparecen con cantidad cero")
    void tiposSinMantenimientosSalenEnCero() throws Exception {
        Vehiculo vehiculo = crearVehiculo("ABC123", TipoVehiculo.AUTOMOVIL, 20000);
        crearMantenimiento(vehiculo, aceite, taller, HOY.minusMonths(1), 15000);

        mockMvc.perform(get(URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].tipoServicio").value("Cambio de aceite"))
                .andExpect(jsonPath("$[0].porcentaje").value(100.0))
                .andExpect(jsonPath("$[1].tipoServicio").value("Revisión de frenos"))
                .andExpect(jsonPath("$[1].cantidad").value(0))
                .andExpect(jsonPath("$[1].porcentaje").value(0.0))
                .andExpect(jsonPath("$[2].tipoServicio").value("Rotación de llantas"))
                .andExpect(jsonPath("$[2].cantidad").value(0));
    }

    @Test
    @DisplayName("Sin mantenimientos registrados: todos los tipos en cero y sin dividir por cero")
    void sinMantenimientosTodoEnCero() throws Exception {
        mockMvc.perform(get(URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].cantidad").value(0))
                .andExpect(jsonPath("$[0].porcentaje").value(0.0))
                .andExpect(jsonPath("$[2].cantidad").value(0))
                .andExpect(jsonPath("$[2].porcentaje").value(0.0));
    }

    @Test
    @DisplayName("Los porcentajes se redondean a dos decimales")
    void porcentajeConDosDecimales() throws Exception {
        Vehiculo vehiculo = crearVehiculo("ABC123", TipoVehiculo.CAMION, 90000);
        crearMantenimiento(vehiculo, aceite, taller, HOY.minusMonths(3), 60000);
        crearMantenimiento(vehiculo, aceite, taller, HOY.minusMonths(2), 70000);
        crearMantenimiento(vehiculo, frenos, taller, HOY.minusMonths(1), 80000);

        // 2 de 3 = 66,666... → 66,67 y 1 de 3 = 33,333... → 33,33
        mockMvc.perform(get(URL))
                .andExpect(jsonPath("$[0].porcentaje").value(66.67))
                .andExpect(jsonPath("$[1].porcentaje").value(33.33));
    }

    @Test
    @DisplayName("Los mantenimientos anulados no se cuentan")
    void anuladosNoSeCuentan() throws Exception {
        Vehiculo vehiculo = crearVehiculo("ABC123", TipoVehiculo.CAMION, 30000);
        crearMantenimiento(vehiculo, frenos, taller, HOY.minusMonths(2), 20000);
        Mantenimiento anulado = new Mantenimiento(vehiculo, aceite, taller, HOY.minusMonths(1), 25000,
                new BigDecimal("100000.00"));
        anulado.setAnulado(true);
        mantenimientoRepository.save(anulado);

        mockMvc.perform(get(URL))
                .andExpect(jsonPath("$[0].tipoServicio").value("Revisión de frenos"))
                .andExpect(jsonPath("$[0].cantidad").value(1))
                .andExpect(jsonPath("$[0].porcentaje").value(100.0))
                .andExpect(jsonPath("$[1].tipoServicio").value("Cambio de aceite"))
                .andExpect(jsonPath("$[1].cantidad").value(0));
    }

    @Test
    @DisplayName("Los mantenimientos de vehículos inactivos sí se cuentan (son historia de la empresa)")
    void vehiculosInactivosSiSeCuentan() throws Exception {
        Vehiculo inactivo = crearVehiculoInactivo("PQR678", 33000);
        crearMantenimiento(inactivo, aceite, taller, HOY.minusMonths(3), 31000);

        mockMvc.perform(get(URL))
                .andExpect(jsonPath("$[0].tipoServicio").value("Cambio de aceite"))
                .andExpect(jsonPath("$[0].cantidad").value(1));
    }

    @Test
    @DisplayName("Filtra por tipo de vehículo")
    void filtraPorTipoDeVehiculo() throws Exception {
        Vehiculo camion = crearVehiculo("ABC123", TipoVehiculo.CAMION, 60000);
        Vehiculo bus = crearVehiculo("DEF456", TipoVehiculo.BUS, 90000);
        crearMantenimiento(camion, aceite, taller, HOY.minusMonths(1), 50000);
        crearMantenimiento(bus, llantas, taller, HOY.minusMonths(2), 80000);
        crearMantenimiento(bus, llantas, taller, HOY.minusMonths(1), 85000);

        mockMvc.perform(get(URL).param("tipo", "CAMION"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].tipoServicio").value("Cambio de aceite"))
                .andExpect(jsonPath("$[0].cantidad").value(1))
                .andExpect(jsonPath("$[0].porcentaje").value(100.0))
                .andExpect(jsonPath("$[2].tipoServicio").value("Rotación de llantas"))
                .andExpect(jsonPath("$[2].cantidad").value(0));
    }

    @Test
    @DisplayName("Filtra por periodo: las fechas desde y hasta están incluidas")
    void filtraPorPeriodo() throws Exception {
        Vehiculo vehiculo = crearVehiculo("ABC123", TipoVehiculo.CAMION, 90000);
        crearMantenimiento(vehiculo, frenos, taller, HOY.minusMonths(10), 40000);   // antes del periodo
        crearMantenimiento(vehiculo, aceite, taller, HOY.minusMonths(6), 50000);    // justo en "desde"
        crearMantenimiento(vehiculo, llantas, taller, HOY.minusMonths(4), 60000);   // dentro
        crearMantenimiento(vehiculo, aceite, taller, HOY.minusMonths(2), 70000);    // justo en "hasta"
        crearMantenimiento(vehiculo, frenos, taller, HOY.minusMonths(1), 80000);    // después del periodo

        mockMvc.perform(get(URL)
                .param("desde", HOY.minusMonths(6).toString())
                .param("hasta", HOY.minusMonths(2).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].tipoServicio").value("Cambio de aceite"))
                .andExpect(jsonPath("$[0].cantidad").value(2))
                .andExpect(jsonPath("$[1].tipoServicio").value("Rotación de llantas"))
                .andExpect(jsonPath("$[1].cantidad").value(1))
                .andExpect(jsonPath("$[2].tipoServicio").value("Revisión de frenos"))
                .andExpect(jsonPath("$[2].cantidad").value(0));
    }

    @Test
    @DisplayName("Fecha inicial posterior a la final: 400")
    void periodoInvertido() throws Exception {
        mockMvc.perform(get(URL)
                .param("desde", "2026-06-30")
                .param("hasta", "2026-01-01"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        "La fecha inicial (2026-06-30) no puede ser posterior a la fecha final (2026-01-01)"));
    }

    @Test
    @DisplayName("Fecha con formato inválido: 400")
    void fechaConFormatoInvalido() throws Exception {
        mockMvc.perform(get(URL).param("desde", "30/06/2026"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Tipo de vehículo que no existe en el filtro: 400")
    void tipoDeVehiculoInvalido() throws Exception {
        mockMvc.perform(get(URL).param("tipo", "AVION"))
                .andExpect(status().isBadRequest());
    }
}
