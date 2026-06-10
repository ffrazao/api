package br.gov.df.seagri.modulo_pessoa.dominio;

import org.hibernate.envers.Audited;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrimaryKeyJoinColumn;
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
@Table(name = "pessoa_grupo", schema = "pessoa")
@PrimaryKeyJoinColumn(name = "id")
@Audited
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PUBLIC)
@AllArgsConstructor(access = AccessLevel.PUBLIC)
@ToString(callSuper = true, onlyExplicitlyIncluded = true)
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
public class PessoaGrupo extends Pessoa {

    // =========================
    // IDENTIFICAÇÃO COMPLEMENTAR
    // =========================
    @Column(name = "nome_resumido_sigla")
    private String nomeResumidoSigla;

    @Column(name = "descricao")
    private String descricao;

    // dataCriacao é o mesmo que pessoa.dataInicio
    // dataEncerramento é o mesmo que pessoa.dataTermino

    /*
     * Convenção:
     * - Pessoa.nome → nome principal
     * - nomeResumidoSigla → abreviação / sigla
     */

    // =========================
    // HIERARQUIA ENTRE GRUPOS
    // =========================
    // @ManyToOne(fetch = FetchType.LAZY)
    // @JoinColumn(name = "id_grupo_pai")
    // private PessoaGrupo grupoPai;

    // @OneToMany(mappedBy = "grupoPai")
    // private List<PessoaGrupo> subgrupos;

    // @Column(name = "nome_relacao_pai_para_filho")
    // private String nomeRelacaoPaiParaFilho;

    // @Column(name = "nome_relacao_filho_para_pai")
    // private String nomeRelacaoFilhoParaPai;

    /*
     * Exemplo:
     * - pai → filho: "gerencia"
     * - filho → pai: "é gerido por"
     */

    // =========================
    // MEMBROS DO GRUPO
    // =========================
    // @OneToMany(mappedBy = "grupo")
    // private List<PessoaGrupoMembro> membros;
}
