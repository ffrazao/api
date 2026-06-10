package br.gov.df.seagri.dominio_central.infraestrutura;

import java.util.List;
import java.util.Optional;

import org.springframework.data.repository.NoRepositoryBean;
import org.springframework.data.repository.Repository;

/**
 * Repositório base para entidades imutáveis.
 * Não expõe NENHUM método de delete ou update.
 */
@NoRepositoryBean
public interface RepositorioSomenteInclusao<T, ID> extends Repository<T, ID> {

    // Permite salvar (inserir)
    <S extends T> S save(S entity);

    // Permite buscas
    Optional<T> findById(ID id);

    List<T> findAll();

    boolean existsById(ID id);

    long count();

}
