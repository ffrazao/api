package br.gov.df.seagri.dominio_central.web.config;

import br.gov.df.seagri.modulo_organizacao.infraestrutura.VinculoUsuarioDAO;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

import java.util.Map;
import java.util.UUID;

/**
 * Policy Decision Point (PDP) que implementa a regra de isolamento da RFC-0002
 * e RFC-0006.
 * Nenhuma requisição a um endpoint /orgs/{organizacaoId} prossegue se o usuário
 * não for membro.
 */
@Component
public class AutorizacaoTenantInterceptor implements HandlerInterceptor {

    private final VinculoUsuarioDAO vinculoUsuarioDAO;

    public AutorizacaoTenantInterceptor(VinculoUsuarioDAO vinculoUsuarioDAO) {
        this.vinculoUsuarioDAO = vinculoUsuarioDAO;
    }

    @Override
    @SuppressWarnings("unchecked")
    public boolean preHandle(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
            @NonNull Object handler) {

        // Adicione isto no topo:
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        // 1. Extrai as variáveis da URL (ex: /api/v1/orgs/{organizacaoId}/...)
        Map<String, String> pathVariables = (Map<String, String>) request
                .getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);

        if (pathVariables != null && pathVariables.containsKey("organizacaoId")) {
            UUID organizacaoId = UUID.fromString(pathVariables.get("organizacaoId"));

            // 2. Extrai o ID do usuário autenticado no token (Keycloak 'sub')
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
                UUID keycloakSub = UUID.fromString(jwt.getSubject());

                // 3. O coração do nosso PDP: Valida se o vínculo existe!
                boolean possuiAcesso = vinculoUsuarioDAO.findByKeycloakSubAndOrganizacaoId(keycloakSub, organizacaoId)
                        .isPresent();

                if (!possuiAcesso) {
                    throw new AccessDeniedException(
                            "Acesso negado: O usuário não possui vínculo com esta organização.");
                }
            }
        }

        // Se tem acesso, ou se a rota não exige organização (ex: criação de nova Org),
        // deixa passar.
        return true;
    }
}
