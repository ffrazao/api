package br.gov.df.seagri.modulo_organizacao.web.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VinculoUsuarioRequestDTO {
    @NotBlank
    private String usuarioId;
    @NotBlank
    private String papel; 
}
