package br.gov.df.seagri.modulo_organizacao.infraestrutura;

import br.gov.df.seagri.dominio_central.infraestrutura.BaseDAO;
import br.gov.df.seagri.modulo_organizacao.dominio.Organizacao;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OrganizacaoDAO extends BaseDAO<Organizacao, UUID> {
    
    List<Organizacao> findByStatus(String status);
}