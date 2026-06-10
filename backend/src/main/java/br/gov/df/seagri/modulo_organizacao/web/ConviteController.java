package br.gov.df.seagri.modulo_organizacao.web;

import br.gov.df.seagri.dominio_central.web.AbstractApiController;
import br.gov.df.seagri.dominio_central.web.ApiResponse;
import br.gov.df.seagri.modulo_organizacao.aplicacao.ConviteSrv;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/convites")
public class ConviteController extends AbstractApiController {

    private final ConviteSrv conviteSrv;

    public ConviteController(ConviteSrv conviteSrv) {
        this.conviteSrv = conviteSrv;
    }

    @PostMapping("/{codigo}/aceitar")
    public ResponseEntity<ApiResponse<String>> aceitar(@PathVariable String codigo) {
        // Extrai com segurança o ID do usuário (Token JWT) a partir do controller pai
        UUID usuarioId = obterUsuarioAutenticado();

        conviteSrv.aceitarConvite(codigo, usuarioId);

        return ok("Convite aceito com sucesso! Você agora faz parte da Organização.");
    }
}
