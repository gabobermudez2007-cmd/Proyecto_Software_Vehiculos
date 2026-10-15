package flota_backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Tipo de servicio de mantenimiento (por ejemplo, cambio de aceite). Guarda cada
 * cuántos kilómetros y meses debe repetirse, y con esos parámetros se calculan
 * las alertas sin tocar el código.
 */
@Entity
@Table(name = "tipo_servicio")
public class TipoServicio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 80)
    private String nombre;

    @Column(name = "intervalo_km", nullable = false)
    private Integer intervaloKm;

    @Column(name = "intervalo_meses", nullable = false)
    private Integer intervaloMeses;

    public TipoServicio() {
    }

    public TipoServicio(String nombre, Integer intervaloKm, Integer intervaloMeses) {
        this.nombre = nombre;
        this.intervaloKm = intervaloKm;
        this.intervaloMeses = intervaloMeses;
    }

    public Long getId() { return id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public Integer getIntervaloKm() { return intervaloKm; }
    public void setIntervaloKm(Integer intervaloKm) { this.intervaloKm = intervaloKm; }
    public Integer getIntervaloMeses() { return intervaloMeses; }
    public void setIntervaloMeses(Integer intervaloMeses) { this.intervaloMeses = intervaloMeses; }
}
