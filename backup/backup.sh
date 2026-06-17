#!/bin/bash

set -euo pipefail

DATA=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/app/backups"

# Garante que o diretório de destino dos backups exista
mkdir -p "${BACKUP_DIR}"

echo "========================================="
echo "Iniciando rotina de backup dinâmico..."
echo "========================================="

# Varre todas as variáveis de ambiente que terminam com _BD
for var_bd in $(env | grep '_BD=' | cut -d '=' -f1); do
    # Extrai o prefixo (ex: BACKEND, KEYCLOAK)
    prefixo="${var_bd%_BD}"

    # Pega os valores correspondentes usando indireção de variáveis
    nome_bd="${!var_bd}"
    var_usu="${prefixo}_USU"
    var_sen="${prefixo}_SEN"
    usu_bd="${!var_usu}"
    sen_bd="${!var_sen}"

    # Valida se temos as informações mínimas para o dump
    if [ -n "$nome_bd" ] && [ -n "$usu_bd" ] && [ -n "$sen_bd" ]; then
        echo "Fazendo backup do banco: $nome_bd"
        PGPASSWORD="$sen_bd" \
        pg_dump -h banco_postgres \
        -U "$usu_bd" \
        "$nome_bd" |
        gzip > "${BACKUP_DIR}/${nome_bd}_backup_${DATA}.sql.gz"
        echo "✅ Backup concluído."
    fi
done

echo "========================================="
echo "Rotina de backups finalizada."
echo "========================================="

# Exemplo de envio para S3 (Caso as variáveis estejam preenchidas no .env)
if [ -n "$S3_ENDPOINT" ] && [ -n "$S3_BUCKET" ] && [ -n "$S3_ADMIN_ACCESS_KEY" ] &&
[ -n "$S3_ADMIN_SECRET_KEY" ]; then

    export AWS_ACCESS_KEY_ID="$S3_ADMIN_ACCESS_KEY"
    export AWS_SECRET_ACCESS_KEY="$S3_ADMIN_SECRET_KEY"

    echo "Enviando arquivos de backup para o S3..."
    aws s3 cp \
        "${BACKUP_DIR}/" \
        "s3://${S3_BUCKET}/" \
        --recursive \
        --endpoint-url "${S3_ENDPOINT}" \
        --exclude "*" \
        --include "*_backup_*.sql.gz"

    echo "Transferência S3 concluída."
fi
