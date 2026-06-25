package br.gov.df.seagri.dominio_central.web.config.seguranca;

import java.util.ArrayList;
import java.util.Collection;
import java.util.UUID;

import org.springframework.core.convert.converter.Converter;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import br.gov.df.seagri.modulo_seguranca.dominio.IdentidadeAcesso;
import br.gov.df.seagri.modulo_seguranca.infraestrutura.IdentidadeAcessoDAO;

@Component
public class CustomJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final IdentidadeAcessoDAO identidadeAcessoDAO;

    public CustomJwtAuthenticationConverter(IdentidadeAcessoDAO identidadeAcessoDAO) {
        this.identidadeAcessoDAO = identidadeAcessoDAO;
    }

    @Override
    public AbstractAuthenticationToken convert(@NonNull Jwt jwt) {
        // 1. Extrai o identificador técnico imutável do Keycloak
        String sub = jwt.getClaimAsString("sub");
        UUID subUuid = UUID.fromString(sub);

        // 2. Consulta a Identidade Canônica no banco de dados local
        IdentidadeAcesso identidade = identidadeAcessoDAO.findByKeycloakSubComPessoa(subUuid).orElse(null);

        Collection<GrantedAuthority> authorities = new ArrayList<>();

        // 3. (MVP) Injeta uma autoridade base.
        // No futuro (Fase 2), faremos outra query aqui na tabela "vinculo_usuario" para
        // extrair as Roles reais (ABAC/RBAC).
        authorities.add(new SimpleGrantedAuthority("ROLE_USER"));

        if (identidade == null) {
            // Conta técnica existe, mas a Pessoa Física (CPF) ainda não foi vinculada.
            // Retorna um token cego, sem autoridades, forçando o isolamento na API.
            return new BusinessPrincipalToken(jwt, authorities, null);
        }

        // 4. Retorna o token enriquecido com o ID real da Pessoa
        return new BusinessPrincipalToken(jwt, authorities, identidade.getPessoa().getId());
    }

}
