package br.gov.df.seagri.modulo_pessoa.dominio;

import org.hibernate.envers.Audited;
import org.locationtech.jts.geom.MultiPolygon;
import org.locationtech.jts.geom.Point;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrimaryKeyJoinColumn;
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
@Table(name = "contato_endereco", schema = "pessoa")
@PrimaryKeyJoinColumn(name = "id")
@Audited
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PUBLIC)
@AllArgsConstructor(access = AccessLevel.PUBLIC)
@ToString(callSuper = true, onlyExplicitlyIncluded = true)
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
public class ContatoEndereco extends Contato {

    @Column(name = "cep", length = 10)
    private String cep;

    @Column(name = "logradouro")
    private String logradouro;

    @Column(name = "numero")
    private String numero;

    @Column(name = "complemento")
    private String complemento;

    @Column(name = "bairro")
    private String bairro;

    @Column(name = "referencia")
    private String referencia;

    // =========================
    // LOCAL (FK)
    // =========================
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_local")
    private Local local;

    // =========================
    // GEOMETRIA (PostGIS)
    // =========================

    @Column(name = "localizacao", columnDefinition = "public.geometry(Point, 4326)")
    private Point localizacao;

    @Column(name = "area", columnDefinition = "public.geometry(MultiPolygon, 4326)")
    private MultiPolygon area;

    // =========================
    // HASH (BYTEA)
    // =========================
    @Column(name = "hash_endereco")
    private byte[] hashEndereco;
}
