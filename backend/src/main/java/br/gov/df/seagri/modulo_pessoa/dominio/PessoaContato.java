package br.gov.df.seagri.modulo_pessoa.dominio;

import org.hibernate.envers.Audited;

import br.gov.df.seagri.dominio_central.dominio.EntidadeBaseLong;
import br.gov.df.seagri.modulo_pessoa.enumeracao.ClassificacaoContatoEnum;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "pessoa_contato", schema = "pessoa")
@Audited
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PUBLIC)
@AllArgsConstructor(access = AccessLevel.PUBLIC)
@ToString(callSuper = true, onlyExplicitlyIncluded = true)
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
public class PessoaContato extends EntidadeBaseLong {

    // =========================
    // RELACIONAMENTOS
    // =========================
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_pessoa", nullable = false)
    private Pessoa pessoa;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_contato", nullable = false)
    private Contato contato;

    // =========================
    // CLASSIFICAÇÃO
    // =========================
    @Enumerated(EnumType.STRING)
    @Column(name = "classificacao")
    private ClassificacaoContatoEnum classificacao;

    /*
     * Ex:
     * RESIDENCIAL
     * COMERCIAL
     * OUTRO
     */

    // =========================
    // PRIORIDADE
    // =========================
    @Column(name = "prioridade")
    private Integer prioridade;

    /*
     * Quanto menor o número, maior a prioridade:
     * 1 = principal
     * 2 = secundário
     * ...
     */
}
