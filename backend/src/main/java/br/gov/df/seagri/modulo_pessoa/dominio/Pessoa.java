package br.gov.df.seagri.modulo_pessoa.dominio;

import java.time.OffsetDateTime;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.envers.AuditOverride;
import org.hibernate.envers.Audited;
import org.hibernate.type.SqlTypes;

import br.gov.df.seagri.dominio_central.dominio.EntidadeBaseLongAuditoriaCompleta;
import br.gov.df.seagri.modulo_pessoa.enumeracao.StatusPessoaEnum;
import br.gov.df.seagri.modulo_pessoa.enumeracao.TipoPessoaEnum;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "pessoa", schema = "pessoa")
@Inheritance(strategy = InheritanceType.JOINED)
@Audited
@AuditOverride(forClass = EntidadeBaseLongAuditoriaCompleta.class, isAudited = true)
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PUBLIC)
@AllArgsConstructor(access = AccessLevel.PUBLIC)
@ToString(callSuper = true, onlyExplicitlyIncluded = true)
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
public class Pessoa extends EntidadeBaseLongAuditoriaCompleta {

    // =========================
    // CAMPOS PRINCIPAIS
    // =========================
    @Column(name = "nome", nullable = false)
    private String nome;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "tipo", nullable = false)
    private TipoPessoaEnum tipo;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private StatusPessoaEnum status = StatusPessoaEnum.ATIVO;

    /**
     * Esta coluna representa o inicio da pessoa, (se pessoa fisica indica
     * nascimento,
     * se pessoa juridica indica data de Inauguração, se pessoa grupo indica
     * data de criação)
     */
    @Column(name = "data_inicio")
    private OffsetDateTime dataInicio;

    /**
     * Esta coluna representa o termino da pessoa, (se pessoa fisica indica
     * falecimento,
     * se pessoa juridica indica data de fechamento, se pessoa grupo indica
     * data de encerramento)
     */
    @Column(name = "data_termino")
    private OffsetDateTime dataTermino;

    @Column(name = "observacao")
    private String observacao;

}
