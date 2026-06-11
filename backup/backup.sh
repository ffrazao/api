#!/bin/bash
DATA=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/app/backups"

# Garante que o diretório de destino dos backups exista antes de prosseguir
mkdir -p "${BACKUP_DIR}"

echo "Iniciando backup do Postgres..."
pg_dump -h banco_postgres -U ${POSTGRES_USER} ${POSTGRES_DB} | gzip > ${BACKUP_DIR}/postgres_backup_${DATA}.sql.gz

echo "Iniciando backup do Storage (SeaweedFS)..."
tar -czf ${BACKUP_DIR}/storage_seaweedfs_${DATA}.tar.gz /data_storage

echo "Backups gerados com sucesso."

# Exemplo de envio para S3 (Caso as variáveis estejam preenchidas no .env)
if [ ! -z "$S3_ENDPOINT_URL" ] && [ ! -z "$S3_BUCKET_NAME" ]; then
    echo "Enviando backups para o S3..."
    aws s3 cp ${BACKUP_DIR}/postgres_backup_${DATA}.sql.gz s3://${S3_BUCKET_NAME}/postgres/postgres_backup_${DATA}.sql.gz --endpoint-url ${S3_ENDPOINT_URL}
    aws s3 cp ${BACKUP_DIR}/storage_seaweedfs_${DATA}.tar.gz s3://${S3_BUCKET_NAME}/storage/storage_seaweedfs_${DATA}.tar.gz --endpoint-url ${S3_ENDPOINT_URL}
    echo "Transferência S3 concluída."
fi
