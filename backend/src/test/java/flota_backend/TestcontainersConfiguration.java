package flota_backend;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.mysql.MySQLContainer;

/**
 * Base de datos para las pruebas de integración.
 * <p>
 * Al iniciar las pruebas, Testcontainers levanta en Docker un MySQL 8.4 nuevo y vacío
 * (la misma versión del proyecto); al terminar lo destruye. Ninguna prueba toca la base
 * de datos de desarrollo y todas corren igual en cualquier computador con Docker abierto.
 * <p>
 * {@link ServiceConnection} le entrega a Spring la URL, el usuario y la contraseña del
 * contenedor, así que no hay que configurar ningún dato de conexión.
 * <p>
 * <b>Cómo correr las pruebas</b> (con Docker Desktop abierto, desde la carpeta {@code backend}):
 * <pre>
 * Todas las pruebas:          .\mvnw.cmd test            (Windows)   ./mvnw test   (Linux/Mac)
 * Una clase de pruebas:       .\mvnw.cmd test "-Dtest=AlertaIntegrationTests"
 * Una sola prueba:            .\mvnw.cmd test "-Dtest=AlertaIntegrationTests#vencidoPorKilometraje"
 * Varias pruebas de una clase: .\mvnw.cmd test "-Dtest=AlertaIntegrationTests#vencidoPorKilometraje+vencidoPorTiempo"
 * </pre>
 * La primera vez tarda más porque Docker descarga la imagen {@code mysql:8.4}.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

    @Bean
    @ServiceConnection
    MySQLContainer mysqlContainer() {
        return new MySQLContainer("mysql:8.4");
    }
}
