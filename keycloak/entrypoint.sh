#!/bin/sh
set -e

# Garante que o binário e bibliotecas copiados sejam encontrados
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/lib64
export PATH=$PATH:/usr/local/bin

TARGET_DIR="${1:-/opt/keycloak/data/import}"

echo "Iniciando processamento de templates em: $TARGET_DIR"

if [ ! -d "$TARGET_DIR" ]; then
    echo "ERRO: Diretório não encontrado: $TARGET_DIR"
    exit 1
fi

# Itera sobre todos os arquivos .json
for file in "$TARGET_DIR"/*.json; do
    [ -e "$file" ] || continue
    
    FILENAME=$(basename "$file")
    echo "Processando variáveis em: $FILENAME"
    
    # Substituição atômica in-place
    envsubst < "$file" > "$file.tmp"
    mv "$file.tmp" "$file"

    # Exibe o conteúdo apenas se o modo debug estiver ativo
    # Isso evita exposição de segredos em logs de produção
    if [ "$DEBUG_CONFIG" = "true" ]; then
        echo "----------------------------------------------------------"
        echo "CONTEÚDO PROCESSADO: $FILENAME"
        cat "$file"
        echo -e "\n----------------------------------------------------------"
    fi
done

echo "Substituição concluída com sucesso."

# Remove o primeiro parâmetro (o diretório) da lista
shift 1

# Executa o comando final (ex: kc.sh ...)
exec "$@"