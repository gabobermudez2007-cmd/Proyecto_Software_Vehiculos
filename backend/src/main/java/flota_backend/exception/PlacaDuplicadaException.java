package flota_backend.exception;

/**
 * Se lanza al intentar registrar un vehículo con una placa que ya existe.
 */
public class PlacaDuplicadaException extends RuntimeException {

    public PlacaDuplicadaException(String placa) {
        super("Ya existe un vehículo registrado con la placa " + placa);
    }
}
