package flota_backend.model;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "mantenimiento")
public class Mantenimiento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vehiculo_id", nullable = false)
    private Vehiculo vehiculo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tipo_servicio_id", nullable = false)
    private TipoServicio tipoServicio;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "taller_id", nullable = false)
    private Taller taller;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(nullable = false)
    private Integer kilometraje;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal costo;

    @Column(nullable = false)
    private boolean anulado = false;

    public Mantenimiento() {
    }

    public Mantenimiento(Vehiculo vehiculo, TipoServicio tipoServicio, Taller taller,
            LocalDate fecha, Integer kilometraje, BigDecimal costo) {
        this.vehiculo = vehiculo;
        this.tipoServicio = tipoServicio;
        this.taller = taller;
        this.fecha = fecha;
        this.kilometraje = kilometraje;
        this.costo = costo;
    }

    public Long getId() { return id; }
    public Vehiculo getVehiculo() { return vehiculo; }
    public void setVehiculo(Vehiculo vehiculo) { this.vehiculo = vehiculo; }
    public TipoServicio getTipoServicio() { return tipoServicio; }
    public void setTipoServicio(TipoServicio tipoServicio) { this.tipoServicio = tipoServicio; }
    public Taller getTaller() { return taller; }
    public void setTaller(Taller taller) { this.taller = taller; }
    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }
    public Integer getKilometraje() { return kilometraje; }
    public void setKilometraje(Integer kilometraje) { this.kilometraje = kilometraje; }
    public BigDecimal getCosto() { return costo; }
    public void setCosto(BigDecimal costo) { this.costo = costo; }
    public boolean isAnulado() { return anulado; }
    public void setAnulado(boolean anulado) { this.anulado = anulado; }
}
