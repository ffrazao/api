package br.gov.df.seagri.dominio_central.web.config.seguranca;

import java.util.Collection;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import lombok.Getter;

/**
 * Token de segurança customizado. Substitui o token técnico do Keycloak
 * por uma identidade enriquecida com o domínio canônico (Pessoa) da aplicação.
 */
@Getter
public class BusinessPrincipalToken extends JwtAuthenticationToken {

    // O identificador biológico/estrutural real no banco de dados
    private final Long pessoaId;

    public BusinessPrincipalToken(Jwt jwt, Collection<? extends GrantedAuthority> authorities, Long pessoaId) {
        super(jwt, authorities);
        this.pessoaId = pessoaId;
    }

    /**
     * Verifica se o usuário já fez o vínculo da matrícula técnica com o CPF real.
     */
    public boolean isIdentidadeResolvida() {
        return this.pessoaId != null;
    }

}
