package br.gov.df.seagri.dominio_central.web;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ApiResponse<T> {

    @Builder.Default
    private OffsetDateTime timestamp = OffsetDateTime.now(ZoneOffset.UTC);

    private int status;
    private String message;
    private T payload;
    private List<String> errors;
}
