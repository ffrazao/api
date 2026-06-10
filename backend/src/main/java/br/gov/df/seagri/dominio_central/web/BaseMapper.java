package br.gov.df.seagri.dominio_central.web;

import org.mapstruct.MappingTarget;

/**
 * Contrato base para todos os mappers da aplicação gerados via MapStruct.
 */
public interface BaseMapper<T, REQ, RES> {
    
    RES paraDto(T entidade);
    
    T paraEntidade(REQ dto);
    
    void atualizarEntidade(@MappingTarget T entidade, REQ dto);
}