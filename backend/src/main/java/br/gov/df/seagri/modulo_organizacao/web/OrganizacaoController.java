package br.gov.df.seagri.modulo_organizacao.web;

import br.gov.df.seagri.dominio_central.web.AbstractCrudController;
import br.gov.df.seagri.modulo_organizacao.aplicacao.OrganizacaoSrv;
import br.gov.df.seagri.modulo_organizacao.dominio.Organizacao;
import br.gov.df.seagri.modulo_organizacao.web.dto.OrganizacaoMapper;
import br.gov.df.seagri.modulo_organizacao.web.dto.OrganizacaoRequestDTO;
import br.gov.df.seagri.modulo_organizacao.web.dto.OrganizacaoResponseDTO;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orgs") // Rota global, pois a Org é a raiz!
public class OrganizacaoController extends AbstractCrudController<Organizacao, OrganizacaoRequestDTO, OrganizacaoResponseDTO, UUID> {

    public OrganizacaoController(OrganizacaoSrv organizacaoSrv, OrganizacaoMapper mapper) {
        super(organizacaoSrv, mapper);
    }

    @Override
    protected void vincularContexto(Organizacao organizacao) {
        if (organizacao.getId() == null) {
            organizacao.setStatus("ACTIVE"); // Status padrão da RFC-0005
            organizacao.setCriadoPor(obterUsuarioAutenticado());
            organizacao.setCriadoEm(OffsetDateTime.now(ZoneOffset.UTC));
        }
    }
}
