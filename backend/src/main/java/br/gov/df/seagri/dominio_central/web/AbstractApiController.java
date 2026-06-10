package br.gov.df.seagri.dominio_central.web;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

public abstract class AbstractApiController {

    // Retorno padrão de SUCESSO (HTTP 200)
    protected <T> ResponseEntity<ApiResponse<T>> ok(T payload) {
        return ResponseEntity.ok(ApiResponse.<T>builder()
                .status(HttpStatus.OK.value())
                .message("Operação realizada com sucesso")
                .payload(payload)
                .build());
    }

    // Retorno padrão de CRIAÇÃO (HTTP 201)
    protected <T> ResponseEntity<ApiResponse<T>> created(T payload) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.<T>builder()
                .status(HttpStatus.CREATED.value())
                .message("Recurso criado com sucesso")
                .payload(payload)
                .build());
    }

    // Extrai o 'sub' do Keycloak (identificador do usuário) da requisição
    protected UUID obterUsuarioAutenticado() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        // Verifica se o usuário está autenticado e se é um token JWT válido
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            return UUID.fromString(jwt.getSubject());
        }

        throw new SecurityException("Usuário não autenticado ou token inválido");
    }
}
