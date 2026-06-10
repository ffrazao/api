package br.gov.df.seagri.dominio_central.dominio;

import java.io.Serializable;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.Transient;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.EqualsAndHashCode;
import lombok.experimental.SuperBuilder;

@MappedSuperclass
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@ToString(onlyExplicitlyIncluded = true)
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public abstract class EntidadeBase<ID extends Serializable> implements Serializable {

    private static final long serialVersionUID = 1L;

    public abstract ID getId();

    public abstract void setId(ID id);

    @Transient
    public boolean isNova() {
        return getId() == null;
    }

}
