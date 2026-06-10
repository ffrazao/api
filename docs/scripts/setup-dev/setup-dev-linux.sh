#!/bin/bash
# Script de configuração inicial do ambiente de desenvolvimento (Linux/Ubuntu)
# Agnóstico a arquitetura + suporte a IP público

set -e

echo "🚀 Iniciando configuração do ambiente de desenvolvimento (HTTPS)..."

# ====================== 1. Dependências ======================
echo "[1/4] Verificando dependências..."
sudo apt update -qq
sudo apt install -y libnss3-tools wget curl

# ====================== 2. Arquitetura ======================
echo "[2/4] Detectando arquitetura..."
ARCH=$(uname -m)
case $ARCH in
    x86_64|amd64)  MKCERT_ARCH="amd64" ;;
    aarch64|arm64) MKCERT_ARCH="arm64" ;;
    armv7l|arm)    MKCERT_ARCH="arm" ;;
    *) echo "❌ Arquitetura não suportada: $ARCH"; exit 1 ;;
esac
echo "   → Arquitetura: $ARCH"

# ====================== 3. mkcert ======================
echo "[3/4] Instalando/verificando mkcert..."
if ! command -v mkcert >/dev/null 2>&1; then
    MKCERT_URL="https://dl.filippo.io/mkcert/latest?for=linux/${MKCERT_ARCH}"
    wget -q --show-progress -O /tmp/mkcert "${MKCERT_URL}"
    chmod +x /tmp/mkcert
    sudo mv /tmp/mkcert /usr/local/bin/mkcert
    echo "   → mkcert instalado ($(mkcert -version))"
else
    echo "   → mkcert já está instalado ($(mkcert -version))"
fi

# ====================== 4. CA Local ======================
echo "[4/4] Autoridade Certificadora Local..."
mkcert -install

# ====================== 5. IPs ======================
echo "   Detectando IPs..."

INTERNAL_IP=$(ip route get 1 2>/dev/null | awk '{print $7}' | head -n1 || hostname -I | awk '{print $1}')
PUBLIC_IP=$(curl -s --max-time 4 ifconfig.me 2>/dev/null || curl -s --max-time 4 icanhazip.com 2>/dev/null || echo "")

echo "   → IP Interno : ${INTERNAL_IP:-não detectado}"
[ -n "$PUBLIC_IP" ] && echo "   → IP Público : $PUBLIC_IP"

# ====================== 6. Nomes do certificado ======================
NAMES="localhost $INTERNAL_IP"

if [ -n "$1" ]; then
    NAMES="$NAMES $1"
    echo "   → IP Público adicionado via argumento: $1"
else
    echo "   💡 Dica: Use './setup-dev-linux.sh SEU_IP_PUBLICO' para incluir IP externo"
fi

# ====================== 7. Gerar certificados ======================
echo "   Gerando certificados SSL..."
CERT_DIR="nginx/certs"
mkdir -p "$CERT_DIR"
sudo chown -R "$USER:$USER" "$CERT_DIR" 2>/dev/null || true
rm -f "$CERT_DIR/ip-key.pem" "$CERT_DIR/ip-cert.pem" 2>/dev/null || true

mkcert -key-file "$CERT_DIR/ip-key.pem" \
       -cert-file "$CERT_DIR/ip-cert.pem" \
       $NAMES

# ====================== 8. Ajuste de Permissões ======================
echo "   Ajustando permissões para o Docker..."
# Executado sem sudo para manter o seu usuário como dono dos arquivos (.pem/.key)
chmod 755 "$CERT_DIR"
chmod 644 "$CERT_DIR"/*

echo ""
echo "✅ Configuração concluída com sucesso!"
echo "   Nomes incluídos → $NAMES"
echo "   Certificados em → $CERT_DIR"
echo ""
echo "Próximo passo:"
echo "   docker compose --profile completo up -d --build"