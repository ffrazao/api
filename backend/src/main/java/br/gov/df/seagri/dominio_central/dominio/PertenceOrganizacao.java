package br.gov.df.seagri.dominio_central.dominio;

import java.util.UUID;

public interface PertenceOrganizacao {
    // Trocamos 'get' por 'obter' para evitar o conflito com propriedades do JPA
    UUID obterOrganizacaoId();
}