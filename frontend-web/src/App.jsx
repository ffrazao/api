import { useState, useEffect } from "react";
import keycloak from "./keycloak";
import api from "./api";

import Header from "./components/Header";
import PainelConvite from "./components/PainelConvite";
import PainelRegistro from "./components/PainelRegistro";
import TabelaHistorico from "./components/TabelaHistorico";
import PainelOnboarding from "./components/PainelOnboarding";

export default function App() {
  const [historico, setHistorico] = useState([]);

  // O Estado agora gerencia o contexto real do usuário logado vindo do PostgreSQL
  const [contexto, setContexto] = useState(null);
  const [carregandoContexto, setCarregandoContexto] = useState(true);
  const [precisaOnboarding, setPrecisaOnboarding] = useState(false);

  // Passo 1: Assim que autenticar no Keycloak, busca o vínculo no Banco de Dados
  useEffect(() => {
    if (keycloak.authenticated) {
      buscarContextoDoUsuario();
    }
  }, [keycloak.authenticated]);

  const buscarContextoDoUsuario = async () => {
    try {
      // Bate na nossa nova rota Java (ajuste o caminho se a sua instância axios já não tiver o /api/v1 base)
      const response = await api.get("/usuarios/me/contexto");
      const dadosContexto = response.data.payload || response.data;
      setContexto(dadosContexto);
      setPrecisaOnboarding(false); // Garante que tira da tela de onboarding se der certo
    } catch (error) {
      console.warn("Usuário sem contexto ou erro na busca.", error);
      // Se o Spring Security retornar 403 (Acesso Negado via CustomAccessDeniedHandler)
      if (error.response && error.response.status === 403) {
        console.warn("Usuário sem identidade canônica. Exibindo Onboarding...");
        setPrecisaOnboarding(true);
      } else {
        console.warn(
          "Usuário sem contexto na organização. Ele precisa aceitar um convite.",
          error,
        );
        setPrecisaOnboarding(false);
      }
    } finally {
      setCarregandoContexto(false);
    }
  };

  // Passo 2: Só carrega o histórico QUANDO o contexto já existir e possuir uma Organização
  useEffect(() => {
    if (contexto && contexto.organizacaoId) {
      carregarHistorico();
    }
  }, [contexto]);

  const carregarHistorico = async () => {
    try {
      const response = await api.get(
        `/orgs/${contexto.organizacaoId}/presencas`,
      );
      setHistorico(response.data.payload || response.data || []);
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
    }
  };

  // ---------------------------------------------------------
  // NOVO: Componente do Botão de Logout (Fixo na tela)
  // ---------------------------------------------------------
  const BotaoLogout = () => (
    <button
      onClick={() => keycloak.logout()}
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        padding: "8px 16px",
        background: "#d32f2f",
        color: "#fff",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        fontWeight: "bold",
        boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
        zIndex: 1000,
        transition: "background 0.3s",
      }}
      onMouseOver={(e) => (e.target.style.background = "#b71c1c")}
      onMouseOut={(e) => (e.target.style.background = "#d32f2f")}
    >
      🚪 Sair
    </button>
  );

  // ---------------------------------------------------------
  // RENDERIZAÇÃO CONDICIONAL (Baseada na RFC-0010)
  // ---------------------------------------------------------

  if (carregandoContexto) {
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          fontFamily: "sans-serif",
          color: "#555",
        }}
      >
        <BotaoLogout />
        <h2>🔄 Carregando seu ambiente de trabalho...</h2>
        <p>Identificando sua organização e unidade de lotação.</p>
      </div>
    );
  }

  // NOVO: Se o backend bloqueou dizendo que não tem perfil, prende o usuário aqui!
  if (precisaOnboarding) {
    return (
      <div
        style={{
          padding: "40px",
          fontFamily: "sans-serif",
          maxWidth: "800px",
          margin: "auto",
        }}
      >
        <BotaoLogout />
        <PainelOnboarding
          onSucesso={() => {
            // Quando salvar a foto e o CPF com sucesso, tenta buscar o contexto novamente!
            setCarregandoContexto(true);
            buscarContextoDoUsuario();
          }}
        />
      </div>
    );
  }

  // Se o backend não retornou contexto, o usuário está no "Limbo" (Autenticado, mas não Autorizado)
  if (!contexto || !contexto.organizacaoId) {
    return (
      <div
        style={{
          padding: "40px",
          fontFamily: "sans-serif",
          maxWidth: "800px",
          margin: "auto",
        }}
      >
        <BotaoLogout />

        {/* Mantém o título e o cabeçalho visíveis mesmo sem vínculo */}
        <h1>🟢 SEAGRI - Presença Inteligente</h1>
        <Header
          usuario={`${keycloak.tokenParsed?.name || "Usuário"} - Perfil: Sem vínculo`}
        />

        <div
          style={{
            textAlign: "center",
            marginTop: "40px",
            background: "#fff",
            padding: "30px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          }}
        >
          <h2 style={{ color: "#d32f2f", marginTop: 0 }}>Acesso Pendente</h2>
          <p>
            Você está logado de forma segura, mas ainda não possui vínculo com
            nenhuma organização ou unidade no sistema.
          </p>
          <p>
            Por favor, insira um <b>Código de Convite</b> abaixo para ingressar
            no seu ambiente de trabalho.
          </p>

          <div style={{ marginTop: "30px" }}>
            <PainelConvite onConviteAceito={buscarContextoDoUsuario} />
          </div>
        </div>
      </div>
    );
  }

  // A Mágica Acontece: O sistema é renderizado passando os IDs reais e dinâmicos do banco!
  return (
    <div
      style={{
        padding: "40px",
        fontFamily: "sans-serif",
        maxWidth: "800px",
        margin: "auto",
      }}
    >
      <BotaoLogout />
      <h1>🟢 SEAGRI - Presença Inteligente</h1>

      <Header
        usuario={`${keycloak.tokenParsed?.name || "Usuário"} - Perfil: ${contexto.papel || "Não informado"}`}
      />

      <div
        style={{
          marginBottom: "25px",
          padding: "15px",
          background: "#f8f9fa",
          borderRadius: "8px",
          borderLeft: "5px solid #0d47a1",
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        }}
      >
        <h3 style={{ margin: "0 0 10px 0", fontSize: "16px", color: "#333" }}>
          🏢 Sua Lotação Atual
        </h3>

        <div style={{ fontSize: "14px", color: "#444", marginBottom: "6px" }}>
          <b>Organização:</b> {contexto.organizacaoNome || "Nome não carregado"}
          <span
            style={{
              fontSize: "11px",
              color: "#888",
              marginLeft: "8px",
              fontFamily: "monospace",
            }}
          >
            (ID: {contexto.organizacaoId})
          </span>
        </div>

        <div style={{ fontSize: "14px", color: "#444" }}>
          <b>Unidade de Lotação:</b>{" "}
          {contexto.unidadeNome || "Nome não carregado"}
          <span
            style={{
              fontSize: "11px",
              color: "#888",
              marginLeft: "8px",
              fontFamily: "monospace",
            }}
          >
            (ID: {contexto.unidadeId})
          </span>
        </div>
      </div>

      <PainelRegistro
        organizacaoId={contexto.organizacaoId}
        unidadeId={contexto.unidadeId}
        onRegistroSucesso={carregarHistorico}
      />

      <TabelaHistorico historico={historico} />
    </div>
  );
}
