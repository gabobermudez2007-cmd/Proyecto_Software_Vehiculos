package flota_backend.exception;

/** Filtros del reporte que no tienen sentido (por ejemplo, la fecha inicial después de la final). */
public class FiltroInvalidoException extends RuntimeException {

    public FiltroInvalidoException(String mensaje) {
        super(mensaje);
    }
}
