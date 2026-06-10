#!/bin/bash
set -e

echo "========================================="
echo "Script de inicialização dinâmica"
echo "========================================="

# Localiza o arquivo .env
ENV_FILE=""
if [ -f "/docker-entrypoint-initdb.d/.env" ]; then
    ENV_FILE="/docker-entrypoint-initdb.d/.env"
elif [ -f "/.env" ]; then
    ENV_FILE="/.env"
else
    echo "ERRO: Arquivo .env não encontrado!"
    exit 1
fi

echo "📄 Usando arquivo .env: $ENV_FILE"

# Função para extrair valores do .env (remove aspas e espaços)
get_env_value() {
    grep -F "${1}=" "$ENV_FILE" | tail -1 | cut -d '=' -f2- | sed 's/^["\x27]//; s/["\x27]$//' | xargs
}

# Encontra todos os prefixos únicos (tudo antes de _BD, _USU ou _SEN)
echo "🔍 Analisando arquivo .env..."

# Extrai todos os prefixos das variáveis que terminam com _BD
PREFIXOS=$(grep -oE '^[A-Za-z0-9_]+_BD=' "$ENV_FILE" | sed 's/_BD=//' | sort -u)

if [ -z "$PREFIXOS" ]; then
    echo "⚠️  Nenhum conjunto de variáveis (_BD, _USU, _SEN) encontrado no .env"
    exit 0
fi

echo "📋 Prefixos encontrados: $PREFIXOS"

# Cria um arquivo SQL temporário
SQL_FILE="/tmp/dynamic-init.sql"
echo "-- Script gerado dinamicamente em $(date)" > "$SQL_FILE"
echo "-- Baseado no arquivo .env" >> "$SQL_FILE"
echo "" >> "$SQL_FILE"

# Adiciona criação de usuários (pode ficar dentro de DO)
cat >> "$SQL_FILE" << 'EOF'
-- Criação de usuários
DO $$
BEGIN

EOF

# Processa cada prefixo para criar usuários
for PREFIXO in $PREFIXOS; do
    USU_NAME=$(get_env_value "${PREFIXO}_USU")
    SEN_NAME=$(get_env_value "${PREFIXO}_SEN")
    BD_NAME=$(get_env_value "${PREFIXO}_BD")

    if [ -n "$USU_NAME" ] && [ -n "$SEN_NAME" ]; then
        cat >> "$SQL_FILE" << EOF
    -- Usuário para $PREFIXO
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$USU_NAME') THEN
        CREATE USER "$USU_NAME" WITH LOGIN PASSWORD '$SEN_NAME';
        RAISE NOTICE '✓ Usuário $USU_NAME criado';
    ELSE
        RAISE NOTICE 'ℹ Usuário $USU_NAME já existe';
    END IF;
EOF
    fi
done

# Fecha o bloco DO
cat >> "$SQL_FILE" << 'EOF'
END $$;
EOF

# Adiciona criação de bancos (fora do DO)
for PREFIXO in $PREFIXOS; do
    BD_NAME=$(get_env_value "${PREFIXO}_BD")
    USU_NAME=$(get_env_value "${PREFIXO}_USU")

    if [ -n "$BD_NAME" ] && [ -n "$USU_NAME" ]; then
        cat >> "$SQL_FILE" << EOF


-- Banco para $PREFIXO
SELECT 'CREATE DATABASE "$BD_NAME" LOCALE_PROVIDER icu ICU_LOCALE ''pt-BR'' ENCODING ''UTF8'' TEMPLATE template0'
WHERE NOT EXISTS (
    SELECT FROM pg_database WHERE datname = '$BD_NAME'
)\gexec

-- Conceder privilégios no banco
GRANT ALL PRIVILEGES ON DATABASE "$BD_NAME" TO "$USU_NAME";
EOF
    fi
done

# Adiciona privilégios no schema public para cada banco
for PREFIXO in $PREFIXOS; do
    BD_NAME=$(get_env_value "${PREFIXO}_BD")
    USU_NAME=$(get_env_value "${PREFIXO}_USU")

    if [ -n "$BD_NAME" ] && [ -n "$USU_NAME" ]; then
        cat >> "$SQL_FILE" << EOF

-- Privilégios para $BD_NAME
\c "$BD_NAME"
GRANT ALL ON SCHEMA public TO "$USU_NAME";
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "$USU_NAME";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "$USU_NAME";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "$USU_NAME";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO "$USU_NAME";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS unaccent;

EOF
    fi
done

# Volta para o banco postgres e mostra resumo
cat >> "$SQL_FILE" << 'EOF'

\c postgres
DO $$
DECLARE
    bancos_criados text := '';
    usuarios_criados text := '';
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE '✅ Inicialização concluída com sucesso!';
    RAISE NOTICE '=========================================';
END $$;
EOF

echo ""
echo "📝 Script SQL gerado:"
echo "-----------------------------------"
cat "$SQL_FILE"
echo "-----------------------------------"

# Executa o script SQL
echo ""
echo "🚀 Executando script SQL..."
psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER:-postgres}" --dbname "${POSTGRES_DB:-postgres}" -f "$SQL_FILE"

echo ""
echo "✅ Script de inicialização concluído!"
