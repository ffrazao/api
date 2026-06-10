package br.gov.df.seagri.modulo_pessoa.dominio;

import java.time.OffsetDateTime;

import org.hibernate.envers.Audited;

import br.gov.df.seagri.dominio_central.dominio.EntidadeBaseLong;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
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
@Table(name = "pessoa_relacionamento", schema = "pessoa", uniqueConstraints = {
        @UniqueConstraint(name = "uq_relacao_pessoa_funcao", columnNames = { "id_relacao", "id_pessoa",
                "id_relacao_tipo_funcao" })
})
@Audited
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PUBLIC)
@AllArgsConstructor(access = AccessLevel.PUBLIC)
@ToString(callSuper = true, onlyExplicitlyIncluded = true)
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
public class PessoaRelacionamento extends EntidadeBaseLong {

    // =========================
    // RELAÇÃO
    // =========================
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_relacao", nullable = false)
    private Relacao relacao;

    // =========================
    // PESSOA
    // =========================
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_pessoa", nullable = false)
    private Pessoa pessoa;

    // =========================
    // FUNÇÃO NA RELAÇÃO
    // =========================
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_relacao_tipo_funcao", nullable = false)
    private RelacaoTipoFuncao relacaoTipoFuncao;

    // =========================
    // TEMPORALIDADE
    // =========================
    @Column(name = "data_inicio")
    private OffsetDateTime dataInicio;

    @Column(name = "data_termino")
    private OffsetDateTime dataTermino;

    // =========================
    // OBSERVAÇÃO
    // =========================
    @Column(name = "observacao")
    private String observacao;

    @PrePersist
    @PreUpdate
    private void validarCoerencia() {
        if (relacaoTipoFuncao.getSexo() != null &&
                pessoa instanceof PessoaFisica pf &&
                pf.getSexo() != relacaoTipoFuncao.getSexo()) {

            throw new IllegalStateException("Sexo incompatível com função");
        }
    }

}
