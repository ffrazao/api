package br.gov.df.seagri.modulo_organizacao.dominio;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.envers.AuditOverride;
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
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

@Entity
@Table(schema = "folha_ponto", name = "vinculo_usuario", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "keycloak_sub", "organizacao_id" })
})
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PUBLIC)
@AllArgsConstructor(access = AccessLevel.PUBLIC)
@ToString(callSuper = true, onlyExplicitlyIncluded = true)
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Audited
@AuditOverride(forClass = EntidadeBaseLongAuditoriaCompleta.class, isAudited = true)
public class VinculoUsuario extends EntidadeBaseLongAuditoriaCompleta implements PertenceOrganizacao {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizacao_id", nullable = false, updatable = false)
    private Organizacao organizacao;

    @JdbcTypeCode(SqlTypes.UUID)
    @Column(name = "keycloak_sub", nullable = false, length = 64, updatable = false)
    private UUID keycloakSub;

    @Column(name = "papel", nullable = false, length = 32)
    private String papel;

    @Column(name = "status", nullable = false, length = 32)
    private String status;

    // NOVOS CAMPOS DE TEMPORALIDADE DA RFC-0010
    @Column(name = "data_inicio", nullable = false)
    private OffsetDateTime dataInicio;

    @Column(name = "data_fim")
    private OffsetDateTime dataFim;

    public VinculoUsuario(Organizacao organizacao, UUID keycloakSub, String papel) {
        this.organizacao = organizacao;
        this.keycloakSub = keycloakSub;
        this.papel = papel;
        this.status = "ATIVO";
        this.dataInicio = OffsetDateTime.now(ZoneOffset.UTC); // Inicializa com a data atual
    }

    @Override
    public UUID obterOrganizacaoId() {
        return (UUID) this.organizacao.getId();
    }

}
