package br.gov.df.seagri.modulo_pessoa.dominio;

import org.hibernate.envers.Audited;

import br.gov.df.seagri.dominio_central.dominio.EntidadeBaseLong;
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
@Table(name = "pessoa_grupo_hierarquia", schema = "pessoa")
@Audited
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PUBLIC)
@AllArgsConstructor(access = AccessLevel.PUBLIC)
@ToString(callSuper = true, onlyExplicitlyIncluded = true)
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
public class PessoaGrupoHierarquia extends EntidadeBaseLong {

    // =========================
    // GRUPO PAI
    // =========================
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_grupo_pai", nullable = false)
    private PessoaGrupo grupoPai;

    // =========================
    // GRUPO FILHO
    // =========================
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_grupo_filho", nullable = false)
    private PessoaGrupo grupoFilho;

    // =========================
    // NOMES DA RELAÇÃO
    // =========================
    @Column(name = "nome_pai_para_filho")
    private String nomePaiParaFilho;

    /*
     * Ex:
     * "gerencia"
     * "coordena"
     */

    @Column(name = "nome_filho_para_pai")
    private String nomeFilhoParaPai;

    /*
     * Ex:
     * "é gerido por"
     * "subordinado a"
     */
}
