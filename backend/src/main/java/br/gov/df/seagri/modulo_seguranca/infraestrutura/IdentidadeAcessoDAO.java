package br.gov.df.seagri.modulo_seguranca.infraestrutura;

import java.util.Optional;
import java.util.UUID;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import br.gov.df.seagri.dominio_central.infraestrutura.RepositorioSomenteInclusao;
import br.gov.df.seagri.modulo_seguranca.dominio.IdentidadeAcesso;

@Repository
public interface IdentidadeAcessoDAO
        extends RepositorioSomenteInclusao<IdentidadeAcesso, Long>, JpaSpecificationExecutor<IdentidadeAcesso> {

    /**
     * Busca a identidade de acesso através do Subject (sub) do Keycloak,
     * já trazendo os dados da Pessoa (Identidade Canônica) na mesma query.
     */
    @Query("SELECT i FROM IdentidadeAcesso i JOIN FETCH i.pessoa WHERE i.keycloakSub = :sub")
    @Cacheable(value = "identidade_acesso", key = "#sub", unless = "#result == null")
    Optional<IdentidadeAcesso> findByKeycloakSubComPessoa(@Param("sub") UUID sub);

}
