package br.gov.df.seagri.modulo_organizacao.web.dto;

import lombok.Builder;
import lombok.Data;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class VinculoUsuarioResponseDTO {
    private Long id;
    private UUID organizacaoId;
    private UUID keycloakSub;
    private String papel;
    private String status;
    private OffsetDateTime criadoEm;
}
