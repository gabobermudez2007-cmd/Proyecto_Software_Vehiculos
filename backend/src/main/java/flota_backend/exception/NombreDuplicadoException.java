package flota_backend.exception;

/** Ya existe un taller o un tipo de servicio con ese nombre. */
public class NombreDuplicadoException extends RuntimeException {

    public NombreDuplicadoException(String mensaje) {
        super(mensaje);
    }
}
