package br.gov.df.seagri.dominio_central.infraestrutura;

import static br.gov.df.seagri.dominio_central.web.config.seguranca.AutenticacaoContexto.getUsuarioAtualId;

import java.time.OffsetDateTime;

import br.gov.df.seagri.dominio_central.dominio.RastreavelCriacao;
import br.gov.df.seagri.dominio_central.dominio.RastreavelModificacao;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;

public class AuditoriaListener {

    @PrePersist
    public void prePersist(Object entity) {
        OffsetDateTime agora = OffsetDateTime.now();

        if (entity instanceof RastreavelCriacao aud) {
            aud.setCriadoEm(agora);
            if (aud.getCriadoPor() == null) {
                aud.setCriadoPor(getUsuarioAtualId());
            }
        }

        if (entity instanceof RastreavelModificacao aud) {
            if (entity instanceof RastreavelCriacao audCriacao) {
                // clone na criação
                aud.setAtualizadoEm(audCriacao.getCriadoEm());
                aud.setAtualizadoPor(audCriacao.getCriadoPor());
            } else {
                aud.setAtualizadoEm(agora);
                if (aud.getAtualizadoPor() == null) {
                    aud.setAtualizadoPor(getUsuarioAtualId());
                }
            }
        }
    }

    @PreUpdate
    public void preUpdate(Object entity) {
        if (entity instanceof RastreavelModificacao aud) {
            aud.setAtualizadoEm(OffsetDateTime.now());
            if (aud.getAtualizadoPor() == null) {
                aud.setAtualizadoPor(getUsuarioAtualId());
            }
        }
    }

}
