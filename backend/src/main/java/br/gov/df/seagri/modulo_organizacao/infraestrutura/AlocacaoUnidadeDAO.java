package br.gov.df.seagri.modulo_organizacao.infraestrutura;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.gov.df.seagri.modulo_organizacao.dominio.AlocacaoUnidade;

public interface AlocacaoUnidadeDAO extends JpaRepository<AlocacaoUnidade, Long> {

    // A query agora recebe a data/hora exata calculada pelo Java
    @Query("SELECT a FROM AlocacaoUnidade a JOIN FETCH a.unidade WHERE a.vinculoUsuario.id = :vinculoId AND a.status = 'ATIVO' AND a.dataInicio <= :agora AND (a.dataFim IS NULL OR a.dataFim >= :agora)")
    List<AlocacaoUnidade> buscarAlocacoesVigentesPorVinculo(@Param("vinculoId") Long vinculoId,
            @Param("agora") OffsetDateTime agora);

}
