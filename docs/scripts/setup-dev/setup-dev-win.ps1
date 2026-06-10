# Script de configuração inicial do ambiente de desenvolvimento (Windows PowerShell)

Write-Host "Iniciando configuracao do ambiente de desenvolvimento local (HTTPS)..." -ForegroundColor Cyan

# 1. Definir URLs e caminhos
$mkcertUrl = "https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-windows-amd64.exe"
$mkcertPath = "$env:USERPROFILE\mkcert.exe"
$certsDir = "nginx\certs"

# 2. Baixar o mkcert
Write-Host "[1/3] Baixando mkcert..."
Invoke-WebRequest -Uri $mkcertUrl -OutFile $mkcertPath

# 3. Instalar a CA Local
Write-Host "[2/3] Instalando Autoridade Certificadora Local (CA)..."
Write-Host "Pressione 'Sim' se a janela de Controle de Conta de Usuario (UAC) aparecer." -ForegroundColor Yellow
& $mkcertPath -install

# 4. Gerar os certificados
Write-Host "[3/3] Gerando certificados SSL para o Nginx..."
if (!(Test-Path -Path $certsDir)) {
    New-Item -ItemType Directory -Path $certsDir | Out-Null
}

$keyFile = "$certsDir\localhost-key.pem"
$certFile = "$certsDir\localhost.pem"
& $mkcertPath -key-file $keyFile -cert-file $certFile localhost

Write-Host "✅ Configuracao concluida! O ambiente esta pronto para rodar com HTTPS." -ForegroundColor Green
Write-Host "Execute: docker compose --profile completo up -d --build" -ForegroundColor Green