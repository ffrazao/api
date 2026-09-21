# CLAUDE.md

Este arquivo orienta o Claude Code (claude.ai/code) ao trabalhar com o código deste repositório.

## Visão geral do repositório

Este é o monorepo do **SEAGRI**, uma plataforma multi-tenant de gestão de
presença/jornada ("gestão de presença") para uma secretaria do governo brasileiro,
com check-in por biometria facial. Ele é composto por serviços independentes
orquestrados pelo `docker-compose.yml` na raiz:

| Diretório | Serviço (nome no compose) | Stack | Finalidade |
|---|---|---|---|
| `backend/` | `backend` | Java 21 / Spring Boot 3.5 (Gradle) | API REST principal |
| `facenet/` | `biometria` | Python 3.11 / FastAPI / DeepFace | Microsserviço de extração e comparação de embeddings faciais |
| `frontend-web/` | `frontend-web` | React 19 + Vite, JS puro | Frontend web **ativo**, ligado no docker-compose |
| `frontend-web-novo/` | *(ainda não está no compose)* | React 19 + TS + Vite + Tailwind + Zustand + TanStack Query | Reescrita em andamento do `frontend-web`, ainda não implantada |
| `fotografo-de-faces/` | *(pacote npm independente)* | React + TS + Vite + face-api.js | Componente publicável (`@ffrazao/fotografo-de-faces`) para captura facial assistida no cliente; publicado no GitHub Packages em tags `v*` via `.github/workflows/publish.yml` |
| `keycloak/` | `iam` | Keycloak 26 (Quarkus) | Provedor de identidade, federa com o Active Directory do GDF via LDAP e login social do Google |
| `postgres/` | `banco` | PostgreSQL 16 (Alpine) | Armazenamento de dados principal |
| `redis/` + `redisinsight/` | `cache` / `cacheview` | Redis | Backend de cache do Spring + UI de administração |
| `seaweedfs/` | `storage` | SeaweedFS | Armazenamento de objetos compatível com S3 para fotos biométricas |
| `nginx/` | `proxy` | Nginx | Proxy reverso na frente do frontend/backend |
| `backup/` | `backup` | sidecar | Job de backup do banco e do armazenamento de objetos |

Não presuma que o `frontend-web-novo` é o frontend em produção só porque é mais
novo — o `frontend-web` é o que está de fato implantado (veja o serviço
`frontend-web` no `docker-compose.yml` e o `depends_on` do `proxy`).

## Executando a stack

As versões das ferramentas estão fixadas em `.tool-versions` (asdf/mise):
`java openjdk-21`, `nodejs 26.0.0`, `gradle 8.12.1`, `python 3.11`.

- Apenas infraestrutura básica (db/storage/cache/IAM): `docker-compose up -d`
- Stack completa (adiciona `biometria`, `backend`, `frontend-web`, `proxy`,
  `backup`, todos atrás do profile `completo`): `docker-compose --profile completo up -d`
- As variáveis de ambiente vêm de `.env` (copie a partir de `.env.example`) mais
  `.env.docker`; ambos são carregados pelo `env_file` de cada serviço. O backend
  também carrega o `.env` diretamente via `DotenvEnvironmentPostProcessor` quando
  executado fora do Docker.

### Backend (`backend/`)

- Executar: `./gradlew bootRun` (usa `application-dev.yml` quando
  `SPRING_PROFILES_ACTIVE` não está definida)
- Executar com debug remoto (porta 5005): `./gradlew bootRunDebug`
- Build: `./gradlew build`
- Testes: `./gradlew test` (JUnit 5 via `useJUnitPlatform()`; atualmente não existe
  árvore `src/test`, então isso é um no-op até que testes sejam adicionados)
- As migrações do Flyway ficam em `src/main/resources/db/migration` (`V1`..`V5`);
  o `ddl-auto` do Hibernate é `validate` — mudanças de schema precisam passar por
  uma nova migração, nunca apenas por mudanças em entidades/anotações.

### Serviço Python de biometria (`facenet/`)

- Execução local: `pip install -r requirements.txt -c constraints.txt && uvicorn main:app --host 0.0.0.0 --port 8000 --reload`
- Todos os endpoints ficam sob `/api/v1/biometria/*` (`extract`, `compare_file`,
  `compare_template`, `compare`), além de `/health`.

### `frontend-web/` e `frontend-web-novo/`

- `npm install`, `npm run dev`, `npm run build`, `npm run lint`
- `frontend-web` faz lint com ESLint (`eslint .`); `frontend-web-novo` usa `oxlint`
  e compila com `tsc -b` antes do `vite build`.
- Nenhum dos dois tem atualmente um script `test`.

### `fotografo-de-faces/` (biblioteca de componentes)

- `npm ci`, `npm run lint` (oxlint), `npm run test` (vitest run), `npm run test:watch`
- `npm run build` gera o bundle publicável da lib (`tsc -b && vite build --config
  vite.lib.config.ts`); `npm run build:demo` gera a aplicação de demonstração
  (sem Storybook).
- `npm run storybook` / `npm run build-storybook` para o playground de componentes.
- `npm run download:models` baixa os pesos do modelo do face-api.js para
  `public/models` — necessário antes de rodar Storybook/testes/demo localmente,
  já que o pacote publicado inclui os pesos, mas o checkout do repositório não.
- O CI (`.github/workflows/publish.yml`) publica no GitHub Packages em tags `v*`;
  ele exige Node 24+ (jsdom/undici na cadeia de testes precisam de Node ≥20.20.2,
  e o workflow padroniza na LTS ativa).

## Arquitetura do backend (`backend/src/main/java/br/gov/df/seagri/`)

O backend é um monolito modular em Spring Boot, organizado **por módulo de
domínio**, e não por camada técnica no nível superior. Cada pacote `modulo_*`
segue internamente o padrão `dominio` (entidades JPA) / `aplicacao` (services,
com sufixo `*Srv`) / `infraestrutura` (repositórios Spring Data, com sufixo
`*DAO`) / `web` (`*Controller` + `web/dto` records/mappers via MapStruct).

- `dominio_central/` — núcleo compartilhado do qual todo módulo depende. Peças
  principais:
  - Hierarquia `EntidadeBase*` — `@MappedSuperclass`es base combinando a
    estratégia de id (`Long` vs `UUID`), rastreamento de criação
    (`RastreavelCriacao`) e rastreamento completo de auditoria
    (`AuditoriaCompleta`, apoiado no Hibernate Envers com `ValidityAuditStrategy`
    — ver as tabelas `_aud` e as colunas `rev`/`rev_end` configuradas em
    `application.yml`).
  - `CrudSrv`/`BaseCrudSrv` e `CrudTenantSrv`/`BaseCrudTenantSrv` — contratos
    genéricos de serviço CRUD; as variantes `Tenant` adicionalmente restringem
    toda operação a uma `Organizacao` (ver `ValidadorTenant`).
  - `AbstractCrudController`/`AbstractCrudTenantController` — controllers REST
    genéricos que novos controllers de recurso devem estender (veja
    `modulo_organizacao/web/UnidadeController.java` para o padrão: estender
    `AbstractCrudTenantController<Entity, RequestDTO, ResponseDTO, IdType>` e
    sobrescrever `vincularContexto(...)` para lógica de criação específica da
    entidade).
  - `web/config/` — `SecurityConfig` (resource server OAuth2 contra o Keycloak),
    `CustomJwtAuthenticationConverter`/`AutenticacaoContexto`/
    `BusinessPrincipalToken` (mapeia claims do JWT para o contexto de usuário
    autenticado da aplicação), `AutorizacaoTenantInterceptor` (garante o
    escopo por tenant em cada requisição), `GlobalExceptionHandler`,
    `WebMvcConfig`, `CorsProperties`.
  - `ArmazenamentoFotoSrv` — abstração de armazenamento com as implementações
    `LocalArmazenamentoFotoSrv` e `S3StorageArmazenamentoFotoSrv` (SeaweedFS via
    o AWS S3 SDK) para as fotos biométricas.
- `modulo_organizacao/` — tenants (`Organizacao`), `Unidade` (unidades
  organizacionais), `VinculoUsuario` (vínculos de usuário com a organização),
  convites (`Convite`).
- `modulo_pessoa/` — pessoas (`Pessoa`, `PessoaFisica`/`PessoaJuridica`),
  contatos, relacionamentos, endereços.
- `modulo_presenca/` — registros de presença/jornada
  (`RegistroPresencaController`).
- `modulo_seguranca/` — onboarding no Keycloak (`OnboardingSrv`),
  `IdentidadeAcesso`, e `PerfilBiometrico` (liga a identidade de uma pessoa ao
  seu template facial armazenado via o serviço `biometria`).

As rotas REST seguem `/api/v1/...`, com recursos com escopo de tenant aninhados
sob `/api/v1/orgs/{organizacaoId}/...` (a variável de path `organizacaoId` é
consumida por `AbstractCrudTenantController`).

## Documentação de domínio

`docs/rfcs/` e `docs/nova fase - conceitos e regras/` contêm um grande conjunto
de RFCs e especificações de domínio (bounded contexts, taxonomia de eventos,
regras temporais/de jornada, estratégia de event-sourcing/CQRS, modelo de
autorização). Eles descrevem a arquitetura alvo/aspiracional para o domínio de
presença/jornada com muito mais profundidade do que o que está atualmente
implementado em `backend/` — trate-os como material de referência de domínio ao
trabalhar em regras de jornada, não como uma descrição do código atual.

## Fluxo de trabalho preferido

- **Commits representam blocos de trabalho completos.** Evite commits fragmentados
  ou intermediários; agrupe um conjunto coerente de mudanças antes de commitar.
- **Mudanças de documentação são separadas de mudanças de código.** Não misture
  atualizações de docs/RFCs com alterações funcionais no mesmo commit.
- **Explique o raciocínio antes de implementar.** Antes de escrever código para uma
  tarefa não trivial, descreva a abordagem e o porquê das escolhas técnicas, e
  aguarde confirmação antes de prosseguir.
- **Prefira soluções simples e diretas** a alternativas elaboradas, mesmo que estas
  pareçam mais "completas" — evite abstrações ou generalizações não solicitadas.

## Nota sobre versões de runtime

O `.tool-versions` fixa `nodejs 26.0.0` para o ambiente de desenvolvimento local,
enquanto o `Dockerfile` do `frontend-web` usa `node:20.19.0-alpine` na imagem que
efetivamente roda em produção/contêiner. Essa divergência é intencional (decisão do
desenvolvedor) — ao trabalhar no `frontend-web`, esteja ciente de que o comportamento
do Node local pode diferir do runtime real da imagem.
