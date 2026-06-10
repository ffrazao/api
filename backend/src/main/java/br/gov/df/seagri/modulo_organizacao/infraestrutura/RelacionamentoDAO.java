package br.gov.df.seagri.modulo_organizacao.infraestrutura;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Repository;

import br.gov.df.seagri.dominio_central.infraestrutura.BaseDAO;
import br.gov.df.seagri.modulo_organizacao.dominio.Relacionamento;

@Repository
public interface RelacionamentoDAO extends BaseDAO<Relacionamento, Long> {

    // Busca todas as relações (arestas) partindo de um sujeito específico (Nó de
    // origem)
    List<Relacionamento> findByOrganizacaoIdAndSujeitoId(UUID organizacaoId, String sujeitoId);

    // Busca todas as relações (arestas) chegando a um objeto específico (Nó de
    // destino)
    List<Relacionamento> findByOrganizacaoIdAndObjetoId(UUID organizacaoId, String objetoId);

    // Busca relações específicas pelo tipo semântico (Ex: "SUBORDINADO_A")
    List<Relacionamento> findByOrganizacaoIdAndSujeitoIdAndTipoRelacionamento(UUID organizacaoId, String sujeitoId,
            String tipoRelacionamento);
}
