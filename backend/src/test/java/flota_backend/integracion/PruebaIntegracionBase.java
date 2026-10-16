package flota_backend.integracion;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import flota_backend.TestcontainersConfiguration;
import flota_backend.model.EstadoVehiculo;
import flota_backend.model.Mantenimiento;
import flota_backend.model.Taller;
import flota_backend.model.TipoServicio;
import flota_backend.model.TipoVehiculo;
import flota_backend.model.Vehiculo;
import flota_backend.repository.MantenimientoRepository;
import flota_backend.repository.TallerRepository;
import flota_backend.repository.TipoServicioRepository;
import flota_backend.repository.VehiculoRepository;

/**
 * Base de todas las pruebas de integración.
 * <p>
 * Levanta la aplicación completa ({@link SpringBootTest}) conectada a un MySQL real que
 * Testcontainers crea en Docker ({@link TestcontainersConfiguration}), y ofrece
 * {@link MockMvc} para hacer peticiones HTTP a la API sin abrir el puerto 8080.
 * <p>
 * Los datos de prueba automáticos ({@code DatosIniciales}) se desactivan: antes de cada
 * prueba se vacían las tablas y cada prueba crea exactamente los datos que necesita.
 * Como todas las clases hijas comparten esta configuración, Spring reutiliza el mismo
 * contexto y el mismo contenedor para todas, lo que hace la corrida más rápida.
 */
@SpringBootTest(properties = "app.cargar-datos-prueba=false")
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
abstract class PruebaIntegracionBase {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected VehiculoRepository vehiculoRepository;

    @Autowired
    protected MantenimientoRepository mantenimientoRepository;

    @Autowired
    protected TipoServicioRepository tipoServicioRepository;

    @Autowired
    protected TallerRepository tallerRepository;

    protected static final LocalDate HOY = LocalDate.now();

    /** Deja la base vacía antes de cada prueba (primero los mantenimientos, por las llaves foráneas). */
    @BeforeEach
    void limpiarBaseDeDatos() {
        mantenimientoRepository.deleteAllInBatch();
        vehiculoRepository.deleteAllInBatch();
        tipoServicioRepository.deleteAllInBatch();
        tallerRepository.deleteAllInBatch();
    }

    // ---------- Ayudas para preparar datos directamente en MySQL ----------

    protected Vehiculo crearVehiculo(String placa, TipoVehiculo tipo, int kilometrajeActual) {
        return vehiculoRepository.save(new Vehiculo(placa, tipo, "Marca", "Modelo", kilometrajeActual));
    }

    protected Vehiculo crearVehiculoInactivo(String placa, int kilometrajeActual) {
        Vehiculo vehiculo = new Vehiculo(placa, TipoVehiculo.AUTOMOVIL, "Marca", "Modelo", kilometrajeActual);
        vehiculo.setEstado(EstadoVehiculo.INACTIVO);
        return vehiculoRepository.save(vehiculo);
    }

    /** Cambio de aceite: cada 10.000 km o 6 meses (igual que en DatosIniciales). */
    protected TipoServicio crearCambioDeAceite() {
        return tipoServicioRepository.save(new TipoServicio("Cambio de aceite", 10000, 6));
    }

    /** Revisión de frenos: cada 20.000 km o 12 meses (igual que en DatosIniciales). */
    protected TipoServicio crearRevisionDeFrenos() {
        return tipoServicioRepository.save(new TipoServicio("Revisión de frenos", 20000, 12));
    }

    protected Taller crearTaller() {
        return tallerRepository.save(new Taller("Taller Central", "6011234567"));
    }

    protected Mantenimiento crearMantenimiento(Vehiculo vehiculo, TipoServicio tipo, Taller taller,
            LocalDate fecha, int kilometraje) {
        return mantenimientoRepository.save(
                new Mantenimiento(vehiculo, tipo, taller, fecha, kilometraje, new BigDecimal("150000.00")));
    }
}
