package br.gov.df.seagri.modulo_pessoa.dominio;

import org.hibernate.envers.Audited;

import br.gov.df.seagri.dominio_central.dominio.EntidadeBaseLong;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "profissao", schema = "pessoa", uniqueConstraints = {
        @UniqueConstraint(name = "uq_profissao_nome", columnNames = "nome")
})
@Audited
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PUBLIC)
@AllArgsConstructor(access = AccessLevel.PUBLIC)
@ToString(callSuper = true, onlyExplicitlyIncluded = true)
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
public class Profissao extends EntidadeBaseLong {

    // =========================
    // NOME
    // =========================
    @Column(name = "nome", nullable = false)
    private String nome;

    /*
     * Ex:
     * Engenheiro Agrônomo
     * Produtor Rural
     * Técnico
     */

    // =========================
    // DESCRIÇÃO
    // =========================
    @Column(name = "descricao")
    private String descricao;
}
