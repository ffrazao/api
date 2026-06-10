package br.gov.df.seagri.modulo_presenca.dominio;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import br.gov.df.seagri.dominio_central.dominio.EntidadeBaseLongRastreavelCriacao;
import br.gov.df.seagri.dominio_central.dominio.PertenceOrganizacao;
import br.gov.df.seagri.modulo_organizacao.dominio.Organizacao;
import br.gov.df.seagri.modulo_organizacao.dominio.Unidade;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(schema = "folha_ponto", name = "registro_presenca")
@Immutable
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PUBLIC)
@AllArgsConstructor(access = AccessLevel.PUBLIC)
@ToString(callSuper = true, onlyExplicitlyIncluded = true)
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
public class RegistroPresenca extends EntidadeBaseLongRastreavelCriacao implements PertenceOrganizacao {

    @ManyToOne
    @JoinColumn(name = "organizacao_id", nullable = false, updatable = false)
    private Organizacao organizacao;

    @ManyToOne
    @JoinColumn(name = "unidade_id", nullable = false, updatable = false)
    private Unidade unidade;

    @JdbcTypeCode(SqlTypes.UUID)
    @Column(name = "keycloak_sub", nullable = false, length = 64, updatable = false)
    private UUID keycloakSub;

    @Column(name = "latitude", nullable = false, updatable = false)
    private Double latitude;

    @Column(name = "longitude", nullable = false, updatable = false)
    private Double longitude;

    @Column(name = "precisao_gps", nullable = false, updatable = false)
    private Double precisaoGps;

    @Column(name = "referencia_biometrica", updatable = false)
    private UUID referenciaBiometrica;

    @Column(name = "pontuacao_biometrica", updatable = false)
    private Double pontuacaoBiometrica;

    @Column(name = "biometria_valida", updatable = false)
    private Boolean biometriaValida;

    @Column(name = "dispositivo_id", nullable = false, length = 128, updatable = false)
    private String dispositivoId;

    @Column(name = "modo_registro", nullable = false, length = 16, updatable = false)
    private String modoRegistro;

    @JdbcTypeCode(SqlTypes.UUID)
    @Column(name = "keycloak_sub_intermediario", nullable = false, length = 64, updatable = false)
    private UUID keycloakSubIntermediario;

    // Ajustado para pontuacao_risco
    @Column(name = "pontuacao_risco", updatable = false)
    private Double pontuacaoRisco;

    // Ajustado para indicadores_risco
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "indicadores_risco", columnDefinition = "jsonb", updatable = false)
    private String indicadoresRisco;

    // O statusTécnico continua sem setter, pois é SEMPRE "RECEBIDO" (Imutável)
    @Column(name = "status_tecnico", nullable = false, length = 32, updatable = false)
    private String statusTecnico;

    @Column(name = "status_administrativo", nullable = false, length = 32, updatable = false)
    private String statusAdministrativo;

    @Column(name = "capturado_em", nullable = false, updatable = false)
    private OffsetDateTime capturadoEm;

    @Column(name = "recebido_no_servidor_em", nullable = false, updatable = false)
    private OffsetDateTime recebidoNoServidorEm;

    public RegistroPresenca(Organizacao organizacao, Unidade unidade, UUID keycloakSub,
            Double latitude, Double longitude, Double precisaoGps,
            String dispositivoId, String modoRegistro, OffsetDateTime capturadoEm) {
        this.organizacao = organizacao;
        this.unidade = unidade;
        this.keycloakSub = keycloakSub;
        this.latitude = latitude;
        this.longitude = longitude;
        this.precisaoGps = precisaoGps;
        this.dispositivoId = dispositivoId;
        this.modoRegistro = modoRegistro;
        this.capturadoEm = capturadoEm;
        this.recebidoNoServidorEm = OffsetDateTime.now(ZoneOffset.UTC);

        this.statusTecnico = "RECEBIDO";
        this.statusAdministrativo = "PENDENTE";
    }

    @Override
    public UUID obterOrganizacaoId() {
        return (UUID) this.organizacao.getId();
    }

    // Método que garante a imutabilidade ao vincular a foto do disco ao banco de
    // dados
    public void registrarEvidenciaBiometrica(java.util.UUID referencia, Double pontuacao, Boolean valida) {
        this.referenciaBiometrica = referencia;
        this.pontuacaoBiometrica = pontuacao;
        this.biometriaValida = valida;
    }

}
