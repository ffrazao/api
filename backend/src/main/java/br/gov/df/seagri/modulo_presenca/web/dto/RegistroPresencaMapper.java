package br.gov.df.seagri.modulo_presenca.web.dto;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

import br.gov.df.seagri.dominio_central.web.BaseMapper;
import br.gov.df.seagri.modulo_presenca.dominio.RegistroPresenca;

/**
 * Mapper automatizado via MapStruct para a entidade RegistroPresenca.
 */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING, unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface RegistroPresencaMapper
        extends BaseMapper<RegistroPresenca, RegistroPresencaRequestDTO, RegistroPresencaResponseDTO> {

    // ENSINA AO MAPSTRUCT COMO PEGAR OS IDs DOS OBJETOS RELACIONADOS
    @Override
    @Mapping(source = "organizacao.id", target = "organizacaoId")
    @Mapping(source = "unidade.id", target = "unidadeId")
    RegistroPresencaResponseDTO paraDto(RegistroPresenca entidade);

    // (Opcional) Se você quiser bloquear o "paraEntidade" para reforçar a
    // imutabilidade
    // do RegistroPresenca e forçar os programadores a usarem o construtor manual:
    @Override
    @Mapping(target = "organizacao", ignore = true)
    @Mapping(target = "unidade", ignore = true)
    RegistroPresenca paraEntidade(RegistroPresencaRequestDTO dto);

}
