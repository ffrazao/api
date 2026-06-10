package br.gov.df.seagri.modulo_seguranca.dominio;

import java.util.UUID;

import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import br.gov.df.seagri.dominio_central.dominio.EntidadeBaseLongRastreavelCriacao;
import br.gov.df.seagri.modulo_pessoa.dominio.Pessoa;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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
@Table(schema = "seguranca", name = "identidade_acesso")
@Immutable
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PUBLIC)
@AllArgsConstructor(access = AccessLevel.PUBLIC)
@ToString(callSuper = true, onlyExplicitlyIncluded = true)
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
public class IdentidadeAcesso extends EntidadeBaseLongRastreavelCriacao {

    // Relacionamento com a Identidade Canônica (Pessoa)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pessoa_id", nullable = false)
    private Pessoa pessoa;

    // A Identidade Técnica (Efêmera) que vem do Keycloak
    @JdbcTypeCode(SqlTypes.UUID)
    @Column(name = "keycloak_sub", nullable = false, unique = true, length = 64)
    private UUID keycloakSub;

    @Column(name = "provedor", nullable = false, length = 32)
    @Builder.Default
    private String provedor = "keycloak";

}
