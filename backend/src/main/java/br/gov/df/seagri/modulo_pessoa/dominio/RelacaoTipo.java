package br.gov.df.seagri.modulo_pessoa.dominio;

import java.util.List;

import org.hibernate.envers.Audited;

import br.gov.df.seagri.dominio_central.dominio.EntidadeBaseLong;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.OneToMany;
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
@Table(name = "relacao_tipo", schema = "pessoa", uniqueConstraints = {
        @UniqueConstraint(name = "uq_relacao_tipo_nome", columnNames = "nome")
})
@Audited
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PUBLIC)
@AllArgsConstructor(access = AccessLevel.PUBLIC)
@ToString(callSuper = true, onlyExplicitlyIncluded = true)
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
public class RelacaoTipo extends EntidadeBaseLong {

    // =========================
    // IDENTIFICAÇÃO
    // =========================
    @Column(name = "nome", nullable = false)
    private String nome;

    /*
     * Ex:
     * FAMILIAR
     * SOCIETARIA
     * CONTRATUAL
     * INSTITUCIONAL
     */

    // =========================
    // RELACIONAMENTOS
    // =========================
    @OneToMany(mappedBy = "relacaoTipo", fetch = FetchType.LAZY)
    private List<RelacaoTipoFuncao> funcoes;

}
