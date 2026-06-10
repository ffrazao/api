package br.gov.df.seagri.dominio_central.aplicacao;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

public interface CrudSrv<T, ID> {
    T salvar(T entidade);
    T buscarPorId(ID id);
    void excluir(ID id);

    // Sobrecarga elegante para listas completas ou paginadas
    List<T> buscarTudo();
    Page<T> buscarTudo(Pageable pageable);

    List<T> buscarTudoComFiltro(Specification<T> filtro);
    Page<T> buscarTudoComFiltro(Specification<T> filtro, Pageable pageable);
}