
-- =========================================
-- FUNÇÕES BÁSICAS NO SCHEMA PUBLIC
-- =========================================

-- CRIAR TABELAS DE AUDITORIA

CREATE OR REPLACE FUNCTION gerar_ddl_auditoria(p_esquema TEXT, p_tabela TEXT)
RETURNS TEXT AS $$
DECLARE
    v_ddl TEXT;
    v_coluna RECORD;
    v_tipo_id TEXT;
BEGIN
    -- Descobrir o tipo do ID (BIGINT, UUID, etc)
    SELECT CASE WHEN data_type = 'USER-DEFINED' THEN udt_schema || '.' || udt_name ELSE data_type END
      INTO v_tipo_id
      FROM information_schema.columns
     WHERE table_schema = p_esquema AND table_name = p_tabela AND column_name = 'id';

    v_ddl := 'CREATE TABLE ' || p_esquema || '.' || p_tabela || '_aud (' || E'\n';
    v_ddl := v_ddl || '    id ' || v_tipo_id || ' NOT NULL,' || E'\n';
    v_ddl := v_ddl || '    rev BIGINT NOT NULL,' || E'\n';
    v_ddl := v_ddl || '    revtype SMALLINT,' || E'\n';

    -- Buscar todas as colunas originais (excluindo ID e relaxando restrições)
    FOR v_coluna IN
        SELECT column_name,
               CASE WHEN data_type = 'USER-DEFINED' THEN udt_schema || '.' || udt_name ELSE data_type END as tipo_dado,
               character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = p_esquema AND table_name = p_tabela AND column_name != 'id'
        ORDER BY ordinal_position
    LOOP
        v_ddl := v_ddl || '    ' || v_coluna.column_name || ' ' || v_coluna.tipo_dado;
        IF v_coluna.character_maximum_length IS NOT NULL AND v_coluna.tipo_dado = 'character varying' THEN
            v_ddl := v_ddl || '(' || v_coluna.character_maximum_length || ')';
        END IF;
        v_ddl := v_ddl || ',' || E'\n';
    END LOOP;

    -- Colunas da Estratégia de Validade (ValidityAuditStrategy)
    v_ddl := v_ddl || '    rev_end BIGINT,' || E'\n';
    v_ddl := v_ddl || '    revend_tstmp TIMESTAMP,' || E'\n';

    -- Chaves
    v_ddl := v_ddl || '    CONSTRAINT ' || p_tabela || '_aud_pkey PRIMARY KEY (id, rev),' || E'\n';
    v_ddl := v_ddl || '    CONSTRAINT fk_' || p_tabela || '_aud_rev FOREIGN KEY (rev) REFERENCES auditoria.revinfo(id)' || E'\n';
    v_ddl := v_ddl || ');' || E'\n';

    RETURN v_ddl;
END;
$$ LANGUAGE plpgsql;