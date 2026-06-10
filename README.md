Markdown# 🛡️ SEAGRI - Infraestrutura de Identidade e Microserviços

Este repositório contém o blueprint de arquitetura para a fundação de microserviços da SEAGRI. A solução utiliza **Keycloak** para Gestão de Identidade (IAM) e **PostgreSQL** como camada de persistência, orquestrados via Docker, com foco em federação de dados **Stateless** (sem sincronismo) com o Active Directory do GDF.

## 🏗️ Arquitetura do Stack

A infraestrutura foi desenhada seguindo princípios de isolamento e resiliência:

* **Identity Provider:** Keycloak 26.0 (baseado em Quarkus).
* **Database:** PostgreSQL 16 (Alpine) com volumes segregados.
* **Federação:** Integração direta com o Catálogo Global do AD via protocolo LDAP.

---

## 🚀 Como Iniciar

### Pré-requisitos
* Docker e Docker Compose instalados.
* Portas `8080` (Keycloak) e `5432` (Postgres) liberadas.

### Instalação e Execução
1.  **Clone o repositório:**
    ```bash
    git clone ffrazao_github:ffrazao/seagri.git
    cd seagri
    ```
2.  **Provisionamento:** (Configura permissões e credenciais iniciais)
    ```bash
    chmod +x setup.sh
    ./setup.sh
    ```
3.  **Inicie o Stack:**
    ```bash
    docker-compose up -d
    ```

---

## 🔍 Guia de Engenharia Reversa: Integração AD/LDAP

Este guia permite que um analista identifique os parâmetros do Active Directory (AD) partindo do zero absoluto, utilizando apenas o terminal Ubuntu.

### 1. Localização do Domínio e Servidores

#### 1.1 Identificar o Domínio de Rede
Se o comando `nmcli` retornar apenas IPs de DNS, utilize a **Resolução Reversa** para confirmar o domínio oficial:

   # 1. Localize os IPs dos resolvedores de nomes (DNS)
    ```bash
    nmcli dev show | grep "DNS"
    ```

   # 2. Descubra o nome canônico do servidor através do IP encontrado
    ```bash
    host 10.194.250.111
    ```
Esperado: O nome retornado (ex: governo111.governo.gdfnet.df) revela que o domínio para as consultas SRV é governo.gdfnet.df.

#### 1.2 Listar Domain Controllers (DCs) e RedundânciaO AD é redundante. 
Liste todos os servidores que prestam serviço LDAP na rede:

    ```bash
    # Consulta o registro de serviço (SRV) do domínio
    dig -t SRV _ldap._tcp.governo.gdfnet.df
    ```

#### 1.3 Validar o Catálogo Global (Porta 3268)
Para que o Keycloak enxergue todos os órgãos do GDF (não apenas a SEAGRI), a porta 3268 deve estar aberta:Bash

    ```bash
    # Verifica conectividade com o Catálogo Global
    nc -zv 10.194.250.111 3268
    ```

#### 1.4 Extração do Distinguished Name (DN)
Descubra seu caminho exato na árvore hierárquica para configurar o "Bind DN":

    ```bash
    ldapsearch -H ldap://10.194.250.111 -x \
      -D "seu_usuario@governo.gdfnet.df" -W \
      -b "DC=governo,DC=gdfnet,DC=df" \
      "(sAMAccountName=seu_usuario)" dn
    ```
  
⚙️ Configuração do Keycloak (Realm Corporativo)
Configuração otimizada para segurança e tratamento de múltiplas contas por usuário.

#### 2.1 Realm corporativo - Política de Identidade
Ajuste em Realm Settings > Login:
Email as username: Off
Login with email: Off (Evita ambiguidade em usuários com múltiplas contas e mesmo e-mail).
Duplicate emails: On (Permite que contas como 15017103517 e frazao_admin coexistam com o mesmo e-mail).

#### 2.2 Federação LDAP (User Federation)
Adicione um provedor LDAP com os parâmetros técnicos validados:

|Campo|Valor Técnico|Motivação|
|---|---|---|
|Connection URL|ldap://governo.gdfnet.df:3268|Resiliência via Round Robin DNS e busca global.|
|Bind DN|ldap@governo.gdfnet.df|Conta de serviço dedicada.|
|Bind Credential|Geti1247890*|Credencial de acesso ao diretório.|
|Users DN|OU=UNIDADES,DC=governo,DC=gdfnet,DC=df|Escopo abrangente (Todos os órgãos do GDF).|
|Import Users|Off|Modo Stateless: Nenhum dado é persistido no banco local.|

#### 2.3 Mapeamento de Grupos (Roles)
Em Mappers, crie um group-ldap-mapper:
LDAP Groups DN: OU=UNIDADES,DC=governo,DC=gdfnet,DC=df
Mapped Group Attribute: cn (Isso enviará grupos como G.GETI no Token JWT).

🏗️ Lógica de Arquitetura da Solução
Autenticação Stateless: O Keycloak valida credenciais em tempo real. Se um usuário for removido do AD, seu acesso é revogado instantaneamente, sem necessidade de sincronização de bases.
Resiliência de Hostname: Ao utilizar governo.gdfnet.df na URL de conexão, o sistema automaticamente alterna entre os 4 Domain Controllers disponíveis caso um deles falhe.
Separação de Identidades: O sistema utiliza o sAMAccountName como chave única, garantindo que usuários com perfis distintos (Admin/User) sejam tratados corretamente mesmo compartilhando o mesmo e-mail institucional.


# 🛡️ SEAGRI - Infraestrutura de Identidade e Microserviços

Este repositório contém o blueprint de arquitetura para a fundação de microserviços da SEAGRI. A solução utiliza **Keycloak 26.0** e **PostgreSQL 16**, orquestrados via Docker, com federação **Stateless** (sem sincronismo) com o Active Directory do GDF e Login Social.

## 🏗️ Arquitetura do Stack

* **Identity Provider:** Keycloak (Quarkus).
* **Database:** PostgreSQL (Alpine) com volumes segregados.
* **Federação:** Integração direta com o Catálogo Global do AD (porta 3268).

---

## 🔍 Guia de Engenharia Reversa: Integração AD/LDAP

### 1. Descoberta de Infraestrutura
1. **Identificar Domínio:** Use `nmcli dev show | grep "DNS"` para obter os IPs e `host <IP>` para descobrir o domínio (ex: `governo.gdfnet.df`).
2. **Validar Catálogo Global:** Confirme a porta 3268 com `nc -zv <IP> 3268` para enxergar todos os órgãos do GDF.
3. **Localizar Distinguished Name (DN):** Utilize `ldapsearch` para identificar o caminho exato do usuário, especialmente para contas administrativas (`OU=Admins`).

---

## ⚙️ Configuração do Keycloak (Realm Corporativo)

### 2.1 Configurações do Realm
* **Email as username:** `Off`.
* **Login with email:** `Off` (Evita conflitos entre múltiplas contas do mesmo usuário).
* **Duplicate emails:** `On`.

### 2.2 Federação LDAP (User Federation)

| Campo | Valor Técnico | Motivação |
| :--- | :--- | :--- |
| **Connection URL** | `ldap://governo.gdfnet.df:3268` | Busca global e resiliência via DNS. |
| **Bind DN** | `ldap@governo.gdfnet.df` | Conta de serviço dedicada. |
| **Users DN** | `OU=UNIDADES,DC=governo,DC=gdfnet,DC=df` | Escopo total do GDF. |
| **Username Attribute** | `sAMAccountName` | Atributo de login (CPF ou nome_admin). |
| **Search Scope** | `Subtree` | Busca em sub-pastas (essencial para localizar contas Admin). |
| **Import Users** | `Off` | **Modo Stateless:** Sem persistência no banco local. |

### 2.3 Mapeamento de Grupos (Ajuste de Consistência)
Para evitar erros de árvore do AD (`GroupTreeResolveException`):
* **Preserve Group Inheritance:** `Off`.
* **Ignore Missing Groups:** `On`.
* **User Roles Retrieve Strategy:** `GET_GROUPS_FROM_USER_MEMBEROF_ATTRIBUTE`.

---

## 🌐 Integração Identity Provider (Google)

Para habilitar o login social no Realm `corporativo`:

1. **Identity Providers:** Selecione `Google` no painel do Keycloak.
2. **Redirect URI:** Copie a URL gerada pelo Keycloak e cole no Google Cloud Console (`.../broker/google/endpoint`).
3. **Credenciais:** Insira o `Client ID` e o `Client Secret` obtidos no projeto Google.
4. **Hosted Domain:** Opcionalmente, limite o login ao domínio institucional (ex: `seagri.df.gov.br`).

---

## 🏗️ Lógica de Arquitetura
* **Autenticação Stateless:** Validação em tempo real contra o AD.
* **Híbrido Social/Corporativo:** O Keycloak atua como broker, permitindo que o usuário escolha entre a conta GDF ou Google, mantendo a unicidade pelo e-mail se necessário.


Desenvolvido por `[ffrazao]` como parte da arquitetura de backend SEAGRI.
