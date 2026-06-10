package br.gov.df.seagri.modulo_presenca.web;

import java.util.List;
import java.util.UUID;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.gov.df.seagri.dominio_central.web.AbstractApiController;
import br.gov.df.seagri.dominio_central.web.ApiResponse;
import br.gov.df.seagri.modulo_presenca.aplicacao.RegistroPresencaSrv;
import br.gov.df.seagri.modulo_presenca.dominio.RegistroPresenca;
import br.gov.df.seagri.modulo_presenca.web.dto.RegistroPresencaMapper;
import br.gov.df.seagri.modulo_presenca.web.dto.RegistroPresencaRequestDTO;
import br.gov.df.seagri.modulo_presenca.web.dto.RegistroPresencaResponseDTO;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/orgs/{organizacaoId}/presencas")
public class RegistroPresencaController extends AbstractApiController {

    private final RegistroPresencaSrv registroPresencaSrv;
    private final RegistroPresencaMapper mapper; // Injeção do Mapper!

    public RegistroPresencaController(RegistroPresencaSrv registroPresencaSrv, RegistroPresencaMapper mapper) {
        this.registroPresencaSrv = registroPresencaSrv;
        this.mapper = mapper;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<RegistroPresencaResponseDTO>> registrar(
            @PathVariable UUID organizacaoId,
            @Valid @ModelAttribute RegistroPresencaRequestDTO request) {

        UUID keycloakSub = obterUsuarioAutenticado();
        RegistroPresenca presencaSalva = registroPresencaSrv.registrar(organizacaoId, keycloakSub, request);
        return created(mapper.paraDto(presencaSalva));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<RegistroPresencaResponseDTO>>> listarHistorico(
            @PathVariable UUID organizacaoId) {

        // Extrai a identidade de quem está fazendo a requisição
        UUID keycloakSub = obterUsuarioAutenticado();

        // CORREÇÃO 2: Chamando o método com o nome correto alinhado com o seu DAO e
        // Serviço
        List<RegistroPresenca> historico = registroPresencaSrv.buscarPorKeycloakSub(keycloakSub);

        // Converte a lista de Entidades para a lista de DTOs usando o MapStruct
        List<RegistroPresencaResponseDTO> historicoDto = historico.stream()
                .map(mapper::paraDto)
                .toList();

        return ok(historicoDto);
    }

    // Rota GET exclusiva para retornar o arquivo de imagem
    @GetMapping(value = "/{presencaId}/foto", produces = org.springframework.http.MediaType.IMAGE_JPEG_VALUE)
    public ResponseEntity<byte[]> exibirFoto(
            @PathVariable UUID organizacaoId,
            @PathVariable Long presencaId) {

        UUID keycloakSub = obterUsuarioAutenticado();
        byte[] imagem = registroPresencaSrv.buscarFotoBiometrica(organizacaoId, keycloakSub,
                presencaId);

        if (imagem == null) {
            return ResponseEntity.notFound().build();
        }

        // Retorna os bytes da imagem com cache no navegador
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CACHE_CONTROL, "max-age=3600")
                .body(imagem);
    }

}
