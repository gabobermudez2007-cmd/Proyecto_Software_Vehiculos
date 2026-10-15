package flota_backend.config;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

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
 * Carga datos de prueba al iniciar la aplicación, solo si la base de datos está
 * vacía. Se activa con la propiedad {@code app.cargar-datos-prueba=true}.
 * Las fechas se calculan respecto a hoy, de modo que siempre haya vehículos
 * vencidos para mostrar en las alertas.
 */
@Component
@ConditionalOnProperty(name = "app.cargar-datos-prueba", havingValue = "true")
public class DatosIniciales implements CommandLineRunner {

    private final VehiculoRepository vehiculoRepository;
    private final TipoServicioRepository tipoServicioRepository;
    private final TallerRepository tallerRepository;
    private final MantenimientoRepository mantenimientoRepository;

    public DatosIniciales(VehiculoRepository vehiculoRepository,
            TipoServicioRepository tipoServicioRepository,
            TallerRepository tallerRepository,
            MantenimientoRepository mantenimientoRepository) {
        this.vehiculoRepository = vehiculoRepository;
        this.tipoServicioRepository = tipoServicioRepository;
        this.tallerRepository = tallerRepository;
        this.mantenimientoRepository = mantenimientoRepository;
    }

    @Override
    public void run(String... args) {
        if (vehiculoRepository.count() > 0) {
            return;
        }

        TipoServicio aceite = tipoServicioRepository.save(new TipoServicio("Cambio de aceite", 10000, 6));
        TipoServicio frenos = tipoServicioRepository.save(new TipoServicio("Revisión de frenos", 20000, 12));
        TipoServicio llantas = tipoServicioRepository.save(new TipoServicio("Rotación de llantas", 10000, 6));

        Taller central = tallerRepository.save(new Taller("Taller Central", "6011234567"));
        Taller norte = tallerRepository.save(new Taller("AutoServicio Norte", "6017654321"));

        // Al día
        Vehiculo corolla = vehiculoRepository.save(
                new Vehiculo("ABC123", TipoVehiculo.AUTOMOVIL, "Toyota", "Corolla", 58500));
        registrar(corolla, aceite, central, 2, 50000, "180000.00");
        registrar(corolla, frenos, central, 5, 40000, "350000.00");

        // Vencido por kilometraje
        Vehiculo dmax = vehiculoRepository.save(
                new Vehiculo("DEF456", TipoVehiculo.CAMIONETA, "Chevrolet", "D-Max", 84000));
        registrar(dmax, aceite, norte, 4, 70000, "220000.00");

        // Vencido por tiempo
        Vehiculo hino = vehiculoRepository.save(
                new Vehiculo("GHI789", TipoVehiculo.CAMION, "Hino", "500", 120300));
        registrar(hino, aceite, norte, 8, 119000, "450000.00");

        // Vencido por kilometraje y por tiempo
        Vehiculo bus = vehiculoRepository.save(
                new Vehiculo("JKL012", TipoVehiculo.BUS, "Mercedes-Benz", "O500", 210000));
        registrar(bus, llantas, central, 9, 190000, "1800000.00");

        // Sin mantenimientos registrados
        vehiculoRepository.save(
                new Vehiculo("MNO34E", TipoVehiculo.MOTOCICLETA, "Yamaha", "FZ150", 15200));

        // Dado de baja (inactivo) pero con historial
        Vehiculo logan = new Vehiculo("PQR678", TipoVehiculo.AUTOMOVIL, "Renault", "Logan", 33000);
        logan.setEstado(EstadoVehiculo.INACTIVO);
        logan = vehiculoRepository.save(logan);
        registrar(logan, aceite, central, 3, 31000, "160000.00");

        // Al día en aceite, vencido en frenos
        Vehiculo ranger = vehiculoRepository.save(
                new Vehiculo("STU901", TipoVehiculo.CAMIONETA, "Ford", "Ranger", 47800));
        registrar(ranger, aceite, norte, 1, 47000, "210000.00");
        registrar(ranger, frenos, norte, 14, 20000, "380000.00");
    }

    private void registrar(Vehiculo vehiculo, TipoServicio tipo, Taller taller,
            int mesesAtras, int kilometraje, String costo) {
        mantenimientoRepository.save(new Mantenimiento(vehiculo, tipo, taller,
                LocalDate.now().minusMonths(mesesAtras), kilometraje, new BigDecimal(costo)));
    }
}
