import { useAuthStore } from '../store/useAuthStore';
import { clearQueryCache } from './queryClient';
import type { UserProfile } from '../types';

const KEYCLOAK_URL = (import.meta.env.VITE_KEYCLOAK_URL as string) || 'http://localhost:8080';
const KEYCLOAK_REALM = (import.meta.env.VITE_KEYCLOAK_REALM as string) || 'corporativo';
const KEYCLOAK_CLIENT_ID = (import.meta.env.VITE_KEYCLOAK_CLIENT_ID as string) || 'seagri-web';

const OIDC_AUTH_ENDPOINT = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth`;
const OIDC_TOKEN_ENDPOINT = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;
const OIDC_LOGOUT_ENDPOINT = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout`;

let silentRefreshTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Utility functions for PKCE (Proof Key for Code Exchange) using Web Crypto API
 */
function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values)
    .map((x) => possible[x % possible.length])
    .join('');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest('SHA-256', data);
}

function base64urlencode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hashed = await sha256(verifier);
  return base64urlencode(hashed);
}

interface JwtPayload {
  sub?: string;
  name?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  exp?: number;
}

function parseJwt(token: string): JwtPayload {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Falha ao decodificar token JWT Keycloak:', e);
    return {};
  }
}

const processedCodes = new Set<string>();

export const authService = {
  /**
   * Inicia o fluxo de login PKCE redirecionando para o Keycloak
   */
  async login(): Promise<void> {
    const state = generateRandomString(32);
    const codeVerifier = generateRandomString(64);
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    sessionStorage.setItem('pkce_state', state);
    sessionStorage.setItem('pkce_code_verifier', codeVerifier);

    const redirectUri = `${window.location.origin}/callback`;
    const authUrl = new URL(OIDC_AUTH_ENDPOINT);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', KEYCLOAK_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('scope', 'openid profile email');
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');

    window.location.href = authUrl.toString();
  },

  /**
   * Processa o retorno do Keycloak na rota /callback com troca do código por tokens
   */
  async handleCallback(code: string, state: string): Promise<void> {
    if (processedCodes.has(code)) {
      console.warn('[authService] Código de autorização já processado. Ignorando execução duplicada.');
      return;
    }
    processedCodes.add(code);

    const savedState = sessionStorage.getItem('pkce_state');
    const codeVerifier = sessionStorage.getItem('pkce_code_verifier');

    // Consome imediatamente os itens do sessionStorage para evitar reutilização
    sessionStorage.removeItem('pkce_state');
    sessionStorage.removeItem('pkce_code_verifier');

    if (!savedState || savedState !== state) {
      throw new Error('Estado de segurança inválido no callback OAuth2 (CSRF detectado).');
    }

    if (!codeVerifier) {
      throw new Error('Code verifier PKCE não encontrado na sessão.');
    }

    const redirectUri = `${window.location.origin}/callback`;

    const bodyParams = new URLSearchParams();
    bodyParams.append('grant_type', 'authorization_code');
    bodyParams.append('client_id', KEYCLOAK_CLIENT_ID);
    bodyParams.append('code', code);
    bodyParams.append('redirect_uri', redirectUri);
    bodyParams.append('code_verifier', codeVerifier);

    const response = await fetch(OIDC_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro na troca de código pelo token Keycloak: ${errorText}`);
    }

    const data = await response.json();
    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;
    const idToken = data.id_token;
    const expiresIn = data.expires_in || 300;

    // Limpa credenciais temporárias do PKCE
    sessionStorage.removeItem('pkce_state');
    sessionStorage.removeItem('pkce_code_verifier');

    // Decodifica o payload do usuário
    const payload = parseJwt(accessToken);
    const userName = payload.name || payload.preferred_username || 'Usuário Keycloak';
    const userInitials = userName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    const userProfile: UserProfile = {
      id: payload.sub || 'usr-keycloak',
      keycloakSub: payload.sub,
      name: userName,
      email: payload.email || 'usuario@tempo.gov.br',
      initials: userInitials || 'CF',
    };

    useAuthStore.getState().setAuth(accessToken, userProfile, refreshToken, idToken);

    // Agenda o Silent Refresh antes do token expirar
    this.scheduleSilentRefresh(expiresIn);
  },

  /**
   * Renova o token em segundo plano usando o refresh_token (Silent Refresh)
   */
  async refreshToken(): Promise<boolean> {
    const { refreshToken: storedRefreshToken, idToken: storedIdToken, logout } = useAuthStore.getState();

    if (!storedRefreshToken) {
      console.warn('[Silent Refresh] Nenhum refresh token disponível.');
      return false;
    }

    try {
      const bodyParams = new URLSearchParams();
      bodyParams.append('grant_type', 'refresh_token');
      bodyParams.append('client_id', KEYCLOAK_CLIENT_ID);
      bodyParams.append('refresh_token', storedRefreshToken);

      const response = await fetch(OIDC_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      });

      if (!response.ok) {
        console.warn('[Silent Refresh] Falha na renovação do token. Encerrando sessão...');
        logout();
        return false;
      }

      const data = await response.json();
      const newAccessToken = data.access_token;
      const newRefreshToken = data.refresh_token || storedRefreshToken;
      const newIdToken = data.id_token || storedIdToken;
      const expiresIn = data.expires_in || 300;

      const { user } = useAuthStore.getState();
      if (user) {
        useAuthStore.getState().setAuth(newAccessToken, user, newRefreshToken, newIdToken);
      }

      this.scheduleSilentRefresh(expiresIn);
      return true;
    } catch (error) {
      console.error('[Silent Refresh] Exceção durante a renovação silenciosa:', error);
      logout();
      return false;
    }
  },

  /**
   * Agenda a renovação silenciosa para 30 segundos antes do token expirar
   */
  scheduleSilentRefresh(expiresInSeconds: number): void {
    if (silentRefreshTimer) {
      clearTimeout(silentRefreshTimer);
    }

    // Renova 30 segundos antes da expiração, ou no mínimo em 10 segundos
    const refreshDelayMs = Math.max((expiresInSeconds - 30) * 1000, 10000);

    silentRefreshTimer = setTimeout(() => {
      console.log('[Silent Refresh] Executando renovação automática de token...');
      this.refreshToken();
    }, refreshDelayMs);
  },

  /**
   * Encerra a sessão local e redireciona diretamente para a página inicial (sem tela de confirmação)
   */
  logout(): void {
    // 1. Captura o idToken antes de limpar o estado e armazenamento
    const { idToken } = useAuthStore.getState();
    const activeIdToken = idToken || (typeof window !== 'undefined' ? localStorage.getItem('tp_id_token') : null);

    // 2. Cancela temporizadores de renovação em segundo plano
    if (silentRefreshTimer) {
      clearTimeout(silentRefreshTimer);
      silentRefreshTimer = null;
    }

    // 3. Purge do cache em memória do TanStack Query
    try {
      clearQueryCache();
    } catch (e) {
      console.warn('[Logout] Erro ao limpar cache do TanStack Query:', e);
    }

    // 4. Limpeza do Store Global Zustand
    useAuthStore.getState().logout();

    // 5. Limpeza de dados de armazenamento (localStorage e sessionStorage)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tp_auth_token');
      localStorage.removeItem('tp_id_token');
      sessionStorage.clear();
    }

    // 6. Redirecionamento direto para o logout do Keycloak com id_token_hint para ignorar a confirmação
    const postLogoutRedirect = `${window.location.origin}/`;
    const logoutUrl = new URL(OIDC_LOGOUT_ENDPOINT);
    if (activeIdToken) {
      logoutUrl.searchParams.append('id_token_hint', activeIdToken);
    }
    logoutUrl.searchParams.append('client_id', KEYCLOAK_CLIENT_ID);
    logoutUrl.searchParams.append('post_logout_redirect_uri', postLogoutRedirect);

    window.location.href = logoutUrl.toString();
  },
};
