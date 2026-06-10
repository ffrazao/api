package br.gov.df.seagri.modulo_organizacao.dominio;

import java.time.OffsetDateTime;

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
@Table(schema = "folha_ponto", name = "convite")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PUBLIC)
@AllArgsConstructor(access = AccessLevel.PUBLIC)
@ToString(callSuper = true, onlyExplicitlyIncluded = true)
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
public class Convite extends EntidadeBaseLong {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizacao_id", nullable = false, updatable = false)
    private Organizacao organizacao;

    // NOVO: Mapeamento da Unidade (RFC-0010)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unidade_id")
    private Unidade unidade;

    @Column(name = "codigo", nullable = false, length = 32, unique = true)
    private String codigo;

    // NOVO: Papel esperado ao aceitar o convite (RFC-0010)
    @Column(name = "papel_esperado", nullable = false, length = 32)
    private String papelEsperado;

    @Column(name = "data_expiracao", nullable = false)
    private OffsetDateTime dataExpiracao;

    @Setter
    @Column(name = "usado", nullable = false)
    private Boolean usado;

    // Construtor atualizado
    public Convite(Organizacao organizacao, Unidade unidade, String codigo, String papelEsperado,
            OffsetDateTime dataExpiracao) {
        this.organizacao = organizacao;
        this.unidade = unidade;
        this.codigo = codigo;
        this.papelEsperado = papelEsperado;
        this.dataExpiracao = dataExpiracao;
        this.usado = false;
    }

    public boolean isValido() {
        return !this.usado && this.dataExpiracao.isAfter(OffsetDateTime.now());
    }

}
