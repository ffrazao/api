package br.gov.df.seagri.modulo_pessoa.dominio;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import org.hibernate.envers.Audited;

@Entity
@Table(name = "contato_email", schema = "pessoa")
@PrimaryKeyJoinColumn(name = "id")
@Audited
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PUBLIC)
@AllArgsConstructor(access = AccessLevel.PUBLIC)
@ToString(callSuper = true, onlyExplicitlyIncluded = true)
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
public class ContatoEmail extends Contato {

    @Column(name = "email", nullable = false)
    private String email;

    @Column(name = "hash_email", nullable = false, unique = true)
    private String hashEmail;

    /*
     * hashEmail = email normalizado:
     * lower(trim(email))
     */
}
