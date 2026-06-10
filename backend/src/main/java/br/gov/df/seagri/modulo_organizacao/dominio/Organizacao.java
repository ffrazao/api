package br.gov.df.seagri.modulo_organizacao.dominio;

import org.hibernate.envers.Audited;

import br.gov.df.seagri.dominio_central.dominio.EntidadeBaseUUIDAuditoriaCompleta;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

@Entity
@Table(schema = "folha_ponto", name = "organizacao")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PUBLIC)
@AllArgsConstructor(access = AccessLevel.PUBLIC)
@ToString(callSuper = true, onlyExplicitlyIncluded = true)
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Audited
public class Organizacao extends EntidadeBaseUUIDAuditoriaCompleta {

    @Setter
    @Column(name = "nome", nullable = false, length = 255)
    private String nome;

    @Setter
    @Column(name = "status", nullable = false, length = 32)
    private String status;

    public Organizacao(String nome) {
        this.nome = nome;
        this.status = "ATIVO";
    }

}
