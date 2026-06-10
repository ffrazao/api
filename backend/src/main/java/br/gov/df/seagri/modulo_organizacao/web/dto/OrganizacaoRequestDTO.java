package br.gov.df.seagri.modulo_organizacao.web.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OrganizacaoRequestDTO {
    @NotBlank(message = "O nome da organização é obrigatório")
    private String nome;
}