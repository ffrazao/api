package br.gov.df.seagri.modulo_organizacao.aplicacao;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;

import br.gov.df.seagri.modulo_organizacao.dominio.AlocacaoUnidade;
import br.gov.df.seagri.modulo_organizacao.dominio.Organizacao;
import br.gov.df.seagri.modulo_organizacao.dominio.VinculoUsuario;
import br.gov.df.seagri.modulo_organizacao.infraestrutura.AlocacaoUnidadeDAO;
import br.gov.df.seagri.modulo_organizacao.infraestrutura.OrganizacaoDAO;
import br.gov.df.seagri.modulo_organizacao.infraestrutura.VinculoUsuarioDAO;
import br.gov.df.seagri.modulo_organizacao.web.dto.ContextoUsuarioDTO;
import br.gov.df.seagri.modulo_seguranca.dominio.IdentidadeAcesso;
import br.gov.df.seagri.modulo_seguranca.infraestrutura.IdentidadeAcessoDAO;

@Service
public class ContextoUsuarioSrv {

    private final IdentidadeAcessoDAO identidadeAcessoDAO;
    private final VinculoUsuarioDAO vinculoUsuarioDAO;
    private final OrganizacaoDAO organizacaoDAO;
    private final AlocacaoUnidadeDAO alocacaoUnidadeDAO;

    public ContextoUsuarioSrv(IdentidadeAcessoDAO identidadeAcessoDAO, VinculoUsuarioDAO vinculoUsuarioDAO,
            OrganizacaoDAO organizacaoDAO,
            AlocacaoUnidadeDAO alocacaoUnidadeDAO) {
        this.identidadeAcessoDAO = identidadeAcessoDAO;
        this.vinculoUsuarioDAO = vinculoUsuarioDAO;
        this.organizacaoDAO = organizacaoDAO;
        this.alocacaoUnidadeDAO = alocacaoUnidadeDAO;
    }

    public ContextoUsuarioDTO obterContextoPorUsuario(String userId) {

        UUID userUuid = UUID.fromString(userId);

        // 1. Busca a identidade canônica do usuário (Pessoa)
        Optional<IdentidadeAcesso> identidade = identidadeAcessoDAO.findByKeycloakSubComPessoa(userUuid);
        if (identidade.isEmpty()) {
            // Retorna imediatamente para guiar o Onboarding
            return ContextoUsuarioDTO.builder().possuiVinculoAtivo(false).possuiVinculoAtivo(false).build();
        }

        // 2. Busca o vínculo base do usuário (Organização)
        Optional<List<VinculoUsuario>> vinculoList = vinculoUsuarioDAO.findByKeycloakSub(userUuid);
        if (vinculoList.isEmpty() || vinculoList.get().isEmpty()) {
            // Retorna imediatamente para guiar o Onboarding
            return ContextoUsuarioDTO.builder().possuiIdentidadeCanonica(true).possuiVinculoAtivo(false).build();
        }

        final OffsetDateTime agoraUtc = OffsetDateTime.now(ZoneOffset.UTC);

        // captura o primeiro vínculo ativo, ordenado pela data de início
        Optional<VinculoUsuario> vinculoUsuario = vinculoList.get().stream()
                .sorted((v1, v2) -> v1.getDataInicio().compareTo(v2.getDataInicio()))
                .filter(
                        vinculo -> "ATIVO".equalsIgnoreCase(vinculo.getStatus()) &&
                                vinculo.getDataInicio().isBefore(agoraUtc) &&
                                (vinculo.getDataFim() == null || vinculo.getDataFim().isAfter(agoraUtc)))
                .findFirst();

        if (vinculoUsuario.isEmpty()) {
            return ContextoUsuarioDTO.builder().possuiIdentidadeCanonica(true).possuiVinculoAtivo(false).build();
        }

        UUID organizacaoId = Objects.requireNonNull(vinculoUsuario.get().obterOrganizacaoId(),
                "Organização não encontrada.");

        // 2. Busca o Nome da Organização
        Organizacao organizacao = organizacaoDAO.findById(organizacaoId)
                .orElseThrow(() -> new RuntimeException("Organização não encontrada."));

        AlocacaoUnidade alocacaoAtiva = alocacaoUnidadeDAO
                .buscarAlocacoesVigentesPorVinculo(vinculoUsuario.get().getId(), agoraUtc)
                .stream().findFirst()
                .orElseThrow(() -> new RuntimeException(
                        "O usuário possui vínculo, mas não tem nenhuma lotação vigente em unidades no momento."));

        // 4. Constrói o DTO final.
        // Note que o papel agora vem da Alocação (ex: GESTOR_SUBSTITUTO) e não mais do
        // Vínculo geral!
        return ContextoUsuarioDTO.builder()
                .possuiIdentidadeCanonica(true)
                .possuiVinculoAtivo(true)
                .organizacaoId(organizacaoId)
                .organizacaoNome(organizacao.getNome())
                .unidadeId(alocacaoAtiva.getUnidade().getId())
                .unidadeNome(alocacaoAtiva.getUnidade().getNome())
                .papel(alocacaoAtiva.getPapelOperacional())
                .build();
    }
}
