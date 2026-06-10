package br.gov.df.seagri.modulo_organizacao.aplicacao;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.gov.df.seagri.dominio_central.aplicacao.BaseCrudTenantSrv;
import br.gov.df.seagri.dominio_central.aplicacao.ValidadorTenant;
import br.gov.df.seagri.modulo_organizacao.dominio.Organizacao;
import br.gov.df.seagri.modulo_organizacao.dominio.VinculoUsuario;
import br.gov.df.seagri.modulo_organizacao.infraestrutura.VinculoUsuarioDAO;

@Service
public class VinculoUsuarioSrv extends BaseCrudTenantSrv<VinculoUsuario, Long> {

    private final VinculoUsuarioDAO vinculoUsuarioDAO;
    private final OrganizacaoSrv organizacaoSrv;

    public VinculoUsuarioSrv(VinculoUsuarioDAO vinculoUsuarioDAO, ValidadorTenant validadorTenant,
            OrganizacaoSrv organizacaoSrv) {
        super(vinculoUsuarioDAO, validadorTenant);
        this.vinculoUsuarioDAO = vinculoUsuarioDAO;
        this.organizacaoSrv = organizacaoSrv;
    }

    @Override
    @Transactional
    public VinculoUsuario salvar(UUID organizacaoId, VinculoUsuario entidade) {

        // Se for uma inserção (ID nulo), aplicamos a sua regra de negócio de unicidade!
        if (entidade.getId() == null) {
            vinculoUsuarioDAO.findByKeycloakSubAndOrganizacaoId(entidade.getKeycloakSub(), organizacaoId)
                    .ifPresent(v -> {
                        throw new IllegalStateException("O usuário já possui vínculo com esta organização.");
                    });
        }

        // Injetamos a Organização
        if (entidade.getOrganizacao() == null) {
            Organizacao organizacao = organizacaoSrv.buscarPorId(organizacaoId);
            entidade.setOrganizacao(organizacao);
        }

        return super.salvar(organizacaoId, entidade);
    }
}
