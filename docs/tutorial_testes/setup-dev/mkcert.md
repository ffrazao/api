A organização dos diretórios ficou excelente. Separar os scripts executáveis da documentação em texto é uma ótima prática para manter a clareza do repositório.

Para estruturar a pasta `docs/tutorial_testes/setup-dev`, recomendo criarmos quatro arquivos Markdown (`.md`). Um arquivo principal (README) para dar o contexto geral ao novo desenvolvedor, e um arquivo específico para cada sistema operacional.

Abaixo, apresento o conteúdo sugerido para cada um desses arquivos. Eles foram redigidos com foco didático, pensando em um desenvolvedor júnior.

---

### Arquivo 1: `docs/tutorial_testes/setup-dev/README.md`

**Título:** Visão Geral: Configuração do Ambiente de Desenvolvimento

```markdown
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

```

---

### Arquivo 2: `docs/tutorial_testes/setup-dev/01-setup-linux.md`

**Título:** Tutorial de Setup - Linux

```markdown
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

```

### Passo 2: Instalar o `mkcert`

Baixe e mova o programa para a pasta de binários do seu Linux.

```bash
wget -O mkcert [https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-linux-amd64](https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-linux-amd64)
chmod +x mkcert
sudo mv mkcert /usr/local/bin/

```

### Passo 3: Criar a Autoridade Certificadora

Este comando instala o `mkcert` como uma entidade confiável no seu computador.

```bash
mkcert -install

```

### Passo 4: Gerar os certificados do Projeto

Navegue até a **raiz do repositório** do projeto e crie a pasta onde o Nginx (nosso servidor) vai ler os certificados:

```bash
mkdir -p nginx/certs
mkcert -key-file nginx/certs/localhost-key.pem -cert-file nginx/certs/localhost.pem localhost

```

---

## Iniciando o Sistema

Com os certificados gerados na pasta correta, basta subir a infraestrutura:

1. Na raiz do projeto, execute:
```bash
docker compose --profile completo up -d --build

```


2. Aguarde os containers inicializarem (o Keycloak pode levar alguns segundos).
3. Abra o navegador e acesse: `https://localhost`

Você deverá ver a tela do sistema com o cadeado de segurança verde ativado!

```

---

### Arquivo 3: `docs/tutorial_testes/setup-dev/02-setup-windows.md`

**Título:** Tutorial de Setup - Windows

```markdown
# Configuração do Ambiente - Windows

Este guia o orientará na geração dos certificados de segurança (HTTPS) para executar o projeto no Windows.

## Pré-requisitos
* Ter o [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e rodando.
* Ter clonado o repositório do projeto na sua máquina.
* Abrir o **PowerShell** como Administrador.

## Modo Rápido (Via Script)
Nós possuímos um script automatizado para o Windows.

1. Abra o PowerShell como Administrador.
2. Navegue até a raiz do repositório do projeto: `cd caminho\para\o\seagri`
3. Execute o script: 
   ```powershell
   .\docs\scripts\setup-dev\setup-dev-win.ps1

```

*(Nota: Se o Windows bloquear a execução, rode `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` antes).*
4. Se o Windows exibir um aviso de segurança perguntando se você confia no certificado, clique em **Sim**.
5. Siga para a etapa **Iniciando o Sistema** no final desta página.

---

## Modo Manual (Passo a Passo)

### Passo 1: Instalar o Gerenciador de Pacotes Scoop ou Chocolatey

A forma mais segura de instalar o `mkcert` no Windows é via gerenciador de pacotes. Se você usa o **Scoop**:

```powershell
scoop bucket add extras
scoop install mkcert

```

Se você usa o **Chocolatey**:

```powershell
choco install mkcert

```

### Passo 2: Criar a Autoridade Certificadora

Execute o comando abaixo. O Windows mostrará uma tela de confirmação (UAC) perguntando se você deseja instalar o certificado raiz. **Clique em Sim**.

```powershell
mkcert -install

```

### Passo 3: Gerar os certificados do Projeto

Navegue até a **raiz do repositório** do projeto usando o terminal e crie a pasta necessária:

```powershell
mkdir nginx\certs
mkcert -key-file nginx\certs\localhost-key.pem -cert-file nginx\certs\localhost.pem localhost

```

---

## Iniciando o Sistema

Com os certificados gerados na pasta correta, inicie a infraestrutura:

1. No terminal, na raiz do projeto, execute:
```bash
docker compose --profile completo up -d --build

```


2. Abra o navegador e acesse: `https://localhost`

O sistema carregará com o cadeado de segurança ativado!

```

---

### Arquivo 4: `docs/tutorial_testes/setup-dev/03-setup-macos.md`

**Título:** Tutorial de Setup - macOS

```markdown
# Configuração do Ambiente - macOS

Este guia o orientará na geração dos certificados de segurança (HTTPS) para executar o projeto no Mac.

## Pré-requisitos
* Ter o [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado.
* Ter o [Homebrew](https://brew.sh/) instalado no seu Mac.
* Ter clonado o repositório do projeto.

## Modo Rápido (Via Script)
1. Abra o Terminal.
2. Navegue até a raiz do repositório: `cd caminho/para/o/seagri`
3. Dê permissão ao script: `chmod +x docs/scripts/setup-dev/setup-dev-mac.sh`
4. Execute: `./docs/scripts/setup-dev/setup-dev-mac.sh`
5. Pule para a etapa **Iniciando o Sistema**.

---

## Modo Manual (Passo a Passo)

### Passo 1: Instalar o `mkcert` via Homebrew
O Homebrew gerencia a instalação de forma limpa no ecossistema Apple. O `nss` é necessário caso você utilize o navegador Firefox.
```bash
brew install mkcert
brew install nss

```

### Passo 2: Criar a Autoridade Certificadora

Este comando registra o `mkcert` no `Keychain` (Acesso a Chaves) do seu Mac. Pode ser necessário digitar a senha do seu usuário do Mac ou usar o TouchID.

```bash
mkcert -install

```

### Passo 3: Gerar os certificados do Projeto

Navegue até a **raiz do repositório** do projeto no Terminal e crie a pasta para o Nginx:

```bash
mkdir -p nginx/certs
mkcert -key-file nginx/certs/localhost-key.pem -cert-file nginx/certs/localhost.pem localhost

```

---

## Iniciando o Sistema

Para subir a infraestrutura completa:

1. Certifique-se de que o Docker Desktop está aberto e rodando.
2. Na raiz do projeto, execute:
```bash
docker compose --profile completo up -d --build

```


3. Aguarde a inicialização e acesse no Safari ou Chrome: `https://localhost`

Se tudo correu bem, não haverá avisos de privacidade e o site abrirá com segurança máxima local.

```

---

Esses documentos cobrem o essencial para integrar um novo desenvolvedor à arquitetura segura que criamos. O que achou do nível de detalhe e da clareza das instruções para o público júnior?

```