package br.gov.df.seagri.modulo_organizacao.web.dto;

import br.gov.df.seagri.dominio_central.web.BaseMapper;
import br.gov.df.seagri.modulo_organizacao.dominio.Unidade;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

// ReportingPolicy.IGNORE manda o MapStruct ignorar campos não mapeados sem gerar warnings!
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING, unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UnidadeMapper extends BaseMapper<Unidade, UnidadeRequestDTO, UnidadeResponseDTO> {

    // Ensina o MapStruct a entrar no objeto 'organizacao', pegar o 'id' e colocar no DTO
    @Mapping(source = "organizacao.id", target = "organizacaoId")
    @Override
    UnidadeResponseDTO paraDto(Unidade entidade);
}