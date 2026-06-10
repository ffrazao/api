package br.gov.df.seagri.modulo_organizacao.web.dto;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import br.gov.df.seagri.dominio_central.web.BaseMapper;
import br.gov.df.seagri.modulo_organizacao.dominio.Organizacao;

@Mapper(componentModel = "spring")
public interface OrganizacaoMapper extends BaseMapper<Organizacao, OrganizacaoRequestDTO, OrganizacaoResponseDTO> {

    @Override
    OrganizacaoResponseDTO paraDto(Organizacao entidade);

    @Override
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "criadoPor", ignore = true)
    @Mapping(target = "criadoEm", ignore = true)
    @Mapping(target = "atualizadoPor", ignore = true)
    @Mapping(target = "atualizadoEm", ignore = true)
    @Mapping(target = "versao", ignore = true)
    @Mapping(target = "status", ignore = true)
    Organizacao paraEntidade(OrganizacaoRequestDTO dto);

    @Override
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "criadoPor", ignore = true)
    @Mapping(target = "criadoEm", ignore = true)
    @Mapping(target = "atualizadoPor", ignore = true)
    @Mapping(target = "atualizadoEm", ignore = true)
    @Mapping(target = "versao", ignore = true)
    @Mapping(target = "status", ignore = true)
    void atualizarEntidade(
            @MappingTarget Organizacao entidade,
            OrganizacaoRequestDTO dto);

    List<OrganizacaoResponseDTO> paraDto(List<Organizacao> entidades);

    List<Organizacao> paraEntidade(List<OrganizacaoRequestDTO> dtos);
}
