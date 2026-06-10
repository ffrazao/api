package br.gov.df.seagri.modulo_pessoa.infraestrutura;

import java.util.Optional;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import br.gov.df.seagri.dominio_central.infraestrutura.BaseDAO;
import br.gov.df.seagri.modulo_pessoa.dominio.PessoaFisica;

@Repository
public interface PessoaFisicaDAO extends BaseDAO<PessoaFisica, Long> {

    @Query("SELECT p FROM PessoaFisica p WHERE p.cpf = :cpf")
    Optional<PessoaFisica> findByCpf(@Param("cpf") String cpf);

}
