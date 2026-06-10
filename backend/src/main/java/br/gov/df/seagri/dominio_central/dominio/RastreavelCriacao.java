package br.gov.df.seagri.dominio_central.dominio;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;

public interface RastreavelCriacao {

    @CreatedBy
    UUID getCriadoPor();

    @CreatedDate
    OffsetDateTime getCriadoEm();

    void setCriadoPor(UUID criadoPor);

    void setCriadoEm(OffsetDateTime criadoEm);

}
