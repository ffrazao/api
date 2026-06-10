package br.gov.df.seagri.modulo_seguranca.dominio;

import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import br.gov.df.seagri.dominio_central.dominio.EntidadeBaseLongAuditoriaCompleta;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "perfil_biometrico", schema = "seguranca")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PUBLIC)
@AllArgsConstructor(access = AccessLevel.PUBLIC)
@ToString(callSuper = true, onlyExplicitlyIncluded = true)
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
public class PerfilBiometrico extends EntidadeBaseLongAuditoriaCompleta {

    @JdbcTypeCode(SqlTypes.UUID)
    @Column(name = "keycloak_sub", nullable = false)
    private UUID keycloakSub;

    // bytea no PostgreSQL é mapeado como byte[] no Java
    @Column(name = "modelo_biometrico", nullable = false)
    private byte[] modeloBiometrico;

    @Column(name = "versao_modelo", nullable = false)
    private String versaoModelo;

}
