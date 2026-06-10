-- =========================================
-- SCHEMA
-- =========================================
CREATE SCHEMA IF NOT EXISTS auditoria;
SET search_path TO auditoria;

-- =========================================
-- TABELA DE REVISÃO (ENVERS)
-- =========================================
CREATE SEQUENCE revinfo_id_seq;

CREATE TABLE revinfo (
    id BIGINT PRIMARY KEY DEFAULT nextval('auditoria.revinfo_id_seq'),
    rev_timestamp BIGINT NOT NULL,
    id_usuario UUID,
    ip TEXT,
    origem TEXT
);
