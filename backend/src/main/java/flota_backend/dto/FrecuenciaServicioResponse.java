package flota_backend.dto;

import java.math.BigDecimal;

/**
 * Una barra (o una porción) del gráfico de los tipos de mantenimiento más frecuentes.
 * <p>
 * El frontend solo tiene que pintar: {@code tipoServicio} es la etiqueta, {@code cantidad}
 * el valor de un gráfico de barras y {@code porcentaje} el de un gráfico de torta.
 *
 * @param tipoServicioId identificador del tipo de servicio
 * @param tipoServicio   nombre del tipo de servicio (la etiqueta del gráfico)
 * @param cantidad       número de mantenimientos de ese tipo (0 si no se ha hecho ninguno)
 * @param porcentaje     participación sobre el total, de 0 a 100 con dos decimales
 */
public record FrecuenciaServicioResponse(
        Long tipoServicioId,
        String tipoServicio,
        long cantidad,
        BigDecimal porcentaje) {
}
