package br.gov.df.seagri.dominio_central.aplicacao;

import br.gov.df.seagri.dominio_central.dominio.PertenceOrganizacao;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class ValidadorTenant {

    public void validarPertencimento(PertenceOrganizacao entidade, UUID organizacaoIdEsperada) {
        // Atualizado para chamar o novo nome do método
        if (!entidade.obterOrganizacaoId().equals(organizacaoIdEsperada)) {
            throw new SecurityException("Violação de Isolamento (Multi-Tenant): Recurso não pertence a esta organização.");
        }
    }
}