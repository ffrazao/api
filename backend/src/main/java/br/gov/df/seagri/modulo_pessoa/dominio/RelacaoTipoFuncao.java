package br.gov.df.seagri.modulo_pessoa.dominio;

import org.hibernate.envers.Audited;

import br.gov.df.seagri.dominio_central.dominio.EntidadeBaseLong;
import br.gov.df.seagri.modulo_pessoa.enumeracao.SexoEnum;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "relacao_tipo_funcao", schema = "pessoa", uniqueConstraints = {
        @UniqueConstraint(name = "uq_relacao_tipo_funcao_nome", columnNames = { "id_relacao_tipo", "nome" })
})
@Audited
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PUBLIC)
@AllArgsConstructor(access = AccessLevel.PUBLIC)
@ToString(callSuper = true, onlyExplicitlyIncluded = true)
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
public class RelacaoTipoFuncao extends EntidadeBaseLong {

    // =========================
    // RELAÇÃO COM TIPO
    // =========================
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_relacao_tipo", nullable = false)
    private RelacaoTipo relacaoTipo;

    // =========================
    // NOME DA FUNÇÃO
    // =========================
    @Column(name = "nome", nullable = false)
    private String nome;

    /*
     * Ex:
     * pai, mãe, filho, tio
     * sócio, administrador
     */

    // =========================
    // RESTRIÇÃO DE SEXO
    // =========================
    @Enumerated(EnumType.STRING)
    @Column(name = "sexo")
    private SexoEnum sexo;

    /*
     * Quando NULL → qualquer sexo
     * Quando preenchido → validação obrigatória
     */
}
