# Configuração do Ambiente de Desenvolvimento Frontend (Web SPA)

Ao clonar o repositório e inicializar o projeto pela primeira vez, além de subir os containers Docker (Keycloak e Postgres), é obrigatório registrar o Web SPA como um cliente público no Keycloak. 

Siga este passo a passo (Leva apenas 1 minuto):

1. Acesse o painel de administração do Keycloak local: `http://localhost:8080/admin/` e faça login com suas credenciais de admin.
2. No menu lateral esquerdo, certifique-se de estar no realm **`corporativo`**.
3. Clique em **Clients** e, em seguida, no botão **Create client**.
4. **Passo 1 (General Settings):**
   - **Client type:** `OpenID Connect`
   - **Client ID:** `seagri-web`
   - Clique em **Next**.
5. **Passo 2 (Capability config):**
   - **Client authentication:** Deixe **OFF** (Isto define o client como Público, essencial para SPAs e Mobile).
   - **Standard flow:** Deixe **ON**.
   - Clique em **Next**.
6. **Passo 3 (Login settings):**
   - **Valid redirect URIs:** Preencha com `http://localhost:5173/*` (Porta padrão do Vite/React).
   - **Web origins:** Preencha com `+` (Isto autoriza as requisições CORS do React para o Keycloak).
7. Clique em **Save**.

Após isso, basta acessar a pasta `frontend-web`, rodar `npm install` e `npm run dev`!
