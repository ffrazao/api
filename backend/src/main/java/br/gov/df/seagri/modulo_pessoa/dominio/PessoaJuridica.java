package br.gov.df.seagri.modulo_pessoa.dominio;

import java.math.BigDecimal;
import java.util.List;

import org.hibernate.envers.Audited;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
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
@Table(name = "pessoa_juridica", schema = "pessoa")
@PrimaryKeyJoinColumn(name = "id")
@Audited
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PUBLIC)
@AllArgsConstructor(access = AccessLevel.PUBLIC)
@ToString(callSuper = true, onlyExplicitlyIncluded = true)
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
public class PessoaJuridica extends Pessoa {

    @Column(name = "cnpj", length = 14)
    private String cnpj;

    // dataInauguracao é o mesmo que pessoa.dataInicio
    // dataFechamento é o mesmo que pessoa.dataTermino

    @Column(name = "razao_social", nullable = false)
    private String razaoSocial;

    @Column(name = "sigla")
    private String sigla;

    @Column(name = "local_sede_nome")
    private String localSedeNome;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_local_sede")
    private Local localSede;

    @Column(name = "natureza_juridica")
    private String naturezaJuridica;

    @Column(name = "regime_tributario")
    private String regimeTributario;

    @Column(name = "porte")
    private String porte;

    @Column(name = "capital_social", precision = 15, scale = 2)
    private BigDecimal capitalSocial;

    // =========================
    // NOVOS CAMPOS
    // =========================
    @Column(name = "inscricao_estadual")
    private String inscricaoEstadual;

    @Column(name = "inscricao_municipal")
    private String inscricaoMunicipal;

    // =========================
    // RELACIONAMENTO EMPRESARIAL
    // =========================
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_empresa_controladora")
    private PessoaJuridica empresaControladora;

    @OneToMany(mappedBy = "empresaControladora")
    private List<PessoaJuridica> controladas;

}
