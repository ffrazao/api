package br.gov.df.seagri.modulo_organizacao.infraestrutura;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import br.gov.df.seagri.modulo_organizacao.dominio.Convite;

@Repository
public interface ConviteDAO extends JpaRepository<Convite, Long> {

    // O Spring Data JPA cria a query automaticamente baseada no nome do método
    Optional<Convite> findByCodigo(String codigo);

}
