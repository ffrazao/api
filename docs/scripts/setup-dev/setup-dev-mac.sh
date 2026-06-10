#!/bin/bash
# Script de configuração inicial do ambiente de desenvolvimento (macOS)

echo "Iniciando configuração do ambiente de desenvolvimento local (HTTPS)..."

# 1. Verifica se o Homebrew está instalado
if ! command -v brew &> /dev/null; then
    echo "Erro: Homebrew não encontrado. Instale o Homebrew primeiro (https://brew.sh/)."
    exit 1
fi

# 2. Instalação do mkcert e nss (para o Firefox)
echo "[1/3] Instalando mkcert via Homebrew..."
brew install mkcert
brew install nss

# 3. Geração da CA local
echo "[2/3] Instalando Autoridade Certificadora Local (CA)..."
mkcert -install

# 4. Geração dos certificados do projeto
echo "[3/3] Gerando certificados SSL para o Nginx..."
mkdir -p nginx/certs
mkcert -key-file nginx/certs/localhost-key.pem -cert-file nginx/certs/localhost.pem localhost

echo "✅ Configuração concluída! O ambiente está pronto para rodar com HTTPS."
echo "Execute: docker compose --profile completo up -d --build"

