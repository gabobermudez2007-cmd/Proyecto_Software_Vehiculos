package flota_backend.integracion;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import flota_backend.model.Mantenimiento;
import flota_backend.model.Taller;
import flota_backend.model.TipoServicio;
import flota_backend.model.TipoVehiculo;
import flota_backend.model.Vehiculo;

/**
 * Pruebas de integración de las alertas de mantenimiento (RF-08/RF-09, PDS-70):
 * GET /api/alertas contra MySQL en Docker.
 * <p>
 * El cambio de aceite se repite cada 10.000 km o 6 meses, y la revisión de frenos
 * cada 20.000 km o 12 meses. Las fechas se calculan a partir de hoy para que las
 * pruebas den el mismo resultado cualquier día que se ejecuten.
 */
@DisplayName("Alertas · GET /api/alertas")
class AlertaIntegrationTests extends PruebaIntegracionBase {

    private static final String URL = "/api/alertas";

    private TipoServicio aceite;
    private TipoServicio frenos;
    private Taller taller;

    @BeforeEach
    void prepararCatalogos() {
        aceite = crearCambioDeAceite();
        frenos = crearRevisionDeFrenos();
        taller = crearTaller();
    }

    @Test
    @DisplayName("Vencido por kilometraje: alcanzó el kilometraje del próximo servicio")
    void vencidoPorKilometraje() throws Exception {
        Vehiculo vehiculo = crearVehiculo("DEF456", TipoVehiculo.CAMION, 25000);
        crearMantenimiento(vehiculo, aceite, taller, HOY.minusMonths(1), 10000);

        mockMvc.perform(get(URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].placa").value("DEF456"))
                .andExpect(jsonPath("$[0].tipoServicio").value("Cambio de aceite"))
                .andExpect(jsonPath("$[0].kilometrajeProximoServicio").value(20000))
                .andExpect(jsonPath("$[0].vencidoPorKilometraje").value(true))
                .andExpect(jsonPath("$[0].vencidoPorTiempo").value(false))
                .andExpect(jsonPath("$[0].kilometrosExcedidos").value(5000))
                .andExpect(jsonPath("$[0].diasVencido").value(0));
    }

    @Test
    @DisplayName("Vencido por tiempo: ya pasó la fecha del próximo servicio")
    void vencidoPorTiempo() throws Exception {
        Vehiculo vehiculo = crearVehiculo("GHI789", TipoVehiculo.AUTOMOVIL, 12000);
        LocalDate fechaServicio = HOY.minusMonths(7);
        LocalDate fechaProxima = fechaServicio.plusMonths(6);
        crearMantenimiento(vehiculo, aceite, taller, fechaServicio, 10000);

        mockMvc.perform(get(URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].placa").value("GHI789"))
                .andExpect(jsonPath("$[0].fechaProximoServicio").value(fechaProxima.toString()))
                .andExpect(jsonPath("$[0].vencidoPorKilometraje").value(false))
                .andExpect(jsonPath("$[0].vencidoPorTiempo").value(true))
                .andExpect(jsonPath("$[0].diasVencido").value((int) ChronoUnit.DAYS.between(fechaProxima, HOY)));
    }

    @Test
    @DisplayName("Vencido por kilometraje y por tiempo a la vez")
    void vencidoPorAmbos() throws Exception {
        Vehiculo vehiculo = crearVehiculo("JKL012", TipoVehiculo.BUS, 25000);
        crearMantenimiento(vehiculo, aceite, taller, HOY.minusMonths(8), 10000);

        mockMvc.perform(get(URL))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].vencidoPorKilometraje").value(true))
                .andExpect(jsonPath("$[0].vencidoPorTiempo").value(true));
    }

    @Test
    @DisplayName("Vehículo al día: no genera alerta (lista vacía)")
    void vehiculoAlDia() throws Exception {
        Vehiculo vehiculo = crearVehiculo("ABC123", TipoVehiculo.AUTOMOVIL, 12000);
        crearMantenimiento(vehiculo, aceite, taller, HOY.minusMonths(1), 10000);

        mockMvc.perform(get(URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("Se calcula con el último mantenimiento de cada tipo de servicio")
    void usaElUltimoMantenimientoDeCadaTipo() throws Exception {
        Vehiculo vehiculo = crearVehiculo("STU901", TipoVehiculo.CAMIONETA, 25000);
        // Aceite: el viejo estaría vencido, pero el último está al día
        crearMantenimiento(vehiculo, aceite, taller, HOY.minusMonths(10), 5000);
        crearMantenimiento(vehiculo, aceite, taller, HOY.minusMonths(1), 20000);
        // Frenos: el último está vencido
        crearMantenimiento(vehiculo, frenos, taller, HOY.minusMonths(13), 2000);

        mockMvc.perform(get(URL))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].placa").value("STU901"))
                .andExpect(jsonPath("$[0].tipoServicioId").value(frenos.getId().intValue()));
    }

    @Test
    @DisplayName("Un vehículo con dos servicios vencidos genera una alerta por cada uno")
    void unaAlertaPorCadaServicioVencido() throws Exception {
        Vehiculo vehiculo = crearVehiculo("STU901", TipoVehiculo.CAMIONETA, 25000);
        crearMantenimiento(vehiculo, aceite, taller, HOY.minusMonths(1), 10000);
        crearMantenimiento(vehiculo, frenos, taller, HOY.minusMonths(1), 2000);

        mockMvc.perform(get(URL))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].placa").value("STU901"))
                .andExpect(jsonPath("$[1].placa").value("STU901"));
    }

    @Test
    @DisplayName("Los vehículos inactivos no generan alertas")
    void inactivoNoGeneraAlerta() throws Exception {
        Vehiculo inactivo = crearVehiculoInactivo("PQR678", 25000);
        crearMantenimiento(inactivo, aceite, taller, HOY.minusMonths(8), 10000);

        mockMvc.perform(get(URL))
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("Los mantenimientos anulados no cuentan para el cálculo")
    void mantenimientoAnuladoSeIgnora() throws Exception {
        Vehiculo vehiculo = crearVehiculo("DEF456", TipoVehiculo.CAMION, 25000);
        crearMantenimiento(vehiculo, aceite, taller, HOY.minusMonths(1), 10000);
        // Un mantenimiento más reciente que lo dejaría al día, pero está anulado
        Mantenimiento anulado = new Mantenimiento(vehiculo, aceite, taller, HOY.minusDays(1), 24000,
                new BigDecimal("100000.00"));
        anulado.setAnulado(true);
        mantenimientoRepository.save(anulado);

        mockMvc.perform(get(URL))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].kilometrajeUltimoServicio").value(10000))
                .andExpect(jsonPath("$[0].vencidoPorKilometraje").value(true));
    }

    @Test
    @DisplayName("Un vehículo sin mantenimientos no genera alertas")
    void sinMantenimientosNoGeneraAlerta() throws Exception {
        crearVehiculo("MNO34E", TipoVehiculo.MOTOCICLETA, 90000);

        mockMvc.perform(get(URL))
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("Ordena por criticidad: ambos criterios, más días de atraso, más km excedidos")
    void ordenPorCriticidad() throws Exception {
        // 1 criterio, solo kilometraje, 2.000 km excedidos
        Vehiculo kmPoco = crearVehiculo("KMP004", TipoVehiculo.AUTOMOVIL, 22000);
        crearMantenimiento(kmPoco, aceite, taller, HOY.minusMonths(1), 10000);
        // 1 criterio, solo kilometraje, 20.000 km excedidos
        Vehiculo kmMucho = crearVehiculo("KMM003", TipoVehiculo.AUTOMOVIL, 40000);
        crearMantenimiento(kmMucho, aceite, taller, HOY.minusMonths(1), 10000);
        // 1 criterio, solo tiempo, unos 6 meses de atraso
        Vehiculo tiempo = crearVehiculo("TIE002", TipoVehiculo.AUTOMOVIL, 10500);
        crearMantenimiento(tiempo, aceite, taller, HOY.minusMonths(12), 10000);
        // 2 criterios: kilometraje y tiempo
        Vehiculo ambos = crearVehiculo("AMB001", TipoVehiculo.AUTOMOVIL, 25000);
        crearMantenimiento(ambos, aceite, taller, HOY.minusMonths(7), 10000);

        mockMvc.perform(get(URL))
                .andExpect(jsonPath("$", hasSize(4)))
                .andExpect(jsonPath("$[0].placa").value("AMB001"))
                .andExpect(jsonPath("$[1].placa").value("TIE002"))
                .andExpect(jsonPath("$[2].placa").value("KMM003"))
                .andExpect(jsonPath("$[3].placa").value("KMP004"));
    }

    @Test
    @DisplayName("Filtra las alertas por tipo de vehículo")
    void filtrarPorTipo() throws Exception {
        Vehiculo camion = crearVehiculo("DEF456", TipoVehiculo.CAMION, 25000);
        Vehiculo auto = crearVehiculo("ABC123", TipoVehiculo.AUTOMOVIL, 25000);
        crearMantenimiento(camion, aceite, taller, HOY.minusMonths(1), 10000);
        crearMantenimiento(auto, aceite, taller, HOY.minusMonths(1), 10000);

        mockMvc.perform(get(URL).param("tipo", "CAMION"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].placa").value("DEF456"))
                .andExpect(jsonPath("$[0].tipoVehiculo").value("CAMION"));
    }

    @Test
    @DisplayName("Tipo de vehículo que no existe en el filtro: 400")
    void filtrarConTipoInexistente() throws Exception {
        mockMvc.perform(get(URL).param("tipo", "AVION"))
                .andExpect(status().isBadRequest());
    }
}
