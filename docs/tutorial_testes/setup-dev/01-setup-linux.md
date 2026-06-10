# Configuração do Ambiente - Linux (Ubuntu/Debian)

Este guia o orientará na geração dos certificados de segurança (HTTPS) para executar o projeto no Linux.

## Pré-requisitos
* Ter o [Docker e Docker Compose](https://docs.docker.com/engine/install/ubuntu/) instalados.
* Ter clonado o repositório do projeto na sua máquina.

## Modo Rápido (Via Script)
Se você quer configurar tudo automaticamente, criamos um script para isso:

1. Abra o terminal.
2. Navegue até a raiz do repositório do projeto: `cd caminho/para/o/seagri`
3. Dê permissão de execução ao script: `chmod +x docs/scripts/setup-dev/setup-dev-linux.sh`
4. Execute o script: `./docs/scripts/setup-dev/setup-dev-linux.sh`
5. Siga para a etapa **Iniciando o Sistema** no final desta página.

---

## Modo Manual (Passo a Passo)
Se preferir entender o que está acontecendo por baixo dos panos, siga os passos abaixo:

### Passo 1: Instalar dependências
O Firefox precisa de uma biblioteca extra para reconhecer nossos certificados.
```bash
sudo apt update
sudo apt install -y libnss3-tools wget