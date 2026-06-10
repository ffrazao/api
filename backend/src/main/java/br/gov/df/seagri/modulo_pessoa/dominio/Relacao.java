package br.gov.df.seagri.modulo_pessoa.dominio;

import java.time.OffsetDateTime;
import java.util.List;

import org.hibernate.envers.Audited;

import br.gov.df.seagri.dominio_central.dominio.EntidadeBaseLong;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
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
@Table(name = "relacao", schema = "pessoa")
@Audited
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PUBLIC)
@AllArgsConstructor(access = AccessLevel.PUBLIC)
@ToString(callSuper = true, onlyExplicitlyIncluded = true)
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
public class Relacao extends EntidadeBaseLong {

    // =========================
    // TIPO DA RELAÇÃO
    // =========================
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_relacao_tipo", nullable = false)
    private RelacaoTipo relacaoTipo;

    // =========================
    // CONTEXTO OPCIONAL
    // =========================
    @Column(name = "nome")
    private String nome;

    /*
     * Ex:
     * "Família Silva"
     * "Sociedade Empresa XPTO"
     */

    @Column(name = "observacao")
    private String observacao;

    // =========================
    // TEMPORALIDADE
    // =========================
    @Column(name = "data_inicio")
    private OffsetDateTime dataInicio;

    @Column(name = "data_termino")
    private OffsetDateTime dataTermino;

    // =========================
    // PARTICIPANTES
    // =========================
    @OneToMany(mappedBy = "relacao", fetch = FetchType.LAZY)
    private List<PessoaRelacionamento> participantes;

}
