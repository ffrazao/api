package br.gov.df.seagri.modulo_organizacao.aplicacao;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.gov.df.seagri.dominio_central.aplicacao.BaseCrudTenantSrv;
import br.gov.df.seagri.dominio_central.aplicacao.ValidadorTenant;
import br.gov.df.seagri.modulo_organizacao.dominio.Organizacao;
import br.gov.df.seagri.modulo_organizacao.dominio.Relacionamento;
import br.gov.df.seagri.modulo_organizacao.infraestrutura.RelacionamentoDAO;

@Service
public class RelacionamentoSrv extends BaseCrudTenantSrv<Relacionamento, Long> {

    // private final RelacionamentoDAO relacionamentoDAO;
    private final OrganizacaoSrv organizacaoSrv;

    public RelacionamentoSrv(RelacionamentoDAO relacionamentoDAO, ValidadorTenant validadorTenant,
            OrganizacaoSrv organizacaoSrv) {
        super(relacionamentoDAO, validadorTenant);
        // this.relacionamentoDAO = relacionamentoDAO;
        this.organizacaoSrv = organizacaoSrv;
    }

    @Transactional
    public Relacionamento criarRelacionamento(UUID organizacaoId, String sujeitoId, String objetoId,
            String tipoRelacionamento, UUID criadoPor) {
        Organizacao organizacao = organizacaoSrv.buscarPorId(organizacaoId);
        Relacionamento novoRelacionamento = new Relacionamento(organizacao, sujeitoId, objetoId, tipoRelacionamento);
        return super.salvar(organizacaoId, novoRelacionamento);
    }
}
