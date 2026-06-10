package br.gov.df.seagri.modulo_seguranca.web;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.gov.df.seagri.dominio_central.web.AbstractApiController;
import br.gov.df.seagri.dominio_central.web.ApiResponse;
import br.gov.df.seagri.dominio_central.web.config.seguranca.BusinessPrincipalToken;
import br.gov.df.seagri.modulo_seguranca.aplicacao.OnboardingSrv;
import br.gov.df.seagri.modulo_seguranca.web.dto.OnboardingRequestDTO;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/onboarding")
public class OnboardingController extends AbstractApiController {

    private final OnboardingSrv onboardingSrv;

    public OnboardingController(OnboardingSrv onboardingSrv) {
        this.onboardingSrv = onboardingSrv;
    }

    @PostMapping("/completar-perfil")
    public ResponseEntity<ApiResponse<String>> completarPerfil(@Valid @RequestBody OnboardingRequestDTO request) {

        // Extrai o Token customizado do contexto de segurança
        BusinessPrincipalToken token = (BusinessPrincipalToken) SecurityContextHolder.getContext().getAuthentication();

        // Pega o "sub" (Identificador Técnico) direto do payload do JWT
        UUID keycloakSub = UUID.fromString(token.getToken().getClaimAsString("sub"));

        // Chama o serviço para validar a foto e amarrar ao CPF
        onboardingSrv.processarOnboarding(keycloakSub, request);

        return ok("Perfil concluído com sucesso! Sua identidade foi vinculada de forma segura.");
    }
}
