package br.gov.df.seagri.modulo_pessoa.dominio;

import java.util.List;

import org.hibernate.envers.Audited;
import org.locationtech.jts.geom.MultiPolygon;
import org.locationtech.jts.geom.Point;

import br.gov.df.seagri.dominio_central.dominio.EntidadeBaseLong;
import br.gov.df.seagri.modulo_pessoa.enumeracao.TipoLocalEnum;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "local", schema = "pessoa")
@Audited
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PUBLIC)
@AllArgsConstructor(access = AccessLevel.PUBLIC)
@ToString(callSuper = true, onlyExplicitlyIncluded = true)
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
public class Local extends EntidadeBaseLong {

    // =========================
    // IDENTIFICAÇÃO
    // =========================
    @Column(name = "nome", nullable = false)
    private String nome;

    @Column(name = "sigla")
    private String sigla;

    // =========================
    // TIPO (ENUM DO BANCO)
    // =========================
    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", nullable = false)
    private TipoLocalEnum tipo;

    // =========================
    // HIERARQUIA
    // =========================
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_local_pai")
    private Local pai;

    @OneToMany(mappedBy = "pai")
    @OrderBy("nome ASC")
    private List<Local> filhos;

    // =========================
    // GEOMETRIA (PostGIS)
    // =========================

    // Ponto central (centroide)
    @Column(name = "centroide", columnDefinition = "public.geometry(Point, 4326)")
    private Point centroide;

    // Área geográfica
    @Column(name = "area", columnDefinition = "public.geometry(MultiPolygon, 4326)")
    private MultiPolygon area;

}
