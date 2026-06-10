# Tutorial: Autenticação e Consumo da API via cURL

Este documento detalha como simular o fluxo de um aplicativo cliente (Mobile ou Web), autenticando-se no Keycloak para obter um Token JWT e, em seguida, consumindo a API protegida do SEAGRI.

## Arquitetura de Portas
* **Porta 8080:** Identity Provider (Keycloak) - Responsável por validar usuário/senha e emitir o Token.
* **Porta 8081:** Resource Server (API Spring Boot) - Recebe o Token, valida a assinatura e executa a regra de negócio.

---

## Passo 1: Gerar o Token JWT (Login no Keycloak)

Para obter o token sem precisar de um navegador (simulando uma requisição de backend ou app), utilizaremos o fluxo `password` (Resource Owner Password Credentials).

Execute o comando abaixo no seu terminal, substituindo os dados pelas suas credenciais reais do Active Directory/Keycloak:

```bash
curl -X POST "http://localhost:8080/realms/corporativo/protocol/openid-connect/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "client_id=account" \
     -d "grant_type=password" \
     -d "username=SEU_USUARIO" \
     -d "password=SUA_SENHA"
Nota: O client_id utilizado aqui foi o account (um cliente público padrão do Keycloak). Se você criou um client específico para o aplicativo mobile ou web (ex: seagri-mobile), substitua-o.
Resposta Esperada: O Keycloak retornará um JSON contendo o access_token (uma string longa). É esse token que comprova quem você é.
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCIg...",
  "expires_in": 300,
  "refresh_expires_in": 1800,
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5c...",
  "token_type": "Bearer",
  "not-before-policy": 0,
  "session_state": "e3b8...",
  "scope": "email profile"
}

Exemplo:

curl -X POST "http://localhost:8080/realms/corporativo/protocol/openid-connect/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "client_id=account" \
     -d "grant_type=password" \
     -d "username=15017103517" \
     -d "password=SeagriSeagri@!"
