package br.gov.df.seagri.dominio_central.dominio;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;

public interface RastreavelModificacao {

    @LastModifiedBy
    UUID getAtualizadoPor();

    @LastModifiedDate
    OffsetDateTime getAtualizadoEm();

    void setAtualizadoPor(UUID atualizadoPor);

    void setAtualizadoEm(OffsetDateTime atualizadoEm);

}
