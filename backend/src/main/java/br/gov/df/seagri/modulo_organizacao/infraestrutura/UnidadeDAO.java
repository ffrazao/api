package br.gov.df.seagri.modulo_organizacao.infraestrutura;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Repository;

import br.gov.df.seagri.dominio_central.infraestrutura.BaseDAO;
import br.gov.df.seagri.modulo_organizacao.dominio.Unidade;

@Repository
public interface UnidadeDAO extends BaseDAO<Unidade, Long> {

    // Garante o isolamento Multi-Tenant na busca
    List<Unidade> findByOrganizacaoId(UUID organizacaoId);
}
