package br.gov.df.seagri.modulo_pessoa.dominio;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import org.hibernate.envers.Audited;

@Entity
@Table(name = "contato_telefone", schema = "pessoa")
@PrimaryKeyJoinColumn(name = "id")
@Audited
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PUBLIC)
@AllArgsConstructor(access = AccessLevel.PUBLIC)
@ToString(callSuper = true, onlyExplicitlyIncluded = true)
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
public class ContatoTelefone extends Contato {

    @Column(name = "numero", nullable = false)
    private String numero;

    @Column(name = "hash_numero", nullable = false, unique = true)
    private String hashNumero;

    /*
     * hashNumero = versão normalizada:
     * remove máscara, espaços, etc.
     * ex: +5561999999999
     */
}
