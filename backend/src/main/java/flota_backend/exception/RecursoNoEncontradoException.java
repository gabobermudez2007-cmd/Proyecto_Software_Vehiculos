package flota_backend.exception;

/**
 * Se lanza cuando se consulta o modifica un recurso que no existe.
 */
public class RecursoNoEncontradoException extends RuntimeException {

    public RecursoNoEncontradoException(String mensaje) {
        super(mensaje);
    }
}
