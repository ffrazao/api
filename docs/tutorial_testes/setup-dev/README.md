# Configuração do Ambiente de Desenvolvimento Local (Seagri)

Bem-vindo(a) à equipe! Este guia ajudará você a configurar o seu ambiente de desenvolvimento local para o projeto Seagri.

## O que estamos configurando?
Nosso sistema é composto por vários serviços (Frontend, Backend, Banco de Dados, Keycloak para autenticação, etc.) que rodam isolados em containers usando o **Docker**. 

Para que tudo funcione de forma segura e realista (próxima ao que teremos em produção), nosso ambiente local utiliza **HTTPS**. Para que o seu navegador (Chrome, Firefox) não bloqueie o sistema com telas de alerta de segurança, precisamos gerar um certificado digital localmente na sua máquina.

## A Ferramenta: `mkcert`
Utilizamos uma ferramenta chamada `mkcert`. Ela cria uma Autoridade Certificadora (CA) falsa e a instala no seu computador. Em seguida, ela emite um certificado digital válido para o endereço `localhost`. O resultado é que você terá um "cadeado verde" de segurança mesmo desenvolvendo offline.

## Escolha o seu Sistema Operacional
Para começar, siga o passo a passo correspondente ao sistema operacional que você está utilizando:

* [Tutorial para Linux (Ubuntu/Debian)](01-setup-linux.md)
* [Tutorial para Windows](02-setup-windows.md)
* [Tutorial para macOS](03-setup-macos.md)