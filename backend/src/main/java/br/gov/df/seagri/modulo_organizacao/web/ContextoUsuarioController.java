package br.gov.df.seagri.modulo_organizacao.web;

import br.gov.df.seagri.modulo_organizacao.aplicacao.ContextoUsuarioSrv;
import br.gov.df.seagri.modulo_organizacao.web.dto.ContextoUsuarioDTO;

import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/usuarios/me")
public class ContextoUsuarioController {

    private final ContextoUsuarioSrv contextoUsuarioSrv;

    public ContextoUsuarioController(ContextoUsuarioSrv contextoUsuarioSrv) {
        this.contextoUsuarioSrv = contextoUsuarioSrv;
    }

    @GetMapping("/contexto")
    public ResponseEntity<ContextoUsuarioDTO> obterContexto(JwtAuthenticationToken auth) {
        
        // Apenas extrai a identidade do token (Keycloak 'sub')
        String userId = auth.getToken().getSubject();

        // Delega o trabalho pesado para a camada de serviço (Application Service)
        ContextoUsuarioDTO contexto = contextoUsuarioSrv.obterContextoPorUsuario(userId);

        return ResponseEntity.ok(contexto);
    }
}