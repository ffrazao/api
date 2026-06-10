package br.gov.df.seagri.modulo_organizacao.dominio;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import org.hibernate.envers.AuditOverride;
import org.hibernate.envers.Audited;

import br.gov.df.seagri.dominio_central.dominio.EntidadeBaseLongAuditoriaCompleta;
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
@Table(schema = "folha_ponto", name = "alocacao_unidade")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PUBLIC)
@AllArgsConstructor(access = AccessLevel.PUBLIC)
@ToString(callSuper = true, onlyExplicitlyIncluded = true)
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Audited
@AuditOverride(forClass = EntidadeBaseLongAuditoriaCompleta.class, isAudited = true)
public class AlocacaoUnidade extends EntidadeBaseLongAuditoriaCompleta {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vinculo_usuario_id", nullable = false, updatable = false)
    private VinculoUsuario vinculoUsuario;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "unidade_id", nullable = false, updatable = false)
    private Unidade unidade;

    @Column(name = "papel_operacional", nullable = false, length = 32)
    private String papelOperacional;

    @Column(name = "status", nullable = false, length = 32)
    private String status;

    @Column(name = "data_inicio", nullable = false)
    private OffsetDateTime dataInicio;

    @Column(name = "data_fim")
    private OffsetDateTime dataFim;

    public AlocacaoUnidade(VinculoUsuario vinculoUsuario, Unidade unidade, String papelOperacional) {
        this.vinculoUsuario = vinculoUsuario;
        this.unidade = unidade;
        this.papelOperacional = papelOperacional;
        this.status = "ATIVO";
        this.dataInicio = OffsetDateTime.now(ZoneOffset.UTC);
    }

    // Método auxiliar para verificar se a alocação está vigente hoje
    public boolean isVigente() {
        if (!"ATIVO".equals(this.status))
            return false;
        OffsetDateTime agora = OffsetDateTime.now(ZoneOffset.UTC);
        if (agora.isBefore(this.dataInicio))
            return false;
        return this.dataFim == null || agora.isBefore(this.dataFim);
    }

}
