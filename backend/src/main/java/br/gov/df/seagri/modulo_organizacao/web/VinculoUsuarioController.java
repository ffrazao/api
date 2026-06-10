package br.gov.df.seagri.modulo_organizacao.web;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.gov.df.seagri.dominio_central.web.AbstractCrudTenantController;
import br.gov.df.seagri.modulo_organizacao.aplicacao.VinculoUsuarioSrv;
import br.gov.df.seagri.modulo_organizacao.dominio.VinculoUsuario;
import br.gov.df.seagri.modulo_organizacao.web.dto.VinculoUsuarioMapper;
import br.gov.df.seagri.modulo_organizacao.web.dto.VinculoUsuarioRequestDTO;
import br.gov.df.seagri.modulo_organizacao.web.dto.VinculoUsuarioResponseDTO;

@RestController
@RequestMapping("/api/v1/orgs/{organizacaoId}/vinculos")
public class VinculoUsuarioController extends
        AbstractCrudTenantController<VinculoUsuario, VinculoUsuarioRequestDTO, VinculoUsuarioResponseDTO, Long> {

    public VinculoUsuarioController(VinculoUsuarioSrv servico, VinculoUsuarioMapper mapper) {
        super(servico, mapper);
    }

    @Override
    protected void vincularContexto(VinculoUsuario entidade, UUID organizacaoId) {
        if (entidade.getId() == null) {
            entidade.setStatus("ATIVO");
            entidade.setCriadoPor(obterUsuarioAutenticado());
            entidade.setCriadoEm(OffsetDateTime.now(ZoneOffset.UTC));
        }
    }
}
