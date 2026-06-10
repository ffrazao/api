package br.gov.df.seagri.modulo_organizacao.dominio;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.envers.Audited;

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
@Table(schema = "folha_ponto", name = "relacionamento")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PUBLIC)
@AllArgsConstructor(access = AccessLevel.PUBLIC)
@ToString(callSuper = true, onlyExplicitlyIncluded = true)
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Audited
public class Relacionamento extends EntidadeBaseLongAuditoriaCompleta implements PertenceOrganizacao {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizacao_id", nullable = false, updatable = false)
    private Organizacao organizacao;

    @Column(name = "sujeito_id", nullable = false, length = 64, updatable = false)
    private String sujeitoId;

    @Column(name = "objeto_id", nullable = false, length = 64, updatable = false)
    private String objetoId;

    @Setter
    @Column(name = "tipo_relacionamento", nullable = false, length = 64)
    private String tipoRelacionamento;

    @Setter
    @Column(name = "inicio_validade")
    private OffsetDateTime inicioValidade;

    @Setter
    @Column(name = "fim_validade")
    private OffsetDateTime fimValidade;

    public Relacionamento(Organizacao organizacao, String sujeitoId, String objetoId, String tipoRelacionamento) {
        this.organizacao = organizacao;
        this.sujeitoId = sujeitoId;
        this.objetoId = objetoId;
        this.tipoRelacionamento = tipoRelacionamento;
    }

    @Override
    public UUID obterOrganizacaoId() {
        return (UUID) this.organizacao.getId();
    }

}
