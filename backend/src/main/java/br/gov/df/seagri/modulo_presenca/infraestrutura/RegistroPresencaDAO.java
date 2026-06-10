package br.gov.df.seagri.modulo_presenca.infraestrutura;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import br.gov.df.seagri.dominio_central.infraestrutura.RepositorioSomenteInclusao;
import br.gov.df.seagri.modulo_presenca.dominio.RegistroPresenca;

@Repository
public interface RegistroPresencaDAO
        extends RepositorioSomenteInclusao<RegistroPresenca, Long>, JpaSpecificationExecutor<RegistroPresenca> {

    // A anotação @Query instrui o Hibernate a fazer o SELECT ordenando do mais
    // recente para o mais antigo [1]
    @Query("SELECT r FROM RegistroPresenca r JOIN FETCH r.organizacao JOIN FETCH r.unidade WHERE r.keycloakSub = :keycloakSub ORDER BY r.capturadoEm DESC")
    List<RegistroPresenca> buscarPorKeycloakSub(@Param("keycloakSub") UUID keycloakSub);

}
