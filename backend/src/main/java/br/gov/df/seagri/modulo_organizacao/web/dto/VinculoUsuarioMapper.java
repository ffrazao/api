package br.gov.df.seagri.modulo_organizacao.web.dto;

import br.gov.df.seagri.dominio_central.web.BaseMapper;
import br.gov.df.seagri.modulo_organizacao.dominio.VinculoUsuario;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING, unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface VinculoUsuarioMapper extends BaseMapper<VinculoUsuario, VinculoUsuarioRequestDTO, VinculoUsuarioResponseDTO> {
    
    @Mapping(source = "organizacao.id", target = "organizacaoId")
    @Override
    VinculoUsuarioResponseDTO paraDto(VinculoUsuario entidade);
}