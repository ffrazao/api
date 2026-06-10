package br.gov.df.seagri.dominio_central.dominio;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import br.gov.df.seagri.dominio_central.infraestrutura.AuditoriaListener;
import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import lombok.EqualsAndHashCode;
import lombok.experimental.SuperBuilder;

@MappedSuperclass
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@ToString(callSuper = true)
@EqualsAndHashCode(callSuper = true)
@EntityListeners(AuditoriaListener.class)
public abstract class EntidadeBaseLongAuditoriaCompleta extends EntidadeBaseLong implements AuditoriaCompleta {

    @JdbcTypeCode(SqlTypes.UUID)
    @Column(name = "criado_por", nullable = false, updatable = false)
    private UUID criadoPor;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private OffsetDateTime criadoEm;

    @JdbcTypeCode(SqlTypes.UUID)
    @Column(name = "atualizado_por", nullable = false)
    private UUID atualizadoPor;

    @Column(name = "atualizado_em", nullable = false)
    private OffsetDateTime atualizadoEm;

    @Version
    @Column(name = "versao", nullable = false)
    private Integer versao;

}
