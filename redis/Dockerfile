FROM redis:7

# Cria diretórios necessários
RUN mkdir -p /data /var/log/redis

# Permissões (importante se rodar como usuário não-root depois)
RUN chown -R redis:redis /data /var/log/redis

# Define usuário padrão do Redis
USER redis

# Porta padrão
EXPOSE 6379