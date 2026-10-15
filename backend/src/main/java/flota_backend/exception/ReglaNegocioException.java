package flota_backend.exception;

/**
 * Se lanza cuando una operación incumple una regla de negocio
 * (por ejemplo, un kilometraje menor al ya registrado).
 */
public class ReglaNegocioException extends RuntimeException {

    public ReglaNegocioException(String mensaje) {
        super(mensaje);
    }
}
