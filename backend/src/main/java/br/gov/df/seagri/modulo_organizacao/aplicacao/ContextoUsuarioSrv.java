package br.gov.df.seagri.modulo_organizacao.aplicacao;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Service;

import br.gov.df.seagri.modulo_organizacao.dominio.AlocacaoUnidade;
import br.gov.df.seagri.modulo_organizacao.dominio.Organizacao;
import br.gov.df.seagri.modulo_organizacao.dominio.VinculoUsuario;
import br.gov.df.seagri.modulo_organizacao.infraestrutura.AlocacaoUnidadeDAO;
import br.gov.df.seagri.modulo_organizacao.infraestrutura.OrganizacaoDAO;
import br.gov.df.seagri.modulo_organizacao.infraestrutura.VinculoUsuarioDAO;
import br.gov.df.seagri.modulo_organizacao.web.dto.ContextoUsuarioDTO;

@Service
public class ContextoUsuarioSrv {

    private final VinculoUsuarioDAO vinculoUsuarioDAO;
    private final OrganizacaoDAO organizacaoDAO;
    private final AlocacaoUnidadeDAO alocacaoUnidadeDAO;

    public ContextoUsuarioSrv(VinculoUsuarioDAO vinculoUsuarioDAO, OrganizacaoDAO organizacaoDAO,
            AlocacaoUnidadeDAO alocacaoUnidadeDAO) {
        this.vinculoUsuarioDAO = vinculoUsuarioDAO;
        this.organizacaoDAO = organizacaoDAO;
        this.alocacaoUnidadeDAO = alocacaoUnidadeDAO;
    }

    public ContextoUsuarioDTO obterContextoPorUsuario(String userId) {

        // 1. Busca o vínculo base do usuário (Organização)
        VinculoUsuario vinculo = vinculoUsuarioDAO.findByKeycloakSub(UUID.fromString(userId))
                .stream().findFirst()
                .orElseThrow(() -> new RuntimeException("Usuário não possui vínculo. Aceite um convite primeiro."));

        UUID organizacaoId = Objects.requireNonNull(vinculo.obterOrganizacaoId(), "Organização não encontrada.");

        // 2. Busca o Nome da Organização
        Organizacao organizacao = organizacaoDAO.findById(organizacaoId)
                .orElseThrow(() -> new RuntimeException("Organização não encontrada."));

        // 3. Busca a lotação VIGENTE do usuário (A dimensão temporal da RFC-0010 em
        // ação!)
        // Adicionada a declaração da variável agoraUtc e o uso de ZoneOffset.UTC
        OffsetDateTime agoraUtc = OffsetDateTime.now(ZoneOffset.UTC);

        AlocacaoUnidade alocacaoAtiva = alocacaoUnidadeDAO.buscarAlocacoesVigentesPorVinculo(vinculo.getId(), agoraUtc)
                .stream().findFirst()
                .orElseThrow(() -> new RuntimeException(
                        "O usuário possui vínculo, mas não tem nenhuma lotação vigente em unidades no momento."));

        // 4. Constrói o DTO final.
        // Note que o papel agora vem da Alocação (ex: GESTOR_SUBSTITUTO) e não mais do
        // Vínculo geral!
        return ContextoUsuarioDTO.builder()
                .organizacaoId(organizacaoId)
                .organizacaoNome(organizacao.getNome())
                .unidadeId(alocacaoAtiva.getUnidade().getId())
                .unidadeNome(alocacaoAtiva.getUnidade().getNome())
                .papel(alocacaoAtiva.getPapelOperacional())
                .build();
    }
}
