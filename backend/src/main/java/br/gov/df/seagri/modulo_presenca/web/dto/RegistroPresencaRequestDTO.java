package br.gov.df.seagri.modulo_presenca.web.dto;

import java.time.OffsetDateTime;

import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RegistroPresencaRequestDTO {

    @NotNull(message = "A Unidade é obrigatória")
    private Long unidadeId;

    private Double latitude;

    private Double longitude;

    private Double precisaoGps;

    @NotBlank(message = "O ID do Dispositivo é obrigatório")
    private String dispositivoId;

    @NotBlank(message = "O Modo de Registro é obrigatório")
    private String modoRegistro; // Ex: "SELF" ou "SHARED_DEVICE"

    @NotNull(message = "O horário de captura é obrigatório")
    private OffsetDateTime capturadoEm;

    private MultipartFile foto;
}
