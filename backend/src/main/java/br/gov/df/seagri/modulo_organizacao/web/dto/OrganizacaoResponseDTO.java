package br.gov.df.seagri.modulo_organizacao.web.dto;

import lombok.Builder;
import lombok.Data;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class OrganizacaoResponseDTO {
    private UUID id;
    private String nome;
    private String status;
    private String criadoPor;
    private OffsetDateTime criadoEm;
}
