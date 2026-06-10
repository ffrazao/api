package br.gov.df.seagri.dominio_central.web.config.seguranca;

import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Classe utilitária estática para extração do contexto de segurança.
 * Não deve ser instanciada.
 */
public final class AutenticacaoContexto {

    private static final UUID USUARIO_SISTEMA_ID = UUID.fromString("00000000-0000-0000-0000-000000000000");

    // Construtor privado previne instanciação acidental
    private AutenticacaoContexto() {
        throw new UnsupportedOperationException("Esta é uma classe utilitária e não pode ser instanciada");
    }

    public static UUID getUsuarioAtualId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()
                || authentication.getPrincipal().equals("anonymousUser")) {
            return USUARIO_SISTEMA_ID;
        }

        if (authentication.getPrincipal() instanceof Jwt jwt) {
            String sub = jwt.getClaimAsString("sub");
            if (sub != null) {
                return UUID.fromString(sub);
            }
        }

        return USUARIO_SISTEMA_ID;
    }
}
