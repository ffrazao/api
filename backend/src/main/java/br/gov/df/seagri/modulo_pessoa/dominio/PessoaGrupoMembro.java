package br.gov.df.seagri.modulo_pessoa.dominio;

import java.time.LocalDate;

import org.hibernate.envers.Audited;

import br.gov.df.seagri.dominio_central.dominio.EntidadeBaseLong;
import br.gov.df.seagri.modulo_pessoa.enumeracao.PapelGrupoEnum;
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
@Table(name = "pessoa_grupo_membros", schema = "pessoa")
@Audited
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PUBLIC)
@AllArgsConstructor(access = AccessLevel.PUBLIC)
@ToString(callSuper = true, onlyExplicitlyIncluded = true)
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
public class PessoaGrupoMembro extends EntidadeBaseLong {

    // =========================
    // RELACIONAMENTOS
    // =========================
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_pessoa", nullable = false)
    private Pessoa pessoa;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_grupo", nullable = false)
    private PessoaGrupo grupo;

    // =========================
    // PAPEL NO GRUPO
    // =========================
    @Enumerated(EnumType.STRING)
    @Column(name = "papel")
    private PapelGrupoEnum papel;

    /*
     * Ex:
     * - GESTOR
     * - MEMBRO
     * - ASSOCIADO
     * - INTERESSADO
     */

    // =========================
    // DESCRIÇÃO LIVRE
    // =========================
    @Column(name = "descricao")
    private String descricao;

    @Column(name = "data_entrada")
    private LocalDate dataEntrada;

    @Column(name = "data_saida")
    private LocalDate dataSaida;

}
