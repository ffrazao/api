package br.gov.df.seagri.modulo_seguranca.web.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OnboardingRequestDTO {

    @NotBlank(message = "O CPF é obrigatório para a identificação canônica.")
    private String cpf;

    @NotBlank(message = "A foto (selfie) é obrigatória para a prova de vida.")
    private String fotoBase64;

    /*
     * DICA DE EXPANSÃO:
     * No futuro, quando for exigir mais dados conforme a LGPD, basta adicionar
     * aqui:
     *
     * @NotBlank(message = "O Nome Completo é obrigatório")
     * private String nome;
     *
     * @NotNull(message = "A data de nascimento é obrigatória")
     * private LocalDate dataNascimento;
     *
     * @NotBlank(message = "O CEP é obrigatório")
     * private String cep;
     */

}
