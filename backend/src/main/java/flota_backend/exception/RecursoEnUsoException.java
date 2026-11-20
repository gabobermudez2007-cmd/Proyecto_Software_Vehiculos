package flota_backend.exception;

/** No se puede eliminar un registro porque otros datos (por ejemplo, mantenimientos) dependen de él. */
public class RecursoEnUsoException extends RuntimeException {

    public RecursoEnUsoException(String mensaje) {
        super(mensaje);
    }
}
