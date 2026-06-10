# Estágio 1: Build (Compilação)
FROM gradle:8.12.1-jdk21-jammy AS builder

WORKDIR /app

# Copia apenas o necessário para baixar dependências (melhora o cache do Docker)
COPY build.gradle settings.gradle ./
COPY src ./src

# Executa o build sem rodar os testes para agilizar o processo (opcional)
RUN gradle build -x test --no-daemon

# Estágio 2: Runtime (Execução)
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

RUN mkdir -p /app/logs/access && chown -R 1000:1000 /app/logs
RUN mkdir -p /etc/secrets

# Copia apenas o .jar gerado no estágio anterior
COPY --from=builder /app/build/libs/*.jar app.jar

# Define porta e usuário (boas práticas)
EXPOSE 8081
USER 1000

# Variáveis para a JVM (ajuste conforme a RAM do seu servidor)
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-Xmx512m", "-jar", "app.jar"]
