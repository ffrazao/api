package br.gov.df.seagri.modulo_organizacao.web.dto;

import lombok.Builder;
import lombok.Data;
import java.util.UUID;

@Data
@Builder
public class ContextoUsuarioDTO {
    private UUID organizacaoId;
    private Long unidadeId;
    private String papel; // Ex: OWNER, MANAGER, PARTICIPANT (Conforme RFC-0010)

    // Nomes amigáveis para exibir no cabeçalho do React
    private String organizacaoNome;
    private String unidadeNome;
}
