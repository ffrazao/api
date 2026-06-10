package br.gov.df.seagri.dominio_central.infraestrutura;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.repository.NoRepositoryBean;

/**
 * Interface base para todos os DAOs do sistema.
 * Combina o CRUD padrão com a capacidade de executar filtros dinâmicos (Specifications).
 */
@NoRepositoryBean
public interface BaseDAO<T, ID> extends JpaRepository<T, ID>, JpaSpecificationExecutor<T> {
}