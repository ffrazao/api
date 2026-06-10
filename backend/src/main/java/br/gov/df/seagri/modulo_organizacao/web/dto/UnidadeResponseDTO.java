package br.gov.df.seagri.modulo_organizacao.web.dto;

import lombok.Builder;
import lombok.Data;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class UnidadeResponseDTO {
    private Long id;
    private UUID organizacaoId;
    private String nome;
    private String tipoGeometria;
    private OffsetDateTime criadoEm;

    // Novos campos adicionados
    private Double centroGeoLat;
    private Double centroGeoLng;
    private Integer raioGeoMetros;
}
