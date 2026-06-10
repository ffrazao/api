package br.gov.df.seagri.dominio_central.aplicacao;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.UUID;

public interface CrudTenantSrv<T, ID> {
    T salvar(UUID organizacaoId, T entidade);
    T buscarPorId(UUID organizacaoId, ID id);
    void excluir(UUID organizacaoId, ID id);

    List<T> buscarTudo(UUID organizacaoId);
    Page<T> buscarTudo(UUID organizacaoId, Pageable pageable);

    List<T> buscarTudoComFiltro(UUID organizacaoId, Specification<T> filtro);
    Page<T> buscarTudoComFiltro(UUID organizacaoId, Specification<T> filtro, Pageable pageable);
}