package br.gov.df.seagri.dominio_central.infraestrutura;

import java.util.UUID;

import org.hibernate.envers.RevisionListener;

import br.gov.df.seagri.dominio_central.web.config.seguranca.AutenticacaoContexto;

public class RevisionListenerCustom implements RevisionListener {

    @Override
    public void newRevision(Object revisionEntity) {
        RevisionEntityCustom rev = (RevisionEntityCustom) revisionEntity;

        // 🔹 Aqui você poderá integrar depois com:
        // - Spring Security (usuário logado)
        // - contexto da requisição
        // - headers (IP, origem, etc.)

        rev.setIdUsuario(getUsuarioLogado());
        rev.setOrigem("SISTEMA");
        rev.setIp("0.0.0.0");
    }

    private UUID getUsuarioLogado() {
        return AutenticacaoContexto.getUsuarioAtualId();
    }
}
