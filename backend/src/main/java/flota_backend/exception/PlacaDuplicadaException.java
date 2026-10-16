package flota_backend.exception;

public class PlacaDuplicadaException extends RuntimeException {

    public PlacaDuplicadaException(String placa) {
        super("Ya existe un vehículo registrado con la placa " + placa);
    }
}
