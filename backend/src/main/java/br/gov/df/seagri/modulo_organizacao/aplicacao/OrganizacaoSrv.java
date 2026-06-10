package br.gov.df.seagri.modulo_organizacao.aplicacao;

import br.gov.df.seagri.dominio_central.aplicacao.BaseCrudSrv; // Ajuste o import se o nome do seu serviço global base for diferente
import br.gov.df.seagri.modulo_organizacao.dominio.Organizacao;
import br.gov.df.seagri.modulo_organizacao.infraestrutura.OrganizacaoDAO;
import org.springframework.stereotype.Service;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;

import java.util.UUID;

@Service
public class OrganizacaoSrv extends BaseCrudSrv<Organizacao, UUID> {

    // private final OrganizacaoDAO organizacaoDAO;

    // Injeta o DAO próprio e repassa para a superclasse genérica orquestrar o CRUD
    // global
    public OrganizacaoSrv(OrganizacaoDAO organizacaoDAO) {
        super(organizacaoDAO);
        // this.organizacaoDAO = organizacaoDAO;
    }

    @Cacheable(value = "organizacoes", key = "#id", unless = "#result == null")
    public Organizacao buscarPorId(UUID id) {
        return super.buscarPorId(id);
    }

    @Override
    @CacheEvict(value = "organizacoes", key = "#entidade.id")
    public Organizacao salvar(Organizacao entidade) {
        return super.salvar(entidade);
    }

}
