package br.gov.df.seagri.dominio_central.infraestrutura;

import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.envers.RevisionEntity;
import org.hibernate.envers.RevisionNumber;
import org.hibernate.envers.RevisionTimestamp;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "revinfo", schema = "auditoria")
@RevisionEntity(RevisionListenerCustom.class)
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class RevisionEntityCustom {

    @Id
    @SequenceGenerator(name = "rev_seq", sequenceName = "auditoria.revinfo_id_seq", allocationSize = 1)
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "rev_seq")
    @RevisionNumber
    @EqualsAndHashCode.Include
    private Long id;

    @RevisionTimestamp
    @Column(name = "rev_timestamp", nullable = false)
    private Long revTimestamp;

    @JdbcTypeCode(SqlTypes.UUID)
    @Column(name = "id_usuario")
    private UUID idUsuario;

    @Column(name = "origem")
    private String origem;

    @Column(name = "ip")
    private String ip;

}
