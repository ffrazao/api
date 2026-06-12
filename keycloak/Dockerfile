# Estágio 1: Builder usando UBI (compatível com a base do Keycloak)
FROM registry.access.redhat.com/ubi9/ubi-minimal AS builder

# Instala o gettext (que contém o envsubst) de forma nativa na arquitetura RHEL
RUN microdnf install -y gettext && microdnf clean all

# Estágio 2: Imagem Final do Keycloak
FROM quay.io/keycloak/keycloak:26.0

USER root

# Copia o binário do envsubst e as bibliotecas compartilhadas (glibc) do builder
COPY --from=builder /usr/bin/envsubst /usr/local/bin/envsubst
COPY --from=builder /usr/lib64/libintl.so* /usr/lib64/
COPY --from=builder /usr/lib64/libunistring.so* /usr/lib64/

# Prepara os diretórios de dados, importação e logs com as permissões corretas
RUN mkdir -p /opt/keycloak/data/import /opt/keycloak/logs && \
    chown -R keycloak:keycloak /opt/keycloak/data /opt/keycloak/logs

WORKDIR /opt/keycloak

# Copia os arquivos de configuração (Templates JSON)
COPY data/import/*.json /opt/keycloak/data/import/

# Copia o script de orquestração de runtime
COPY entrypoint.sh /opt/keycloak/bin/entrypoint.sh

# Ajusta permissões e garante que o usuário keycloak seja o dono de tudo
RUN chmod +x /opt/keycloak/bin/entrypoint.sh && \
    chown keycloak:keycloak /opt/keycloak/bin/entrypoint.sh && \
    chown -R keycloak:keycloak /opt/keycloak/data/import && \
    chown -R keycloak:keycloak /opt/keycloak/logs

# Retorna para o usuário sem privilégios (Segurança de Runtime)
USER keycloak

EXPOSE 8080

# O entrypoint agora é o nosso script, que processa variáveis antes do binário principal
ENTRYPOINT ["/opt/keycloak/bin/entrypoint.sh", "/opt/keycloak/data/import"]

# Argumentos passados para o exec "$@" dentro do entrypoint.sh
CMD ["/opt/keycloak/bin/kc.sh", "start-dev", "--import-realm"]
