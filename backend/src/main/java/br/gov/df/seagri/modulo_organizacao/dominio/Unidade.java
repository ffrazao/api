package br.gov.df.seagri.modulo_organizacao.dominio;

import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.envers.Audited;
import org.hibernate.type.SqlTypes;

import br.gov.df.seagri.dominio_central.dominio.EntidadeBaseLongAuditoriaCompleta;
import br.gov.df.seagri.dominio_central.dominio.PertenceOrganizacao;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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
@Table(schema = "folha_ponto", name = "unidade")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PUBLIC)
@AllArgsConstructor(access = AccessLevel.PUBLIC)
@ToString(callSuper = true, onlyExplicitlyIncluded = true)
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Audited
public class Unidade extends EntidadeBaseLongAuditoriaCompleta implements PertenceOrganizacao {

    @Setter
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizacao_id", nullable = false, updatable = false)
    private Organizacao organizacao;

    @Setter
    @Column(name = "nome", nullable = false, length = 255)
    private String nome;

    @Setter
    @Column(name = "tipo_geometria", nullable = false, length = 16)
    private String tipoGeometria;

    @Setter
    @Column(name = "centro_geo_lat")
    private Double centroGeoLat;

    @Setter
    @Column(name = "centro_geo_lng")
    private Double centroGeoLng;

    @Setter
    @Column(name = "raio_geo_metros")
    private Integer raioGeoMetros;

    @JdbcTypeCode(SqlTypes.JSON)
    @Setter
    @Column(name = "poligono_geo", columnDefinition = "jsonb")
    private String poligonoGeo;

    public Unidade(Organizacao organizacao, String nome, String tipoGeometria) {
        this.organizacao = organizacao;
        this.nome = nome;
        this.tipoGeometria = tipoGeometria;
    }

    @Override
    public UUID obterOrganizacaoId() {
        return (UUID) this.organizacao.getId();
    }

}
