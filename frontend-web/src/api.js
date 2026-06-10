import axios from 'axios';
import keycloak from './keycloak';
import Swal from 'sweetalert2'; // Importando a biblioteca visual

const api = axios.create({
  // Lê dinamicamente o valor injetado pelo Vite
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api/v1',
});

// Variável global para travar múltiplas chamadas do alerta
let isAvisandoExpiracao = false;

// Função ÚNICA que cria a "Cortina Escura" com blur e a contagem regressiva
const avisarExpiracaoERedirecionar = () => {
  // Se o alerta já estiver na tela, ignora as outras requisições que falharam
  if (isAvisandoExpiracao) return; 
  
  isAvisandoExpiracao = true; // Trava ativada!
  let timerInterval;

  Swal.fire({
    title: '⏱️ Sessão Expirada',
    html: 'Sua sessão foi encerrada por inatividade por motivos de segurança.<br><br>Redirecionando em <b></b> segundos.',
    timer: 10000,
    timerProgressBar: true,
    allowEscapeKey: true,
    allowOutsideClick: false,
    confirmButtonText: 'Fazer Login Agora',
    confirmButtonColor: '#0056b3',
    backdrop: `
      rgba(0, 0, 0, 0.6)
      backdrop-filter: blur(5px)
    `,
    didOpen: () => {
      const b = Swal.getHtmlContainer().querySelector('b');
      timerInterval = setInterval(() => {
        b.textContent = Math.ceil(Swal.getTimerLeft() / 1000);
      }, 100);
    },
    willClose: () => {
      clearInterval(timerInterval);
    }
  }).then((result) => {
    isAvisandoExpiracao = false; // Libera a trava apenas quando for sair
    keycloak.login();
  });
};

// 1. INTERCEPTOR DE REQUISIÇÃO
api.interceptors.request.use(
  async (config) => {
    if (keycloak.authenticated) {
      try {
        await keycloak.updateToken(30);
        config.headers.Authorization = `Bearer ${keycloak.token}`;
      } catch (error) {
        console.warn("Sessão expirada por inatividade. Disparando aviso...");
        avisarExpiracaoERedirecionar();
        throw new axios.Cancel("Sessão expirada"); 
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. INTERCEPTOR DE RESPOSTA
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.error("Acesso negado (401). Disparando aviso...");
      avisarExpiracaoERedirecionar();
    }
    return Promise.reject(error);
  }
);

export default api;