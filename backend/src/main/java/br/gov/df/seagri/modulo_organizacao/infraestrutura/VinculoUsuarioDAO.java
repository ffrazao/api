package br.gov.df.seagri.modulo_organizacao.infraestrutura;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Repository;

import br.gov.df.seagri.dominio_central.infraestrutura.BaseDAO;
import br.gov.df.seagri.modulo_organizacao.dominio.VinculoUsuario;

@Repository
public interface VinculoUsuarioDAO extends BaseDAO<VinculoUsuario, Long> {

    // Valida se o usuário pertence ao Tenant (Usado no PDP / Autorização)
    Optional<VinculoUsuario> findByKeycloakSubAndOrganizacaoId(UUID keycloakSub, UUID organizacaoId);

    // Lista todos os usuários de um determinado órgão
    List<VinculoUsuario> findByOrganizacaoId(UUID organizacaoId);

    // Lista todas as organizações nas quais um usuário possui vínculo
    List<VinculoUsuario> findByKeycloakSub(UUID keycloakSub);

    // NOVO: Valida rapidamente se o usuário já possui vínculo (Usado no ConviteSrv
    // para evitar duplicação)
    boolean existsByOrganizacaoIdAndKeycloakSub(UUID organizacaoId, UUID keycloakSub);
}
