package br.gov.df.seagri.modulo_organizacao.aplicacao;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.gov.df.seagri.dominio_central.aplicacao.BaseCrudTenantSrv;
import br.gov.df.seagri.dominio_central.aplicacao.ValidadorTenant;
import br.gov.df.seagri.modulo_organizacao.dominio.Organizacao;
import br.gov.df.seagri.modulo_organizacao.dominio.Unidade;
import br.gov.df.seagri.modulo_organizacao.infraestrutura.UnidadeDAO;

@Service
public class UnidadeSrv extends BaseCrudTenantSrv<Unidade, Long> {

    // private final UnidadeDAO unidadeDAO;
    private final OrganizacaoSrv organizacaoSrv;

    public UnidadeSrv(UnidadeDAO unidadeDAO, ValidadorTenant validadorTenant, OrganizacaoSrv organizacaoSrv) {
        super(unidadeDAO, validadorTenant);
        // this.unidadeDAO = unidadeDAO;
        this.organizacaoSrv = organizacaoSrv;
    }

    // Sobrescrevemos o método padrão para interceptar a entidade vinda do
    // Controller
    @Override
    @Transactional
    public Unidade salvar(UUID organizacaoId, Unidade entidade) {

        // Se a organização ainda não foi preenchida (ex: inserção vinda via MapStruct)
        if (entidade.getOrganizacao() == null) {
            Organizacao organizacao = organizacaoSrv.buscarPorId(organizacaoId);
            entidade.setOrganizacao(organizacao);
        }

        // Repassa para a classe pai (BaseCrudTenantSrv) cuidar das validações de Tenant
        // e do save()
        return super.salvar(organizacaoId, entidade);
    }
}
