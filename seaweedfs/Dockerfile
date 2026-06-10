FROM chrislusf/seaweedfs:latest

# Instala gettext (para o envsubst) e postgresql-client (para rodar o CREATE TABLE)
RUN apk add --no-cache gettext postgresql-client

RUN mkdir -p /etc/seaweedfs/

# Copia os templates e o novo script de inicialização
COPY conf/filer.toml.template /etc/seaweedfs/filer.toml.template
COPY conf/s3.json.template /etc/seaweedfs/s3.json.template
COPY entrypoint.sh /entrypoint.sh

# Dá permissão de execução ao script
RUN chmod +x /entrypoint.sh

EXPOSE 8333 9333 8888

# Define o script como porta de entrada do container
ENTRYPOINT ["/entrypoint.sh"]