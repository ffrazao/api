#!/bin/sh
set -e

echo "1. Gerando configurações a partir das variáveis de ambiente..."
envsubst < /etc/seaweedfs/s3.json.template > /etc/seaweedfs/s3.json
envsubst < /etc/seaweedfs/filer.toml.template > /etc/seaweedfs/filer.toml

echo "2. Validando e criando estrutura de tabelas do Filer no PostgreSQL..."
# A variável PGPASSWORD permite que o psql conecte sem pedir senha interativamente
export PGPASSWORD="${S3_SEN}"

psql -h "${POSTGRES_URL}" -U "${S3_USU}" -d "${S3_BD}" -c "
CREATE TABLE IF NOT EXISTS filemeta (
  dirhash     BIGINT        NOT NULL,
  name        VARCHAR(1000) COLLATE \"C\" NOT NULL,
  directory   TEXT          NOT NULL,
  meta        BYTEA         NOT NULL,
  PRIMARY KEY (dirhash, name)
);
CREATE INDEX IF NOT EXISTS idx_filemeta_dir ON filemeta (directory);
"

echo "3. Iniciando o servidor SeaweedFS..."
# O comando 'exec' substitui o processo do shell pelo processo do weed,
# garantindo que o container trate os sinais de parada (SIGTERM) corretamente.

exec weed server \
  -dir=/data \
  -master.defaultReplication=000 \
  -master.volumePreallocate=false \
  -volume.max=10 \
  -s3 \
  -s3.config=/etc/seaweedfs/s3.json \
  -filer
