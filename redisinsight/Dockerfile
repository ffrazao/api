FROM redis/redisinsight:latest

# Expondo a porta padrão do Redis Insight
EXPOSE 5540

# Apenas criamos e damos permissão nas pastas como root antes do container subir
USER root
RUN mkdir -p /data/logs && chmod -R 777 /data && chmod -R 777 /data/logs
